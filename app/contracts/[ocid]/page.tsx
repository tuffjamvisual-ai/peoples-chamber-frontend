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

import { buildHistories, sameLot, type Notice } from '@/lib/contract-history';
import { lotLabel, hasSeveralLots, namesLot, type LotTitle } from '@/lib/contract-lot-label';
import type { ChangeKind } from '@/lib/contract-notice-kind';
import NoJsPager, { NoJsPagerLinks, njpItem } from '@/app/components/NoJsPager';
import { namedTitle } from '@/lib/seo-title';
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

const OCID_RE = /^ocds-[a-z0-9]+-[A-Za-z0-9-]+$/;

const NOTICE_COLUMNS = 'ocid, release_id, notice_type, tags, published_at, contract_key, award_id, title, buyer_name, suppliers, is_framework, value, value_type, value_from_text, change_description, change_reason, termination_reason, end_date, status, source_url';
const loadNotices = unstable_cache(
  async (ocid: string): Promise<Notice[]> => {
    const read = (cols: string) => supabase.from('contract_notices').select(cols).eq('ocid', ocid).order('published_at').order('contract_key').limit(5000);
    let { data, error } = await read(`${NOTICE_COLUMNS}, lot_ids`);
    // Without lot_ids (migration 2026-11-12a undone) the page shows no lot labels rather than failing.
    if (error && /lot_ids/.test(error.message)) ({ data, error } = await read(NOTICE_COLUMNS));
    if (error) throw new Error(`/contracts/[ocid] contract_notices: ${error.message}`);
    return (data || []) as unknown as Notice[];
  },
  ['contract-notices-v2'],
  { revalidate: 86400, tags: ['contract-notices'] },
);

// The procurement's lots as published (T1-LOT); none when the table is missing or the read fails.
const loadLots = unstable_cache(
  async (ocid: string): Promise<LotTitle[]> => {
    const { data, error } = await supabase.from('contract_lots').select('lot_id, title').eq('ocid', ocid).order('lot_id');
    if (error) { console.error(`/contracts/[ocid] contract_lots: ${error.message}`); return []; }
    return (data || []) as LotTitle[];
  },
  ['contract-lots-v1'],
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
// Change reasons can run to pages; the full text is on the notice.
const short = (s: string) => (s.length > 400 ? `${s.slice(0, 400).replace(/\s+\S*$/, '')}… (full reason on the notice)` : s);

export async function generateMetadata({ params }: { params: Promise<{ ocid: string }> }): Promise<Metadata> {
  const { ocid } = await params;
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!OCID_RE.test(ocid)) notFound();
  const notices = await loadNotices(ocid);
  if (!notices.length) notFound();
  const title = [...notices].reverse().find((n) => n.title && !n.contract_key)?.title || [...notices].reverse().find((n) => n.title)?.title;
  return title ? { title: namedTitle(title, (n) => [`${n}: contract history`, n]), alternates: { canonical: `/contracts/${ocid}` } } : {};
}

export default async function ContractHistoryPage({ params }: { params: Promise<{ ocid: string }> }) {
  const { ocid } = await params;
  if (!OCID_RE.test(ocid)) notFound();
  const [notices, lots] = await Promise.all([loadNotices(ocid), loadLots(ocid)]);
  if (!notices.length) notFound();
  // Lot labels only where the procurement has more than one lot (T1-LOT); a notice's lots are those of all its rows.
  const severalLots = hasSeveralLots(lots, notices.map((n) => n.lot_ids));
  const label = (ids: string[] | null | undefined) => (severalLots ? lotLabel(ids, lots) : null);
  const releaseLots = new Map<string, string[]>();
  for (const n of notices) for (const id of n.lot_ids ?? []) { const l = releaseLots.get(n.release_id) ?? []; if (!l.includes(id)) releaseLots.set(n.release_id, [...l, id]); }
  const isAward = (n: Notice) => n.value_type === 'contract' || n.value_type === 'framework_maximum';
  // A notice that publishes several awards or contracts (one per lot or supplier): the list gives their number, not one
  // of their values, which read as the whole notice's (T1-LOT, 12 Nov 2026).
  const releaseParts = new Map<string, Set<string>>();
  for (const n of notices) if (n.contract_key && n.value_type !== 'change_old' && (n.value != null || n.suppliers?.length)) releaseParts.set(n.release_id, (releaseParts.get(n.release_id) ?? new Set()).add(n.contract_key));
  const partsOf = (n: Notice) => releaseParts.get(n.release_id)?.size ?? 0;

  const kinds = new Map<string, ChangeKind>();
  const hasAnyAward = notices.some(isAward);
  const histories = buildHistories(notices, kinds);
  // Lots that have an award entry with no supplier and no value, and no award with either (Cowork, 12 Nov 2026): listed
  // in lot order with the histories, never left out.
  const awardedLots = new Set(notices.filter((n) => isAward(n) && (n.value != null || n.suppliers?.length)).flatMap((n) => n.lot_ids ?? []));
  const unawardedLots = severalLots
    ? [...new Set(notices.filter((n) => n.award_id != null && n.value == null && !n.suppliers?.length).flatMap((n) => n.lot_ids ?? []))].filter((id) => !awardedLots.has(id))
    : [];
  // Awarded lots first, in lot order; then one line for the lots with no supplier or value (Cowork, 12 Nov 09:45).
  const lotOrder = (ids: string[] | null | undefined) => (ids?.length ? ids[0].replace(/^lot\s*/i, '') : '\uffff');
  const ordered = severalLots ? [...histories].sort((a, b) => lotOrder(a.lotIds).localeCompare(lotOrder(b.lotIds), 'en', { numeric: true })) : histories;
  const noAwardNames = unawardedLots.map((id) => id.replace(/^lot\s*/i, '')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const noAwardLine = noAwardNames.length
    ? `No supplier or value published for ${noAwardNames.length === 1 ? `lot ${noAwardNames[0]}` : `lots ${noAwardNames.slice(0, -1).join(', ')} and ${noAwardNames[noAwardNames.length - 1]}`}.`
    : null;
  const buyer = notices.find((n) => n.buyer_name)?.buyer_name;
  // The procurement's latest name (planning notices often carry a working title).
  // The procurement-level title (planning and tender notices) first: an award's title can be one lot's ("Lot 8 - ...").
  const title = [...notices].reverse().find((n) => n.title && !n.contract_key)?.title || [...notices].reverse().find((n) => n.title)?.title || 'Untitled procurement';
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

      <NoJsPager id="contract-histories" count={ordered.length} size={10} />
      {ordered.map((h) => {
        const realChanges = h.changes.filter((c) => c.kind.kind === 'value_change');
        const latestValue = realChanges.length ? realChanges[realChanges.length - 1].newValue : null;
        return (
          <section key={h.key} className={njpItem('contract-histories')} style={{ marginBottom: '28px', borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '18px' }}>
            <h2 style={sectionH2}>{h.title || title}{h.suppliers.length ? ` · ${h.suppliers.length > 3 ? `${h.suppliers.length} suppliers` : h.suppliers.join(', ')}` : ''}</h2>
            {label(h.lotIds) && !namesLot(h.title || title, h.lotIds) && <p style={lotLine}>{label(h.lotIds)}</p>}
            {h.awarded && (
              h.awarded.type === 'framework_maximum'
                ? <p style={figure}><strong>Framework, {h.suppliers.length} supplier{h.suppliers.length === 1 ? '' : 's'}.</strong>{h.awarded.value != null && <> <strong>{gbp(h.awarded.value)} potential value, not spending.</strong> This is the most that could be spent through the framework; spending appears only through call off contracts.</>}</p>
                : <p style={figure}><strong>Award published {fmtDay(h.awarded.date)}: {h.awarded.value != null ? gbp(h.awarded.value) : 'value not published'}</strong> (contract value)</p>
            )}
            {/* Only when the procurement holds no award notice at all (T1-AUD3, owner 11 Nov 2026); where it does but the change
                names no award we can match, say that instead. */}
            {/* Per lot where the change names one (T1-LOT): an award for that lot in the record, or none. */}
            {!h.awarded && (label(h.lotIds)
              ? notices.some((n) => isAward(n) && sameLot(n.lot_ids, h.lotIds))
                ? <p style={figure}>This notice does not say which award for {label(h.lotIds)} it changes.</p>
                : <p style={figure}>The award for {label(h.lotIds)} is not in this record; the first notice we hold for it is a change.</p>
              : hasAnyAward
              ? <p style={figure}>This notice does not say which award it changes.</p>
              : <p style={figure}>The award is not in this record; the first notice we hold is a change.</p>)}

            {h.changes.length > 0 && (
              <>
                <h3 style={h3}>Changes</h3>
                <NoJsPager id={`ch-${h.key}`.replace(/[^a-zA-Z0-9-]+/g, "-")} count={(h.changes).length} rows="> li" size={25}>
                <ul style={list}>
                  {h.changes.map((c) => (
                    <li key={c.url} style={{ marginBottom: '8px' }}>
                      <a data-og-row-source="" href={c.url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(c.date)}</a>
                      {' · '}
                      {c.kind.kind !== 'value_change'
                        ? <>{c.kind.label}{c.newValue != null ? `; value as stated ${gbp(c.newValue)}, not a change` : ''}</>
                        : c.oldValue != null && c.newValue != null
                        ? <>{gbp(c.oldValue)} → {gbp(c.newValue)} ({signed(c.newValue - c.oldValue)})</>
                        : c.newValue != null ? <>previous value not stated → {gbp(c.newValue)}</> : 'value not stated'}
                      {c.reason && <>. Reason: {short(c.reason)}</>}
                      {c.repeats > 1 && <span > (published {c.repeats} times that day)</span>}
                    </li>
                  ))}
                </ul>
                </NoJsPager>
                {latestValue != null && <p style={figure}><strong>Latest published value: {gbp(latestValue)}</strong></p>}
              </>
            )}

            {h.termination && (
              <p style={{ ...figure, background: CREAM, padding: '10px 12px' }}>
                <strong>Termination:</strong> <a data-og-row-source="" href={h.termination.url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(h.termination.date)}</a>.
                {h.termination.endDate && <> Ended {fmtDay(h.termination.endDate)}.</>}
                {h.termination.finalValue != null && <> Final value {gbp(h.termination.finalValue)}.</>}
                {h.termination.reason && <> Reason: &ldquo;{short(h.termination.reason)}&rdquo;</>}
              </p>
            )}
            {!h.changes.length && !h.termination && <p style={{ fontSize: '15px' }}>No changes or termination have been published.</p>}
          </section>
        );
      })}
      {noAwardLine && <p style={{ ...figure, marginBottom: '24px' }}>{noAwardLine}</p>}
      <NoJsPagerLinks id="contract-histories" count={ordered.length} size={10} />

      <section style={{ marginBottom: '24px' }}>
        <h2 style={sectionH2}>Performance</h2>
        {performance.length
          ? <ul style={list}>{performance.map((p) => <li key={p.release_id}><a data-og-row-source="" href={p.source_url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(p.published_at)} · Contract performance notice</a></li>)}</ul>
          : <p style={{ fontSize: '15px' }}>No performance notices have been published.</p>}
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={sectionH2}>Every notice</h2>
        <NoJsPager id="contract-notices" count={(timeline).length} rows="> li" size={25}>
        <ul style={list}>
          {timeline.map((n) => (
            <li key={n.release_id} style={{ marginBottom: '6px' }}>
              <a data-og-row-source="" href={n.source_url} target="_blank" rel="noopener noreferrer" style={link}>{fmtDay(n.published_at)} · {kinds.get(n.release_id) && kinds.get(n.release_id)!.kind !== 'value_change' ? kinds.get(n.release_id)!.label : noticeName(n)}</a>
              {partsOf(n) > 1 && <> · {partsOf(n)} {n.value_type === 'change_new' ? 'contracts changed' : n.contract_key.startsWith('award:') ? 'awards' : 'contracts'}</>}
              {partsOf(n) <= 1 && n.value != null && n.value_type !== 'none' && <> · {n.value_type === 'estimated' ? `estimated ${gbp(n.value)}` : n.value_type === 'framework_maximum' ? `${gbp(n.value)} framework maximum` : n.value_type === 'final' ? `final value ${gbp(n.value)}` : n.value_type === 'change_new' ? (kinds.get(n.release_id)?.kind === 'value_change' || !kinds.has(n.release_id) ? `changed to ${gbp(n.value)}` : `value as stated ${gbp(n.value)}`) : gbp(n.value)}</>}
              {/* Several awards where some of the notice's lots have none published: say how many of each, not 'All 8 lots'. */}
              {partsOf(n) > 1 && (releaseLots.get(n.release_id) ?? []).some((id) => unawardedLots.includes(id))
                ? <> across {releaseLots.get(n.release_id)!.length} lots</>
                : label(releaseLots.get(n.release_id)) && <> · {label(releaseLots.get(n.release_id))}</>}
            </li>
          ))}
        </ul>
        </NoJsPager>
      </section>

      <p style={{ fontSize: '15px' }}>Source: Find a Tender, each line linked to its notice. Values are as each notice published them and are never added together.</p>
    </OpenGovShell>
  );
}

const sectionH2: React.CSSProperties = { fontFamily: 'var(--font-special-elite), monospace', fontSize: '21px', fontWeight: 'bold', marginBottom: '10px', overflowWrap: 'anywhere' };
const h3: React.CSSProperties = { fontFamily: 'var(--font-special-elite), monospace', fontSize: '17px', fontWeight: 'bold', margin: '12px 0 6px' };
const lotLine: React.CSSProperties = { fontSize: '15px', fontWeight: 'bold', margin: '0 0 6px' };
const figure: React.CSSProperties = { fontSize: '16px', lineHeight: 1.6, margin: '6px 0' };
const list: React.CSSProperties = { fontSize: '15px', lineHeight: 1.6, paddingLeft: '18px' };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline' };
