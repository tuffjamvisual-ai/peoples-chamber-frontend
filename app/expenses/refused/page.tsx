import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import DossierShell from '../../components/DossierShell';
import BackLink from '../../components/BackLink';

export const metadata: Metadata = {
  title: "MP Expenses Refused or Repaid, IPSA Rejections, Late Submissions & Repayments | The People's Chamber",
  description:
    "Every MP claim IPSA refused, every amount MPs had to repay, and why. League tables by member and by rejection reason, sourced from IPSA's published business-cost data.",
  alternates: { canonical: '/expenses/refused' },
};

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
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
  member_id: number | null;
  mp_name: string | null;
  amount_not_paid: number | string | null;
  amount_repaid: number | string | null;
  reason_if_not_paid: string | null;
};

type MpLookup = { member_id: number; display_name: string | null; name: string | null; party: string | null };

type Agg = { member_id: number; mp_name: string; total: number; count: number };

// Paginate through every row where there was a refusal OR a repayment.
// At the moment that's ~1,921 rows site-wide so a few range() calls cover it.
async function fetchRefusedRepaid(): Promise<DetailRow[]> {
  const out: DetailRow[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 50000; from += PAGE) {
    const { data, error } = await supabase
      .from('mp_expenses_detail')
      .select('member_id, mp_name, amount_not_paid, amount_repaid, reason_if_not_paid')
      .or('amount_not_paid.gt.0,amount_repaid.gt.0')
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
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

export default async function RefusedExpensesPage() {
  const rows = await fetchRefusedRepaid();
  const refusedAgg = aggregateBy('amount_not_paid', rows).slice(0, 25);
  const repaidAgg = aggregateBy('amount_repaid', rows).slice(0, 25);
  const reasons = aggregateReasons(rows);

  const totalRefusedAll = rows.reduce((s, r) => s + (Number(r.amount_not_paid) || 0), 0);
  const totalRepaidAll = rows.reduce((s, r) => s + (Number(r.amount_repaid) || 0), 0);
  const refusedClaimCount = rows.filter((r) => Number(r.amount_not_paid) > 0).length;
  const repaidClaimCount = rows.filter((r) => Number(r.amount_repaid) > 0).length;

  // Resolve display names + parties for the table entries we'll actually render.
  const memberIds = Array.from(new Set([...refusedAgg, ...repaidAgg].map((a) => a.member_id))).filter((id) => id > 0);
  const { data: mpRows } = memberIds.length
    ? await supabase.from('mps').select('member_id, display_name, name, party').in('member_id', memberIds)
    : { data: [] as MpLookup[] };
  const mpById = new Map<number, MpLookup>((mpRows || []).map((m) => [m.member_id, m]));

  return (
    <DossierShell>
      <BackLink
        fallbackHref="/expenses"
        label="← Back to Expenses"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ borderBottom: `1px solid ${INK_HAIRLINE}`, paddingBottom: '24px', marginBottom: '28px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '12px', opacity: 0.85, transform: 'rotate(-0.2deg)' }}>
          IPSA · Accountability ledger
        </p>
        <h1 style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', lineHeight: 1.15, transform: 'rotate(-0.3deg)' }}>
          Refused &amp; repaid: when IPSA says no
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.7, marginTop: '12px', maxWidth: '60ch' }}>
          Every MP claim IPSA refused, every amount MPs had to repay, and why. Sourced from IPSA&rsquo;s published individual business-cost data; updated as IPSA publishes new tranches each quarter.
        </p>
      </header>

      <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <Tile label="Total refused" value={fmtMoney(totalRefusedAll)} sub={`${refusedClaimCount.toLocaleString()} claim${refusedClaimCount === 1 ? '' : 's'}`} accent={DANGER} />
        <Tile label="Total repaid" value={fmtMoney(totalRepaidAll)} sub={`${repaidClaimCount.toLocaleString()} claim${repaidClaimCount === 1 ? '' : 's'}`} accent={WARN} />
        <Tile label="Distinct MPs affected" value={String(new Set(rows.map((r) => r.member_id)).size)} sub="with at least one refused or repaid claim" accent={INK_SOFT} />
        <Tile label="Distinct refusal reasons" value={String(reasons.length)} sub="IPSA's recorded categories" accent={INK_SOFT} />
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Why IPSA refused</h2>
        <table style={tableStyle}>
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
                <td style={{ ...td, textAlign: 'left' }}>{r.reason}</td>
                <td style={td}>{r.count.toLocaleString()}</td>
                <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>{fmtMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Most refused, by MP</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={{ ...th, textAlign: 'left' }}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>MP</th>
              <th style={{ ...th, textAlign: 'left' }}>Party</th>
              <th style={th}>Claims</th>
              <th style={{ ...th, textAlign: 'right' }}>Total refused</th>
            </tr>
          </thead>
          <tbody>
            {refusedAgg.map((a, i) => {
              const mp = mpById.get(a.member_id);
              return (
                <tr key={a.member_id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ ...td, opacity: 0.6 }}>{i + 1}</td>
                  <td style={{ ...td, textAlign: 'left' }}>
                    {a.member_id > 0 ? (
                      <Link href={`/mps/${a.member_id}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 'bold' }}>
                        {mp?.display_name ?? mp?.name ?? a.mp_name}
                      </Link>
                    ) : (
                      a.mp_name
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'left', opacity: 0.75 }}>{mp?.party ?? ', '}</td>
                  <td style={td}>{a.count}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(a.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={sectionH2}>Most repaid, by MP</h2>
        <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '12px', maxWidth: '60ch' }}>
          Repaid &ne; refused: a repayment is money the MP did receive but then returned, either voluntarily or after IPSA review.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={{ ...th, textAlign: 'left' }}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>MP</th>
              <th style={{ ...th, textAlign: 'left' }}>Party</th>
              <th style={th}>Claims</th>
              <th style={{ ...th, textAlign: 'right' }}>Total repaid</th>
            </tr>
          </thead>
          <tbody>
            {repaidAgg.map((a, i) => {
              const mp = mpById.get(a.member_id);
              return (
                <tr key={a.member_id} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ ...td, opacity: 0.6 }}>{i + 1}</td>
                  <td style={{ ...td, textAlign: 'left' }}>
                    {a.member_id > 0 ? (
                      <Link href={`/mps/${a.member_id}`} style={{ color: ACCENT, textDecoration: 'none', fontWeight: 'bold' }}>
                        {mp?.display_name ?? mp?.name ?? a.mp_name}
                      </Link>
                    ) : (
                      a.mp_name
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'left', opacity: 0.75 }}>{mp?.party ?? ', '}</td>
                  <td style={td}>{a.count}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{fmtMoney(a.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: '12px', opacity: 0.6, lineHeight: 1.55, marginTop: '32px' }}>
        Source: IPSA individualBusinessCosts dataset, fields amount_not_paid + amount_repaid + reason_if_not_paid. Aggregates exclude unmapped rows where the MP&rsquo;s parliamentary identifier did not resolve to a current member record.
      </p>

      <ScrollToTopButton />
    </DossierShell>
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
  fontSize: '13px',
  fontFamily: '"Special Elite", monospace',
};

const headerRow: React.CSSProperties = {
  borderBottom: `2px solid ${INK}`,
  textAlign: 'center',
};

const th: React.CSSProperties = {
  padding: '8px 6px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 'bold',
};

const td: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'center',
  fontSize: '13px',
  verticalAlign: 'top',
};

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '12px 14px', background: 'rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.7, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: '"Special Elite", monospace', fontSize: '22px', fontWeight: 'bold', color: accent }}>{value}</div>
      <div style={{ fontSize: '12px', opacity: 0.65, marginTop: '4px' }}>{sub}</div>
    </div>
  );
}
