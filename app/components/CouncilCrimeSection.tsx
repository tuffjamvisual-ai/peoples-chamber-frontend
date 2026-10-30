// "Crime" section for council pages (server component). Reads
// council_crime_stats — see scripts/migrations/2026-10-11e-council-crime.sql
// for the three sources:
//   police_uk     England & Wales, monthly (data.police.uk)
//   psni          Northern Ireland, monthly (PSNI recorded crime tables)
//   scotland_rcs  Scotland, financial years (Recorded Crime in Scotland)
//
// County councils have no rows of their own: their figures are the sum of
// their district councils' rows, passed in as gssCodes.
//
// The monthly trend is a single-series bar chart (one ink colour, no
// legend needed), each bar carrying a native tooltip, with the same
// figures available as a table under "Monthly figures".

import { pageDb } from '@/lib/page-reads';
import { readAll } from '@/lib/read-all';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

type CrimeRow = {
  council_gss_code: string;
  source: string;
  period_type: string;
  period_start: string;
  period_label: string;
  crime_category: string;
  is_total: boolean;
  count: number;
  rate_per_10k: number | null;
  updated_at: string;
};

const SELECT = 'council_gss_code, source, period_type, period_start, period_label, crime_category, is_total, count, rate_per_10k, updated_at';

// PostgREST returns at most 1,000 rows per call; a county's 24 months
// across a dozen districts is several thousand, so page through.
async function fetchAll(codes: string[], fromDate: string | null): Promise<CrimeRow[]> {
  // (24 Oct 2026, report 36): every row via lib/read-all.ts, which throws on a failed page instead of stopping
  // quietly, so the page keeps its last good version rather than showing part of the figures. The 50,000 row cap is gone.
  return readAll<CrimeRow>(() => pageDb().from('council_crime_stats'), {
    columns: SELECT,
    filter: (q) => {
      const byCouncil = q.in('council_gss_code', codes);
      return fromDate ? byCouncil.gte('period_start', fromDate) : byCouncil;
    },
    orderBy: [{ column: 'period_start' }, { column: 'id' }],
    label: 'CouncilCrimeSection',
  });
}

function addMonths(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
const fmtMonth = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtMonthShort = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function changeText(current: number, previous: number | null, period: string): string | null {
  if (previous == null || previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return `No change on the ${period}`;
  return `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct).toFixed(1)}% on the ${period}`;
}

const SOURCE_NOTES: Record<string, string> = {
  police_uk:
    'Source: data.police.uk, the official police crime data for England and Wales, summed to this council’s boundary from the small local area each crime is recorded in. Locations are approximate by design to protect privacy. Includes antisocial behaviour. Excludes fraud, which is recorded nationally, and the small number of crimes (about 1.4% in recent months) that police record with no location.',
  psni:
    'Source: Police Service of Northern Ireland, Police Recorded Crime monthly tables. PSNI’s 11 policing districts cover the same areas as Northern Ireland’s 11 councils.',
  scotland_rcs:
    'Source: Scottish Government, Recorded Crime in Scotland (Accredited Official Statistics). Published once a year for each financial year (April to March).',
};

export type CrimeHeadline = { total: number; periodText: string; change: string | null; ratePer1000: number | null };

// Shared by this section and the area summary (/your-area), so both show the same figure.
export async function loadCrime(gssCodes: string[], population: number | null) {
  if (gssCodes.length === 0) return null;

  // Latest period first (one cheap query), then just the window needed.
  const { data: latestRow, error: latestRowErr } = await pageDb()
    .from('council_crime_stats')
    .select('source, period_type, period_start')
    .in('council_gss_code', gssCodes)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestRowErr && latestRowErr.code !== 'PGRST116') throw new Error(`CouncilCrimeSection council_crime_stats: ${latestRowErr.message}`);
  if (!latestRow) return null;

  const monthly = latestRow.period_type === 'month';
  const source = latestRow.source as string;
  const latest = latestRow.period_start as string;
  const fromDate = monthly ? addMonths(latest, -23) : addMonths(latest, -12);
  const rows = (await fetchAll(gssCodes, fromDate)).filter((r) => r.source === source);
  if (rows.length === 0) return null;
  const updatedAt = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), rows[0].updated_at);

  let headline: CrimeHeadline;
  let categories: { name: string; count: number }[];
  let trend: { month: string; total: number }[] = [];

  if (monthly) {
    // Per council, per month: the source's own total row if it publishes
    // one (PSNI), otherwise the sum of categories (data.police.uk).
    const months: string[] = [];
    for (let i = 23; i >= 0; i--) months.push(addMonths(latest, -i));
    const monthTotal = new Map<string, number>();
    const byCouncilMonth = new Map<string, { total: number | null; sum: number }>();
    for (const r of rows) {
      const k = `${r.council_gss_code}|${r.period_start}`;
      const e = byCouncilMonth.get(k) ?? { total: null, sum: 0 };
      if (r.is_total) e.total = (e.total ?? 0) + r.count;
      else e.sum += r.count;
      byCouncilMonth.set(k, e);
    }
    for (const [k, e] of byCouncilMonth) {
      const m = k.split('|')[1];
      monthTotal.set(m, (monthTotal.get(m) ?? 0) + (e.total ?? e.sum));
    }
    const last12 = months.slice(12);
    const prev12 = months.slice(0, 12);
    const total = last12.reduce((s, m) => s + (monthTotal.get(m) ?? 0), 0);
    const prevComplete = prev12.every((m) => monthTotal.has(m));
    const prevTotal = prevComplete ? prev12.reduce((s, m) => s + (monthTotal.get(m) ?? 0), 0) : null;
    headline = {
      total,
      periodText: `in the 12 months to ${fmtMonth(latest)}`,
      change: changeText(total, prevTotal, 'previous 12 months'),
      ratePer1000: population ? (total / population) * 1000 : null,
    };
    const cat = new Map<string, number>();
    for (const r of rows) {
      if (r.is_total || !last12.includes(r.period_start)) continue;
      cat.set(r.crime_category, (cat.get(r.crime_category) ?? 0) + r.count);
    }
    categories = [...cat.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    trend = last12.map((m) => ({ month: m, total: monthTotal.get(m) ?? 0 }));
  } else {
    // Scotland: the latest financial year's own total and published rate;
    // crime groups only (detailed types are labelled "Group: type").
    const latestRows = rows.filter((r) => r.period_start === latest);
    const prevStart = addMonths(latest, -12);
    const totalRow = latestRows.find((r) => r.is_total);
    const prevTotalRow = rows.find((r) => r.period_start === prevStart && r.is_total);
    const total = totalRow?.count ?? latestRows.filter((r) => !r.crime_category.includes(':')).reduce((s, r) => s + r.count, 0);
    headline = {
      total,
      periodText: `in ${totalRow?.period_label ?? latestRows[0].period_label} (April to March)`,
      change: changeText(total, prevTotalRow?.count ?? null, 'previous year'),
      ratePer1000: totalRow?.rate_per_10k != null ? totalRow.rate_per_10k / 10 : null,
    };
    categories = latestRows
      .filter((r) => !r.is_total && !r.crime_category.includes(':') && r.count > 0)
      .map((r) => ({ name: r.crime_category, count: r.count }))
      .sort((a, b) => b.count - a.count);
  }

  return { headline, categories, trend, updatedAt, source, monthly };
}

export default async function CouncilCrimeSection({
  gssCodes,
  population,
  isCounty,
}: {
  gssCodes: string[];
  population: number | null;
  isCounty: boolean;
}) {
  const loaded = await loadCrime(gssCodes, population);
  if (!loaded) return null;
  const { headline, categories, trend, updatedAt, source } = loaded;
  const maxTrend = Math.max(1, ...trend.map((t) => t.total));

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Crime
      </h2>

      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtNum(headline.total)}</strong> crimes recorded {headline.periodText}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px' }}>
        {/* No rate per resident (owner's rule, 19 Oct 2026: no "per X" figures). */}
        {headline.change}
      </p>

      {trend.length > 0 && (
        <figure style={{ margin: '0 0 18px' }}>
          <figcaption style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '6px' }}>Crimes recorded each month</figcaption>
          <div
            role="img"
            aria-label={`Monthly crimes recorded, ${fmtMonth(trend[0].month)} to ${fmtMonth(trend[trend.length - 1].month)}. Full figures are in the Monthly figures table below.`}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '90px', borderBottom: `1px solid ${INK}` }}
          >
            {trend.map((t) => (
              <div
                key={t.month}
                title={`${fmtMonth(t.month)}: ${fmtNum(t.total)} crimes`}
                style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}
              >
                <div style={{ width: '100%', height: `${Math.max(2, (t.total / maxTrend) * 100)}%`, background: INK, borderRadius: '2px 2px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '4px' }}>
            <span>{fmtMonthShort(trend[0].month)}</span>
            <span>{fmtMonthShort(trend[trend.length - 1].month)}</span>
          </div>
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontFamily: MONO, fontSize: '15px', color: ACCENT, cursor: 'pointer' }}>Monthly figures</summary>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '6px' }}>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.month}>
                    <td style={{ padding: '2px 16px 2px 0' }}>{fmtMonth(t.month)}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right' }}>{fmtNum(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </figure>
      )}

      {categories.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 'bold' }}>Type of crime</th>
              <th style={{ textAlign: 'right', padding: '6px 0 6px 8px', fontWeight: 'bold' }}>Crimes</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '6px 8px 6px 0' }}>{c.name}</td>
                <td style={{ padding: '6px 0 6px 8px', textAlign: 'right' }}>{fmtNum(c.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        {isCounty && 'Figures for this county are the total of its district councils. '}
        {SOURCE_NOTES[source] ?? ''}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>
        Crime figures last updated {fmtDate(updatedAt)}.
      </p>
    </section>
  );
}
