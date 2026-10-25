// /contracts/[ocid]: one procurement's history from contract_notices (owner's approval, 21 Oct 2026).
//
// Rules:
//   - every figure keeps its own label (estimated, contract value, change, final value, framework maximum);
//   - the page shows the latest published value, never the award plus its changes;
//   - framework and contract values are never added together, and a framework value always reads
//     "potential value, not spending";
//   - notices repeated on the same day with the same figures are shown once;
//   - a change notice that gives no old value says "previous value not stated";
//   - performance notices read "none published" until one exists.
//
// One OCID is one procurement, which can hold many contracts (a framework's call-offs). Older-rules change
// notices give each change a new contract id, so a change joins the contract whose latest value equals the
// change's old value, for the same supplier; one that matches nothing is shown as its own contract.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

export const revalidate = 86400;

// Built on first visit and cached (no pages at build time), like the news and council pages.
export function generateStaticParams() {
  return [];
}

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.25)';
const CREAM = '#ebe5d8';
const ACCENT = '#7a1612';

type Notice = {
  ocid: string; release_id: string; notice_type: string | null; tags: string[]; published_at: string;
  contract_key: string; award_id: string | null; title: string | null; buyer_name: string | null;
  suppliers: { name: string }[]; is_framework: boolean; value: number | null; value_type: string;
  value_from_text: boolean; change_description: string | null; change_reason: string | null;
  termination_reason: string | null; end_date: string | null; status: string | null; source_url: string;
};

const OCID_RE = /^ocds-[a-z0-9]+-[A-Za-z0-9-]+$/;

const loadNotices = unstable_cache(
  async (ocid: string): Promise<Notice[]> => {
    const { data, error } = await supabase
      .from('contract_notices')
      .select('ocid, release_id, notice_type, tags, published_at, contract_key, award_id, title, buyer_name, suppliers, is_framework, value, value_type, value_from_text, change_description, change_reason, termination_reason, end_date, status, source_url')
      .eq('ocid', ocid)
      .order('published_at')
      .limit(5000);
    if (error) throw new Error(`/contracts/[ocid] contract_notices: ${error.message}`);
    return (data || []) as Notice[];
  },
  ['contract-notices-v1'],
  { revalidate: 86400, tags: ['contract-notices'] },
);

// Procurement Act 2023 notice forms; older-rules notices carry no form code, so their OCDS tags name them.
const NOTICE_NAMES: Record<string, string> = {
  UK1: 'Pipeline notice', UK2: 'Preliminary market engagement notice', UK3: 'Planned procurement notice',
  UK4: 'Tender notice', UK5: 'Transparency notice', UK6: 'Contract award notice', UK7: 'Contract details notice',
  UK8: 'Payments compliance notice', UK9: 'Contract performance notice', UK10: 'Contract change notice',
  UK11: 'Contract termination notice', UK12: 'Procurement termination notice',
};
function noticeName(n: Notice): string {
  if (n.notice_type && NOTICE_NAMES[n.notice_type]) return NOTICE_NAMES[n.notice_type];
  const t = n.tags || [];
  if (t.includes('contractTermination')) return 'Termination notice';
  if (t.includes('contractAmendment') || n.value_type === 'change_new') return 'Change notice';
  if (t.includes('award')) return 'Award notice';
  if (t.includes('contract')) return 'Contract notice';
  if (t.includes('tenderUpdate')) return 'Tender update';
  if (t.includes('tender')) return 'Tender notice';
  if (t.some((x) => x.startsWith('planning'))) return 'Planning notice';
  return 'Notice';
}

const gbp = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`;
const signed = (v: number) => `${v >= 0 ? '+' : '−'}£${Math.round(Math.abs(v)).toLocaleString('en-GB')}`;
const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }) : '');
const day = (iso: string) => iso.slice(0, 10);
// Change reasons can run to pages; the full text is on the notice.
const short = (s: string) => (s.length > 400 ? `${s.slice(0, 400).replace(/\s+\S*$/, '')}… (full reason on the notice)` : s);

type Change = { date: string; oldValue: number | null; newValue: number | null; reason: string | null; repeats: number; url: string };
type ContractHistory = {
  key: string; awardId: string | null; title: string | null; suppliers: string[]; isFramework: boolean;
  awarded: { date: string; value: number | null; type: 'contract' | 'framework_maximum'; url: string } | null;
  changes: Change[];
  termination: { date: string; endDate: string | null; finalValue: number | null; reason: string | null; url: string } | null;
};

function buildHistories(notices: Notice[]): ContractHistory[] {
  const byKey = new Map<string, Notice[]>();
  for (const n of notices) if (n.contract_key) byKey.set(n.contract_key, [...(byKey.get(n.contract_key) || []), n]);
  const histories: ContractHistory[] = [];
  const latest = (h: ContractHistory) => (h.changes.length ? h.changes[h.changes.length - 1].newValue : h.awarded?.value ?? null);
  const supplierOf = (rows: Notice[]) => rows.find((r) => r.suppliers?.length)?.suppliers.map((s) => s.name) || [];

  // Awards and contracts first (oldest first), then changes and terminations in date order.
  const keys = [...byKey.keys()].sort((a, b) => byKey.get(a)![0].published_at.localeCompare(byKey.get(b)![0].published_at));
  for (const key of keys) {
    const rows = byKey.get(key)!;
    if (rows.some((r) => r.value_type === 'change_new')) continue;
    const award = rows.filter((r) => r.value_type === 'contract' || r.value_type === 'framework_maximum').pop();
    // An award notice and its contract details notice (UK6 then UK7) describe one contract: the contract carries
    // the award's id. Keep one entry, with the later notice's suppliers (a framework's list can shrink at signing).
    const existing = award?.award_id != null ? histories.find((h) => h.awardId === award.award_id) : undefined;
    if (existing && award) {
      existing.awarded = { date: existing.awarded?.date ?? award.published_at, value: award.value, type: award.value_type as 'contract' | 'framework_maximum', url: award.source_url };
      existing.suppliers = supplierOf(rows).length ? supplierOf(rows) : existing.suppliers;
      continue;
    }
    histories.push({
      key, awardId: award?.award_id ?? null, title: rows[0].title, suppliers: supplierOf(rows), isFramework: rows.some((r) => r.value_type === 'framework_maximum'),
      awarded: award ? { date: award.published_at, value: award.value, type: award.value_type as 'contract' | 'framework_maximum', url: award.source_url } : null,
      changes: [], termination: null,
    });
  }
  const changeRows = notices.filter((n) => n.value_type === 'change_new' || n.value_type === 'final' || (n.tags || []).includes('contractTermination'));
  for (const n of changeRows) {
    const rows = byKey.get(n.contract_key) || [];
    const old = rows.find((r) => r.release_id === n.release_id && r.value_type === 'change_old')?.value ?? null;
    // The same change published more than once on one day (DSIT published three identical notices on
    // 23 Feb 2026) is shown once.
    const repeat = histories.flatMap((x) => x.changes).find((c) => day(c.date) === day(n.published_at) && c.newValue === n.value && c.oldValue === old);
    if (repeat && n.value_type === 'change_new') { repeat.repeats++; continue; }
    // Which contract a change belongs to: the same contract id (Procurement Act notices), else the contract
    // whose latest value is the change's old value, else one whose award or an earlier value is (older notices
    // say "from the original value"). Several candidates: prefer the same supplier name (Find a Tender adds
    // call-off codes such as "CO3" to it).
    const firstWord = (s: string[]) => (s[0] || '').toLowerCase().replace(/\s+co\d+$/, '');
    const pick = (cands: ContractHistory[]) => cands.find((x) => firstWord(x.suppliers) === firstWord(n.suppliers.map((s) => s.name))) || cands[0];
    const values = (x: ContractHistory) => [x.awarded?.value ?? null, ...x.changes.map((c) => c.newValue)];
    let h = histories.find((x) => x.key === n.contract_key)
      || (old != null ? pick(histories.filter((x) => latest(x) === old)) || pick(histories.filter((x) => values(x).includes(old))) : undefined);
    if (!h) {
      h = { key: n.contract_key, awardId: null, title: n.title, suppliers: n.suppliers.map((s) => s.name), isFramework: false, awarded: null, changes: [], termination: null };
      histories.push(h);
    }
    if (n.value_type === 'final' || (n.tags || []).includes('contractTermination')) {
      h.termination = { date: n.published_at, endDate: n.end_date, finalValue: n.value_type === 'final' ? n.value : null, reason: n.termination_reason, url: n.source_url };
      continue;
    }
    h.changes.push({ date: n.published_at, oldValue: old, newValue: n.value, reason: n.change_reason, repeats: 1, url: n.source_url });
  }
  return histories;
}

export async function generateMetadata({ params }: { params: Promise<{ ocid: string }> }): Promise<Metadata> {
  const { ocid } = await params;
  if (!OCID_RE.test(ocid)) return {};
  const notices = await loadNotices(ocid);
  const title = [...notices].reverse().find((n) => n.title)?.title;
  return title ? { title: `${title}: contract history`, alternates: { canonical: `/contracts/${ocid}` } } : {};
}

export default async function ContractHistoryPage({ params }: { params: Promise<{ ocid: string }> }) {
  const { ocid } = await params;
  if (!OCID_RE.test(ocid)) notFound();
  const notices = await loadNotices(ocid);
  if (!notices.length) notFound();

  const histories = buildHistories(notices);
  const buyer = notices.find((n) => n.buyer_name)?.buyer_name;
  // The procurement's latest name (planning notices often carry a working title).
  const title = [...notices].reverse().find((n) => n.title)?.title || 'Untitled procurement';
  const estimate = notices.filter((n) => n.value_type === 'estimated' || (n.value_type === 'framework_maximum' && !n.contract_key)).pop();
  const performance = notices.filter((n) => n.notice_type === 'UK9');
  // The notice list shows each notice once, with its own figure and label.
  const byRelease = new Map<string, Notice>();
  for (const n of notices) if (!byRelease.has(n.release_id) || n.value_type !== 'change_old') byRelease.set(n.release_id, n);
  const timeline = [...byRelease.values()].sort((a, b) => b.published_at.localeCompare(a.published_at));

  return (
    <OpenGovShell pageStamp="Contracts">
      <BackLink fallbackHref="/transparency/contracts" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)' }} />
      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '16px', marginBottom: '20px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '10px' }}>Contract history</p>
        <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 'bold', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{title}</h1>
        <p style={{ fontSize: '16px', marginTop: '8px' }}>{buyer}</p>
        {estimate?.value != null && (
          <p style={{ fontSize: '15px', marginTop: '6px' }}>
            {estimate.value_type === 'framework_maximum'
              ? <>Framework maximum {gbp(estimate.value)}: <strong>potential value, not spending</strong> ({fmtDay(estimate.published_at)})</>
              : <>Tendered at {gbp(estimate.value)} (estimated value, {fmtDay(estimate.published_at)})</>}
          </p>
        )}
      </header>

      {histories.map((h) => {
        const latestValue = h.changes.length ? h.changes[h.changes.length - 1].newValue : null;
        return (
          <section key={h.key} style={{ marginBottom: '28px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '18px' }}>
            <h2 style={sectionH2}>{h.title || title}{h.suppliers.length ? ` · ${h.suppliers.length > 3 ? `${h.suppliers.length} suppliers` : h.suppliers.join(', ')}` : ''}</h2>
            {h.awarded && (
              h.awarded.type === 'framework_maximum'
                ? <p style={figure}><strong>Framework, {h.suppliers.length} supplier{h.suppliers.length === 1 ? '' : 's'}.</strong>{h.awarded.value != null && <> <strong>{gbp(h.awarded.value)} potential value, not spending.</strong> This is the most that could be spent through the framework; spending appears only through call off contracts.</>}</p>
                : <p style={figure}><strong>Award published {fmtDay(h.awarded.date)}: {h.awarded.value != null ? gbp(h.awarded.value) : 'value not published'}</strong> (contract value)</p>
            )}
            {!h.awarded && <p style={figure}>The award is not in this record; the first notice we hold is a change.</p>}

            {h.changes.length > 0 && (
              <>
                <h3 style={h3}>Changes</h3>
                <ul style={list}>
                  {h.changes.map((c) => (
                    <li key={c.url} style={{ marginBottom: '8px' }}>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(c.date)}</a>
                      {' · '}
                      {c.oldValue != null && c.newValue != null
                        ? <>{gbp(c.oldValue)} → {gbp(c.newValue)} ({signed(c.newValue - c.oldValue)})</>
                        : c.newValue != null ? <>previous value not stated → {gbp(c.newValue)}</> : 'value not stated'}
                      {c.reason && <>. Reason: {short(c.reason)}</>}
                      {c.repeats > 1 && <span style={{ opacity: 0.75 }}> (published {c.repeats} times that day)</span>}
                    </li>
                  ))}
                </ul>
                {latestValue != null && <p style={figure}><strong>Latest published value: {gbp(latestValue)}</strong></p>}
              </>
            )}

            {h.termination && (
              <p style={{ ...figure, background: CREAM, padding: '10px 12px' }}>
                <strong>Termination:</strong> <a href={h.termination.url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(h.termination.date)}</a>.
                {h.termination.endDate && <> Ended {fmtDay(h.termination.endDate)}.</>}
                {h.termination.finalValue != null && <> Final value {gbp(h.termination.finalValue)}.</>}
                {h.termination.reason && <> Reason: &ldquo;{short(h.termination.reason)}&rdquo;</>}
              </p>
            )}
            {!h.changes.length && !h.termination && <p style={{ fontSize: '15px', opacity: 0.8 }}>No changes or termination have been published.</p>}
          </section>
        );
      })}

      <section style={{ marginBottom: '24px' }}>
        <h2 style={sectionH2}>Performance</h2>
        {performance.length
          ? <ul style={list}>{performance.map((p) => <li key={p.release_id}><a href={p.source_url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(p.published_at)} · Contract performance notice</a></li>)}</ul>
          : <p style={{ fontSize: '15px' }}>No performance notices have been published.</p>}
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={sectionH2}>Every notice</h2>
        <ul style={list}>
          {timeline.map((n) => (
            <li key={n.release_id} style={{ marginBottom: '6px' }}>
              <a href={n.source_url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(n.published_at)} · {noticeName(n)}</a>
              {n.value != null && n.value_type !== 'none' && <> · {n.value_type === 'estimated' ? `estimated ${gbp(n.value)}` : n.value_type === 'framework_maximum' ? `${gbp(n.value)} framework maximum` : n.value_type === 'final' ? `final value ${gbp(n.value)}` : n.value_type === 'change_new' ? `changed to ${gbp(n.value)}` : gbp(n.value)}</>}
            </li>
          ))}
        </ul>
      </section>

      <p style={{ fontSize: '15px' }}>Source: Find a Tender, each line linked to its notice. Values are as each notice published them and are never added together.</p>
    </OpenGovShell>
  );
}

const sectionH2: React.CSSProperties = { fontFamily: 'var(--font-special-elite), monospace', fontSize: '21px', fontWeight: 'bold', marginBottom: '10px', overflowWrap: 'anywhere' };
const h3: React.CSSProperties = { fontFamily: 'var(--font-special-elite), monospace', fontSize: '17px', fontWeight: 'bold', margin: '12px 0 6px' };
const figure: React.CSSProperties = { fontSize: '16px', lineHeight: 1.6, margin: '6px 0' };
const list: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, paddingLeft: '18px' };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline' };
