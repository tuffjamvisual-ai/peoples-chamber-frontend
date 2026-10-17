import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';

export const metadata: Metadata = {
  title: "MP Expenses Refused or Repaid, IPSA Rejections, Late Submissions & Repayments",
  description:
    "Expense claims IPSA refused and amounts repaid by serving MPs, by year, by MP and by IPSA's reason.",
  alternates: { canonical: '/expenses/refused' },
};

export const revalidate = 3600;

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#6b2417';
const DANGER = '#a64030';
const WARN = '#7a4a16';

function fmtMoney(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '£0';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

type DetailRow = {
  year: string | null;
  member_id: number | null;
  mp_name: string | null;
  amount_not_paid: number | string | null;
  amount_repaid: number | string | null;
  reason_if_not_paid: string | null;
};

type MpLookup = { member_id: number; display_name: string | null; name: string | null; party: string | null };

type Agg = { member_id: number; mp_name: string; total: number; count: number };

// Paginate through every row where there was a refusal OR a repayment (about 2,200 rows).
// Ordered by id so each page is a stable slice: without an order, pages could overlap or
// skip rows, which showed as 35 extra repaid claims (15 Oct 2026).
async function fetchRefusedRepaid(): Promise<DetailRow[]> {
  const out: DetailRow[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 50000; from += PAGE) {
    const { data, error } = await supabase
      .from('mp_expenses_detail')
      .select('year, member_id, mp_name, amount_not_paid, amount_repaid, reason_if_not_paid')
      .or('amount_not_paid.gt.0,amount_repaid.gt.0')
      .order('id')
      .range(from, from + PAGE - 1);
    // A failed page must not publish partial totals: throw, so the last good version of the
    // page stays up (a timeout here once showed one year instead of seventeen).
    if (error) throw new Error(`mp_expenses_detail: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as DetailRow[]));
    if (data.length < PAGE) break;
  }
  return out;
}

function aggregateBy(field: 'amount_not_paid' | 'amount_repaid', rows: DetailRow[]): Agg[] {
  const m = new Map<number, Agg>();
  for (const r of rows) {
    const v = Number(r[field] ?? 0);
    if (!(v > 0)) continue;
    const key = r.member_id ?? -1;
    const existing = m.get(key) ?? { member_id: key, mp_name: r.mp_name ?? 'Unknown', total: 0, count: 0 };
    existing.total += v;
    existing.count += 1;
    if (r.mp_name) existing.mp_name = r.mp_name;
    m.set(key, existing);
  }
  return Array.from(m.values()).sort((a, b) => b.total - a.total);
}

// IPSA's reason codes, written out in full where IPSA abbreviates them.
const REASON_LABEL: Record<string, string> = {
  'wrong expense categ.': 'Wrong expense category',
  'recpt not match claim': 'Receipt does not match claim',
  'evidence late': 'Evidence sent late',
  'over 90 days': 'Claimed more than 90 days after the cost',
  'not under scheme': 'Not covered by the scheme',
  'pre-dates ipsa scheme': 'Before the IPSA scheme began',
  'duplicate claim': 'Duplicate claim',
};
const reasonLabel = (r: string) => REASON_LABEL[r.trim().toLowerCase()] ?? r;

// IPSA years are named like "24_25" (April 2024 to March 2025).
const yearLabel = (y: string) => { const m = y.match(/^(\d{2})_(\d{2})$/); return m ? `20${m[1]}/${m[2]}` : y; };

function aggregateYears(rows: DetailRow[]) {
  const m = new Map<string, { year: string; refused: number; refusedCount: number; repaid: number; repaidCount: number }>();
  for (const r of rows) {
    const y = r.year || 'unknown';
    const e = m.get(y) ?? { year: y, refused: 0, refusedCount: 0, repaid: 0, repaidCount: 0 };
    const not = Number(r.amount_not_paid ?? 0);
    const rep = Number(r.amount_repaid ?? 0);
    if (not > 0) { e.refused += not; e.refusedCount += 1; }
    if (rep > 0) { e.repaid += rep; e.repaidCount += 1; }
    m.set(y, e);
  }
  return Array.from(m.values()).sort((a, b) => b.year.localeCompare(a.year));
}

function aggregateReasons(rows: DetailRow[]): Array<{ reason: string; count: number; total: number }> {
  const m = new Map<string, { reason: string; count: number; total: number }>();
  for (const r of rows) {
    const not = Number(r.amount_not_paid ?? 0);
    if (!(not > 0)) continue;
    const reason = (r.reason_if_not_paid || '(no reason recorded)').trim();
    const key = reason.toLowerCase();
    const existing = m.get(key) ?? { reason, count: 0, total: 0 };
    existing.count += 1;
    existing.total += not;
    m.set(key, existing);
  }
  return Array.from(m.values()).sort((a, b) => b.total - a.total);
}

// Current MPs only (site owner's decision, 15 Oct 2026): claims by MPs who have left the
// Commons are not shown.
async function fetchCurrentMps(): Promise<Map<number, MpLookup>> {
  const out = new Map<number, MpLookup>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('mps')
      .select('member_id, display_name, name, party')
      .eq('current_member', true)
      .order('member_id')
      .range(from, from + 999);
    if (error || !data) break;
    for (const m of data as MpLookup[]) out.set(m.member_id, m);
    if (data.length < 1000) break;
  }
  return out;
}

export default async function RefusedExpensesPage() {
  const [allRows, mpById] = await Promise.all([fetchRefusedRepaid(), fetchCurrentMps()]);
  const rows = allRows.filter((r) => r.member_id != null && mpById.has(r.member_id));
  // Every serving MP with a refused or repaid claim; the first 25 show, the rest open below.
  const refusedAgg = aggregateBy('amount_not_paid', rows);
  const repaidAgg = aggregateBy('amount_repaid', rows);
  const reasons = aggregateReasons(rows);
  const years = aggregateYears(rows);
  // The newest year with IPSA's year-end totals published is complete; anything after it is
  // still being filled in as IPSA publishes claims every two months.
  const { data: lastFull } = await supabase.from('mp_expenses_summary').select('year').order('year', { ascending: false }).limit(1);
  const latestComplete = (lastFull?.[0]?.year as string | undefined) ?? null;
  const isPartial = (y: string) => !!latestComplete && y > latestComplete;
  const firstYear = years.length ? years[years.length - 1].year : null;
  const lastYear = years.length ? years[0].year : null;
  const distinctMps = new Set(rows.map((r) => r.member_id).filter((id): id is number => id != null && id > 0)).size;

  const totalRefusedAll = rows.reduce((s, r) => s + (Number(r.amount_not_paid) || 0), 0);
  const totalRepaidAll = rows.reduce((s, r) => s + (Number(r.amount_repaid) || 0), 0);
  const refusedClaimCount = rows.filter((r) => Number(r.amount_not_paid) > 0).length;
  const repaidClaimCount = rows.filter((r) => Number(r.amount_repaid) > 0).length;


  return (
    <OpenGovShell pageStamp="Expenses">
      <BackLink
        fallbackHref="/expenses"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '24px', marginBottom: '28px' }}>
        <p style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
          IPSA · Accountability ledger
        </p>
        <h1 style={{ fontFamily: 'Special Elite, monospace', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15, transform: 'rotate(-0.3deg)' }}>
          Refused &amp; repaid: when IPSA says no
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '12px', maxWidth: '60ch' }}>
          Every claim IPSA refused, and every amount repaid, by MPs serving now, in the IPSA records we hold
          {firstYear && lastYear ? <> ({yearLabel(firstYear)} to {yearLabel(lastYear)}{isPartial(lastYear) ? ' so far' : ''})</> : null}, and why.
          IPSA publishes new claims about every two months. Source:{' '}
          <a href="https://www.theipsa.org.uk/" style={{ color: ACCENT }}>Independent Parliamentary Standards Authority</a>.
        </p>
      </header>

      <style>{`
        .rr-scroll { overflow-x: auto; }
        .rr-party-inline { display: none; }
        @media (max-width: 600px) {
          .rr-party { display: none; }
          .rr-party-inline { display: block; font-weight: normal; font-size: 14px; opacity: 0.75; }
        }
      `}</style>

      <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Tile label="Total refused" value={fmtMoney(totalRefusedAll)} sub={`${refusedClaimCount.toLocaleString()} claim${refusedClaimCount === 1 ? '' : 's'}`} accent={DANGER} />
        <Tile label="Total repaid" value={fmtMoney(totalRepaidAll)} sub={`${repaidClaimCount.toLocaleString()} claim${repaidClaimCount === 1 ? '' : 's'}`} accent={WARN} />
        <Tile label="MPs affected" value={String(distinctMps)} sub="serving MPs with at least one refused or repaid claim" accent={INK_SOFT} />
        <Tile label="Distinct refusal reasons" value={String(reasons.filter((r) => r.reason !== '(no reason recorded)').length)} sub="IPSA's recorded categories" accent={INK_SOFT} />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>By financial year</h2>
        <div className="rr-scroll"><table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={{ ...th, textAlign: 'left' }}>Year</th>
              <th style={{ ...th, textAlign: 'right' }}>Refused</th>
              <th style={{ ...th, textAlign: 'right' }}>Repaid</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ ...td, textAlign: 'left' }}>{yearLabel(y.year)}{isPartial(y.year) ? ' (so far)' : ''}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'monospace' }}>{fmtMoney(y.refused)}</span>
                  <span style={{ display: 'block', fontSize: '14px', opacity: 0.7 }}>{y.refusedCount.toLocaleString('en-GB')} claim{y.refusedCount === 1 ? '' : 's'}</span>
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <span style={{ fontFamily: 'monospace' }}>{fmtMoney(y.repaid)}</span>
                  <span style={{ display: 'block', fontSize: '14px', opacity: 0.7 }}>{y.repaidCount.toLocaleString('en-GB')} claim{y.repaidCount === 1 ? '' : 's'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Why IPSA refused</h2>
        <div className="rr-scroll"><table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={{ ...th, textAlign: 'left' }}>Reason</th>
              <th style={th}>Claims</th>
              <th style={{ ...th, textAlign: 'right' }}>Total refused</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((r) => (
              <tr key={r.reason} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ ...td, textAlign: 'left' }}>{reasonLabel(r.reason)}</td>
                <td style={td}>{r.count.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Refused, by MP</h2>
        <MpTable rows={refusedAgg} mpById={mpById} totalLabel="Total refused" />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Repaid, by MP</h2>
        <p style={{ fontSize: '15px', opacity: 0.7, marginBottom: '12px', maxWidth: '60ch' }}>
          Repaid &ne; refused: a repayment is money the MP did receive but then returned, either voluntarily or after IPSA review.
        </p>
        <MpTable rows={repaidAgg} mpById={mpById} totalLabel="Total repaid" />
      </section>

    </OpenGovShell>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: '"Special Elite", monospace',
  fontSize: '22px',
  fontWeight: 'bold',
  letterSpacing: '-0.01em',
  borderBottom: `1px solid ${INK_HAIRLINE}`,
  paddingBottom: '6px',
  marginBottom: '16px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '15px',
  fontFamily: '"Special Elite", monospace',
};

const headerRow: React.CSSProperties = {
  borderBottom: `2px solid ${INK}`,
  textAlign: 'center',
};

const th: React.CSSProperties = {
  padding: '8px 6px',
  fontSize: '15px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 'bold',
};

const td: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'center',
  fontSize: '15px',
  verticalAlign: 'top',
};

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: accent }}>{value}</div>
      <div style={{ fontSize: '15px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}

// One ranked table of MPs. The first 25 rows show; every other MP is one tap away under
// "Show all", in the same table layout and numbering.
const SHOWN = 25;
function MpRows({ rows, mpById, start }: { rows: Agg[]; mpById: Map<number, MpLookup>; start: number }) {
  return (
    <>
      {rows.map((a, i) => {
        const mp = mpById.get(a.member_id);
        return (
          <tr key={a.member_id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
            <td style={{ ...td, opacity: 0.6 }}>{start + i + 1}</td>
            <td style={{ ...td, textAlign: 'left' }}>
              {mp ? (
                <Link href={`/mps/${a.member_id}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 'bold' }}>
                  {mp.display_name ?? mp.name ?? a.mp_name}
                </Link>
              ) : (
                a.mp_name
              )}
              {mp?.party && <span className="rr-party-inline">{mp.party}</span>}
            </td>
            <td className="rr-party" style={{ ...td, textAlign: 'left', opacity: 0.75 }}>{mp?.party ?? ''}</td>
            <td style={td}>{a.count}</td>
            <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(a.total)}</td>
          </tr>
        );
      })}
    </>
  );
}

function MpHead({ totalLabel }: { totalLabel: string }) {
  return (
    <thead>
      <tr style={headerRow}>
        <th style={{ ...th, textAlign: 'left' }}>#</th>
        <th style={{ ...th, textAlign: 'left' }}>MP</th>
        <th className="rr-party" style={{ ...th, textAlign: 'left' }}>Party</th>
        <th style={th}>Claims</th>
        <th style={{ ...th, textAlign: 'right' }}>{totalLabel}</th>
      </tr>
    </thead>
  );
}

function MpTable({ rows, mpById, totalLabel }: { rows: Agg[]; mpById: Map<number, MpLookup>; totalLabel: string }) {
  const rest = rows.slice(SHOWN);
  return (
    <>
      <p style={{ fontSize: '15px', opacity: 0.75, margin: '0 0 8px' }}>{rows.length.toLocaleString('en-GB')} serving MP{rows.length === 1 ? '' : 's'}, highest first.</p>
      <div className="rr-scroll"><table style={tableStyle}>
        <MpHead totalLabel={totalLabel} />
        <tbody><MpRows rows={rows.slice(0, SHOWN)} mpById={mpById} start={0} /></tbody>
      </table></div>
      {rest.length > 0 && (
        <details style={{ marginTop: '10px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', color: ACCENT, padding: '8px 0' }}>
            Show all {rows.length.toLocaleString('en-GB')} MPs
          </summary>
          <div className="rr-scroll"><table style={tableStyle}>
            <MpHead totalLabel={totalLabel} />
            <tbody><MpRows rows={rest} mpById={mpById} start={SHOWN} /></tbody>
          </table></div>
        </details>
      )}
    </>
  );
}
