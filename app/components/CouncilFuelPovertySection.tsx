// "Fuel poverty" section for council pages (server component, England).
// Reads council_fuel_poverty — DESNZ sub-regional fuel poverty data; see
// scripts/migrations/2026-10-11l-council-fuel-poverty.sql.
//
// Every English council, county councils included, has its own figure, shown
// with England's. No small area (neighbourhood) table: removed by the owner's
// decision, 28 Oct 2026, as readers found it hard to follow.
// Latest year only: DESNZ advises against reading these modelled local
// estimates as a trend.

import { pageDb } from '@/lib/page-reads';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');

// Shared by this section and the area summary (/your-area), so both show the same figure.
export async function loadFuelPoverty(gssCode: string | null) {
  if (!gssCode || !gssCode.startsWith('E')) return null;
  const { data, error: dataErr } = await pageDb()
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

export default async function CouncilFuelPovertySection({ gssCode }: { gssCode: string | null }) {
  const loaded = await loadFuelPoverty(gssCode);
  if (!loaded) return null;
  const { mine, year, pct, engPct } = loaded;

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Fuel poverty
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtNum(mine.fuel_poor)}</strong> households in fuel poverty, {year}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 16px' }}>
        {pct.toFixed(1)} per cent of {fmtNum(mine.households)} households{engPct != null ? ` (England ${engPct.toFixed(1)} per cent)` : ''}
      </p>

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        A household is counted as fuel poor if its home has an energy efficiency rating of band D or below and, after paying for housing and the energy it needs, its income is below the poverty line (60 per cent of the national median). These are modelled estimates: the government advises using them for broad comparisons and to spot areas of particularly high or low fuel poverty, not to track year to year changes, so only the latest year is shown.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>
        Source: Department for Energy Security and Net Zero, Sub-regional fuel poverty data ({year} data). Contains public sector information licensed under the Open Government Licence v3.0.
      </p>
    </section>
  );
}
