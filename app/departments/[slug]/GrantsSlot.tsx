// "Grants" tab for department pages. Data: Cabinet Office Government grants
// register (scripts/migrations/2026-10-11g-government-grants.sql), grouped
// under the department with its agencies and arm's length bodies.
// Pure display: the page fetches with getDepartmentGrants() and passes the
// result in, so this ships in the static HTML like the other slots.

import { pageDb } from '@/lib/page-reads';

const ACCENT = '#7a1612';
const INK = '#14100d';
const HAIRLINE = 'rgba(20,16,13,0.2)';
const H2_CLS = 'text-[15px] uppercase tracking-[0.25em] mb-4 font-semibold';

export type DepartmentGrants = {
  fy: string;
  totalAmount: number;
  awardCount: number;
  byFunder: { funder: string; amount: number; count: number }[];
  schemes: { title: string; funder: string | null; value: number }[];
  topAwards: { recipient: string | null; scheme: string | null; funder: string | null; amount: number }[];
};

export async function getDepartmentGrants(slug: string): Promise<DepartmentGrants | null> {
  const { data: summary, error: summaryErr } = await pageDb()
    .from('government_grants_summary')
    .select('fy, body_name, award_count, total_amount')
    .eq('department_slug', slug)
    .order('fy', { ascending: false });
  if (summaryErr && summaryErr.code !== 'PGRST116') throw new Error(`GrantsSlot government_grants_summary: ${summaryErr.message}`);
  if (!summary || summary.length === 0) return null;
  const fy = summary[0].fy as string;
  const rows = summary.filter((r) => r.fy === fy);

  const [{ data: schemes, error: schemesErr }, { data: awards, error: awardsErr }] = await Promise.all([
    pageDb()
      .from('government_grant_schemes')
      .select('title, managed_by, fy_value')
      .eq('department_slug', slug)
      .eq('fy', fy)
      .not('fy_value', 'is', null)
      .order('fy_value', { ascending: false })
      .limit(10),
    pageDb()
      .from('government_grants')
      .select('recipient_name, scheme_title, managed_by, amount')
      .eq('department_slug', slug)
      .eq('fy', fy)
      .order('amount', { ascending: false })
      .limit(20),
  ]);
  // A failed read throws (owner's approval, 21 Oct 2026), so the last good version stays up.
  for (const e of [schemesErr, awardsErr]) if (e && e.code !== 'PGRST116') throw new Error(`GrantsSlot (government_grant_schemes, government_grants): ${e.message}`);

  return {
    fy,
    totalAmount: rows.reduce((s, r) => s + Number(r.total_amount), 0),
    awardCount: rows.reduce((s, r) => s + Number(r.award_count), 0),
    byFunder: rows
      .map((r) => ({ funder: r.body_name as string, amount: Number(r.total_amount), count: Number(r.award_count) }))
      .sort((a, b) => b.amount - a.amount),
    schemes: (schemes ?? []).map((s) => ({ title: (s.title as string) || 'Untitled scheme', funder: s.managed_by as string | null, value: Number(s.fy_value) })),
    topAwards: (awards ?? []).map((a) => ({
      recipient: a.recipient_name as string | null,
      scheme: a.scheme_title as string | null,
      funder: a.managed_by as string | null,
      amount: Number(a.amount),
    })),
  };
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `£${(n / 1e9).toFixed(2)}bn`;
  if (Math.abs(n) >= 1e6) return `£${(n / 1e6).toFixed(1)}m`;
  if (Math.abs(n) >= 1e3) return `£${Math.round(n / 1e3).toLocaleString('en-GB')}k`;
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', fontWeight: 'bold', fontSize: '15px' };
const td: React.CSSProperties = { padding: '6px 10px 6px 0', fontSize: '15px', verticalAlign: 'top' };
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap', paddingRight: 0 };

export function GrantsSlot({ grants }: { grants: DepartmentGrants }) {
  const fyLabel = grants.fy.replace('-', ' to 20');
  return (
    <section style={{ color: INK }}>
      <h2 className={H2_CLS} style={{ color: ACCENT }}>Grants · {grants.fy}</h2>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#7a1612', lineHeight: 1 }}>{fmtMoney(grants.totalAmount)}</div>
        <div style={{ fontSize: '15px' }}>
          paid in grants in {fyLabel}, across {grants.awardCount.toLocaleString('en-GB')} awards
        </div>
      </div>

      {grants.byFunder.length > 1 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <caption style={{ textAlign: 'left', fontSize: '15px', fontWeight: 'bold', paddingBottom: '6px' }}>By funding body</caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
              <th style={th}>Body</th>
              <th style={{ ...th, textAlign: 'right' }}>Awards</th>
              <th style={{ ...th, textAlign: 'right', paddingRight: 0 }}>Paid</th>
            </tr>
          </thead>
          <tbody>
            {grants.byFunder.map((f) => (
              <tr key={f.funder} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={td}>{f.funder}</td>
                <td style={{ ...td, textAlign: 'right' }}>{f.count.toLocaleString('en-GB')}</td>
                <td style={tdNum}>{fmtMoney(f.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {grants.schemes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <caption style={{ textAlign: 'left', fontSize: '15px', fontWeight: 'bold', paddingBottom: '6px' }}>Largest grant schemes</caption>
          <tbody>
            {grants.schemes.map((s, i) => (
              <tr key={`${s.title}-${i}`} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={td}>
                  {s.title}
                  {s.funder && <span style={{ display: 'block', fontSize: '15px' }}>{s.funder}</span>}
                </td>
                <td style={tdNum}>{fmtMoney(s.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {grants.topAwards.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <caption style={{ textAlign: 'left', fontSize: '15px', fontWeight: 'bold', paddingBottom: '6px' }}>Largest individual awards</caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
              <th style={th}>Recipient</th>
              <th style={th}>Scheme</th>
              <th style={{ ...th, textAlign: 'right', paddingRight: 0 }}>Paid</th>
            </tr>
          </thead>
          <tbody>
            {grants.topAwards.map((a, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <td style={td}>{a.recipient ?? <em>Name not published</em>}</td>
                <td style={td}>
                  {a.scheme ?? 'n/a'}
                  {a.funder && <span style={{ display: 'block', fontSize: '15px' }}>{a.funder}</span>}
                </td>
                <td style={tdNum}>{fmtMoney(a.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '4px' }}>
        Source: Cabinet Office, Government grants register {fyLabel} (official statistics, published on GOV.UK). Includes grants paid by the department and the agencies and bodies it funds. Amounts are what was paid out in the financial year. Government withholds some recipients&rsquo; names for sensitivity reasons, and grants to individuals are not named here.
      </p>
    </section>
  );
}
