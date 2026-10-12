// "Claimant count" section for council pages (server component). Reads
// council_claimant_count — ONS Claimant Count via Nomis; see
// scripts/migrations/2026-10-11j-council-claimant-count.sql.
//
// Every council, county councils included, has its own figures (read by its
// own code; no summing).
//
// History runs from January 1986 (Nomis). The trend is a single-series bar
// chart with one bar per year (the same calendar month as the latest figure),
// one ink colour, native tooltips, and a dashed marker where the count starts
// to include Universal Credit (2013). The table under "Yearly and recent
// figures" lists every year plus every month of the last 2 years.

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';

type Row = {
  month: string;
  claimants: number | null;
  claimants_men: number | null;
  claimants_women: number | null;
  rate: number | null;
  rate_men: number | null;
  rate_women: number | null;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMonth = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
const fmtSigned = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(n))}`;

export default async function CouncilClaimantCountSection({ gssCode }: { gssCode: string | null }) {
  if (!gssCode) return null;
  // ~490 monthly rows per council (from January 1986), under PostgREST's 1,000-row cap.
  const { data } = await supabase
    .from('council_claimant_count')
    .select('month, claimants, claimants_men, claimants_women, rate, rate_men, rate_women')
    .eq('council_gss_code', gssCode)
    .order('month', { ascending: true })
    .limit(1000);
  const rows = ((data ?? []) as Row[])
    .map((r) => ({ ...r, rate: r.rate == null ? null : Number(r.rate), rate_men: r.rate_men == null ? null : Number(r.rate_men), rate_women: r.rate_women == null ? null : Number(r.rate_women) }))
    .filter((r) => r.claimants != null);
  if (rows.length === 0) return null;

  const latest = rows[rows.length - 1];
  const yearAgoMonth = `${Number(latest.month.slice(0, 4)) - 1}${latest.month.slice(4)}`;
  const yearAgo = rows.find((r) => r.month === yearAgoMonth) ?? null;
  const change = yearAgo ? (latest.claimants as number) - (yearAgo.claimants as number) : null;
  // One bar per year, same calendar month as the latest figure.
  const mm = latest.month.slice(5, 7);
  const yearly = rows.filter((r) => r.month.slice(5, 7) === mm);
  const maxTrend = Math.max(...yearly.map((r) => r.claimants as number));
  const ucIndex = yearly.findIndex((r) => r.month >= '2013-01-01');
  const recent = rows.slice(-24).reverse();

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Claimant count
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtNum(latest.claimants as number)}</strong> people claiming unemployment-related benefits, {fmtMonth(latest.month)}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px' }}>
        {[
          latest.rate != null ? `${latest.rate.toFixed(1)}% of residents aged 16 to 64` : null,
          change != null && yearAgo ? `${fmtSigned(change)} on ${fmtMonth(yearAgo.month)}` : null,
        ].filter(Boolean).join(' · ')}
      </p>

      {(latest.claimants_men != null || latest.claimants_women != null) && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '18px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>{fmtMonth(latest.month)}</th>
              <th style={{ textAlign: 'right', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Claimants</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 'bold' }}>% aged 16 to 64</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Men', n: latest.claimants_men, p: latest.rate_men },
              { label: 'Women', n: latest.claimants_women, p: latest.rate_women },
            ].map((g) => (
              <tr key={g.label} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 20px 6px 0' }}>{g.label}</td>
                <td style={{ padding: '6px 20px 6px 0', textAlign: 'right' }}>{g.n != null ? fmtNum(g.n) : 'not published'}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{g.p != null ? `${g.p.toFixed(1)}%` : 'not published'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {yearly.length > 1 && (
        <figure style={{ margin: '0 0 18px' }}>
          <figcaption style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '6px' }}>
            People claiming each {MONTHS[Number(mm) - 1]}
          </figcaption>
          <div
            role="img"
            aria-label={`People claiming each ${MONTHS[Number(mm) - 1]}, ${yearly[0].month.slice(0, 4)} to ${latest.month.slice(0, 4)}${ucIndex > 0 ? '; from 2013 the count includes Universal Credit claimants required to look for work' : ''}. Full figures are in the table below.`}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '90px', borderBottom: `1px solid ${INK}` }}
          >
            {yearly.map((r, i) => (
              <div
                key={r.month}
                title={`${fmtMonth(r.month)}: ${fmtNum(r.claimants as number)} claimants${r.rate != null ? ` (${r.rate.toFixed(1)}% of residents aged 16 to 64)` : ''}`}
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default', borderLeft: i === ucIndex && ucIndex > 0 ? `1px dashed ${ACCENT}` : undefined, paddingLeft: i === ucIndex && ucIndex > 0 ? '2px' : undefined }}
              >
                <div style={{ width: '100%', height: `${Math.max(2, ((r.claimants as number) / maxTrend) * 100)}%`, background: INK, borderRadius: '2px 2px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '13px', color: INK, marginTop: '4px', gap: '8px' }}>
            <span>{yearly[0].month.slice(0, 4)}</span>
            {ucIndex > 0 && <span style={{ color: ACCENT }}>┊ from 2013: includes Universal Credit</span>}
            <span>{latest.month.slice(0, 4)}</span>
          </div>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontFamily: MONO, fontSize: '14px', color: ACCENT, cursor: 'pointer' }}>Yearly and recent figures</summary>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, marginTop: '6px' }}>
              <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, padding: '4px 0' }}>Last 2 years, every month</caption>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '2px 16px 2px 0', fontWeight: 'bold' }}>Month</th>
                  <th style={{ textAlign: 'right', padding: '2px 16px 2px 0', fontWeight: 'bold' }}>Claimants</th>
                  <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 'bold' }}>% aged 16 to 64</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.month}>
                    <td style={{ padding: '2px 16px 2px 0' }}>{fmtMonth(r.month)}</td>
                    <td style={{ padding: '2px 16px 2px 0', textAlign: 'right' }}>{fmtNum(r.claimants as number)}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{r.rate != null ? `${r.rate.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, marginTop: '10px' }}>
              <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, padding: '4px 0' }}>Every year, {MONTHS[Number(mm) - 1]}</caption>
              <tbody>
                {[...yearly].reverse().map((r) => (
                  <tr key={r.month}>
                    <td style={{ padding: '2px 16px 2px 0' }}>{fmtMonth(r.month)}{r.month < '2013-01-01' && ucIndex > 0 ? ' *' : ''}</td>
                    <td style={{ padding: '2px 16px 2px 0', textAlign: 'right' }}>{fmtNum(r.claimants as number)}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{r.rate != null ? `${r.rate.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ucIndex > 0 && <p style={{ fontFamily: MONO, fontSize: '13px', color: INK, margin: '6px 0 0' }}>* Before 2013: Unemployment Benefit or Jobseeker&rsquo;s Allowance claimants only. — means no share was published for that year.</p>}
          </details>
        </figure>
      )}

      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        The Claimant Count is people claiming Jobseeker&rsquo;s Allowance plus people on Universal Credit who are required to look for work. Before 2013 it counted only Unemployment Benefit or Jobseeker&rsquo;s Allowance claimants, so earlier years are not strictly comparable. Universal Credit requires more people to search for work than Jobseeker&rsquo;s Allowance did, so as it replaced older benefits from 2013, part of the rise in the count reflects that change rather than more unemployment. It is not the official unemployment rate, which comes from a survey. The latest month can be revised.
        {rows[0].month > '1986-01-01' && ` Figures for this council start in ${fmtMonth(rows[0].month)}.`}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '13px', color: INK, margin: 0 }}>
        Source: Office for National Statistics, Claimant Count (via Nomis). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
