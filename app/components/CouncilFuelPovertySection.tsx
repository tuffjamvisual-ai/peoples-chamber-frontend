// "Fuel poverty" section for council pages (server component, England).
// Reads council_fuel_poverty and council_fuel_poverty_lsoa — DESNZ
// sub-regional fuel poverty data; see
// scripts/migrations/2026-10-11l-council-fuel-poverty.sql.
//
// Every English council, county councils included, has its own figure. The
// neighbourhood breakdown uses the small areas (LSOAs) of the council's own
// area: a county's come from its districts (neighbourhoodCodes).
// Latest year only: DESNZ advises against reading these modelled local
// estimates as a trend.

import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

type Lsoa = { lsoa_name: string; households: number; fuel_poor: number; percentage: number };

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');

async function fetchLsoas(codes: string[], year: number): Promise<Lsoa[]> {
  // (24 Oct 2026, report 36): every row via lib/read-all.ts, which throws on a failed page instead of stopping
  // quietly, so the page keeps its last good version rather than showing part of the figures. lsoa_code is unique within one data_year (primary key lsoa_code, data_year).
  const rows = await readAll<Lsoa>(() => supabase.from('council_fuel_poverty_lsoa'), {
    columns: 'lsoa_name, households, fuel_poor, percentage',
    filter: (q) => q.in('council_gss_code', codes).eq('data_year', year),
    orderBy: 'lsoa_code',
    label: 'CouncilFuelPovertySection',
  });
  return rows.map((l) => ({ ...l, percentage: Number(l.percentage) }));
}

// Shared by this section and the area summary (/your-area), so both show the same figure.
export async function loadFuelPoverty(gssCode: string | null) {
  if (!gssCode || !gssCode.startsWith('E')) return null;
  const { data, error: dataErr } = await supabase
    .from('council_fuel_poverty')
    .select('council_gss_code, data_year, households, fuel_poor, percentage')
    .in('council_gss_code', [gssCode, 'E92000001'])
    .order('data_year', { ascending: false })
    .limit(20);
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`CouncilFuelPovertySection council_fuel_poverty: ${dataErr.message}`);
  const rows = (data ?? []) as { council_gss_code: string; data_year: number; households: number; fuel_poor: number; percentage: number }[];
  const mine = rows.find((r) => r.council_gss_code === gssCode);
  if (!mine) return null;
  const year = mine.data_year;
  const england = rows.find((r) => r.council_gss_code === 'E92000001' && r.data_year === year) ?? null;
  const pct = Number(mine.percentage);
  const engPct = england ? Number(england.percentage) : null;

  return { mine, year, pct, engPct };
}

export default async function CouncilFuelPovertySection({ gssCode, neighbourhoodCodes }: { gssCode: string | null; neighbourhoodCodes: string[] }) {
  const loaded = await loadFuelPoverty(gssCode);
  if (!loaded) return null;
  const { mine, year, pct, engPct } = loaded;

  const lsoas = neighbourhoodCodes.length ? await fetchLsoas(neighbourhoodCodes, year) : [];
  const sorted = [...lsoas].sort((a, b) => b.percentage - a.percentage);
  const above = engPct != null ? lsoas.filter((l) => l.percentage > engPct).length : null;

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Fuel poverty
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtNum(mine.fuel_poor)}</strong> households in fuel poverty, {year}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px' }}>
        {pct.toFixed(1)}% of {fmtNum(mine.households)} households{engPct != null ? ` · England ${engPct.toFixed(1)}%` : ''}
      </p>

      {sorted.length > 1 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 8px' }}>
            Across this area&rsquo;s {fmtNum(sorted.length)} neighbourhoods, estimates range from {sorted[sorted.length - 1].percentage.toFixed(1)}% to {sorted[0].percentage.toFixed(1)}%
            {above != null && engPct != null ? `; ${fmtNum(above)} are above the England rate of ${engPct.toFixed(1)}%` : ''}.
          </p>
          <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK }}>
            <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, paddingBottom: '6px' }}>Neighbourhoods with the highest estimated rates</caption>
            <thead>
              <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <th style={{ textAlign: 'left', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Neighbourhood</th>
                <th style={{ textAlign: 'right', padding: '6px 20px 6px 0', fontWeight: 'bold' }}>Households</th>
                <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 'bold' }}>Fuel poor</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 5).map((l) => (
                <tr key={l.lsoa_name} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                  <td style={{ padding: '6px 20px 6px 0' }}>{l.lsoa_name}</td>
                  <td style={{ padding: '6px 20px 6px 0', textAlign: 'right' }}>{fmtNum(l.households)}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>{l.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        A household is counted as fuel poor if its home has an energy efficiency rating of band D or below and, after paying for housing and the energy it needs, its income is below the poverty line (60% of the national median). These are modelled estimates: the government advises using them for broad comparisons and to spot areas of particularly high or low fuel poverty, not to track year to year changes, so only the latest year is shown. Neighbourhoods are small census areas (lower layer super output areas) of roughly 1,500 people, named after their council and a reference number; their estimates are less certain than the council figure.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: 0 }}>
        Source: Department for Energy Security and Net Zero, Sub-regional fuel poverty data ({year} data). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
