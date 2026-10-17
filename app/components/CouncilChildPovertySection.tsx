// "Child poverty" section for council pages (server component). Reads
// council_child_poverty — DWP Children in Low Income Families local area
// statistics; see scripts/migrations/2026-10-11f-council-child-poverty.sql.
//
// County councils have no rows of their own: their figures are summed from
// their districts (gssCodes). Each district's child population is derived
// as count / percentage, so the county percentage is weighted correctly
// rather than averaged.

import { supabase } from '@/lib/supabase';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';

type Row = {
  council_gss_code: string;
  measure: string;
  fye: number;
  children_count: number;
  percentage: number | null;
  release_label: string;
};

type Figure = { count: number; pct: number | null };

// Sum one measure/year across the given councils. Returns null if any
// council is missing that figure (so a county total is never silently
// partial).
function combine(rows: Row[], codes: string[], measure: string, fye: number): Figure | null {
  let count = 0, pop = 0, popKnown = true;
  for (const code of codes) {
    const r = rows.find((x) => x.council_gss_code === code && x.measure === measure && x.fye === fye);
    if (!r) return null;
    count += r.children_count;
    if (r.percentage && r.percentage > 0) pop += r.children_count / (r.percentage / 100);
    else popKnown = false;
  }
  return { count, pct: popKnown && pop > 0 ? (count / pop) * 100 : null };
}

const fmtNum = (n: number) => Math.round(n).toLocaleString('en-GB');
const fmtPct = (p: number | null) => (p == null ? 'n/a' : `${p.toFixed(1)}%`);
const fyLabel = (fye: number) => `${fye - 1}-${String(fye).slice(2)}`;

export default async function CouncilChildPovertySection({ gssCodes, isCounty }: { gssCodes: string[]; isCounty: boolean }) {
  if (gssCodes.length === 0) return null;
  const { data } = await supabase
    .from('council_child_poverty')
    .select('council_gss_code, measure, fye, children_count, percentage, release_label')
    .in('council_gss_code', gssCodes)
    .in('measure', ['relative_ahc', 'relative_bhc'])
    .limit(1000);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  const bhcYears = [...new Set(rows.filter((r) => r.measure === 'relative_bhc').map((r) => r.fye))].sort();
  const ahcYears = [...new Set(rows.filter((r) => r.measure === 'relative_ahc').map((r) => r.fye))].sort();
  const latest = Math.max(...rows.map((r) => r.fye));
  const ahc = ahcYears.includes(latest) ? combine(rows, gssCodes, 'relative_ahc', latest) : null;
  const bhc = combine(rows, gssCodes, 'relative_bhc', latest);
  const trend = bhcYears.map((y) => ({ fye: y, fig: combine(rows, gssCodes, 'relative_bhc', y) })).filter((t) => t.fig);
  if (!ahc && !bhc) return null;
  const release = rows[0].release_label;

  const stat = (label: string, fig: Figure | null, sub: string) =>
    fig && (
      <div style={{ flex: '1 1 220px', borderLeft: `3px solid ${INK}`, padding: '4px 0 4px 12px' }}>
        <div style={{ fontFamily: MONO, fontSize: '14px', color: INK, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontFamily: SERIF, fontSize: '30px', lineHeight: 1.1, color: INK }}>
          <strong>{fmtPct(fig.pct)}</strong>
        </div>
        <div style={{ fontFamily: MONO, fontSize: '14px', color: INK }}>
          {fmtNum(fig.count)} children · {sub}
        </div>
      </div>
    );

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Child poverty
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: '18px', lineHeight: 1.45, color: INK, margin: '0 0 14px' }}>
        Children under 16 living in low-income families, {fyLabel(latest)}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        {stat('After housing costs', ahc, 'income after rent or mortgage')}
        {stat('Before housing costs', bhc, 'income before rent or mortgage')}
      </div>

      {trend.length > 1 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '14px', color: INK, paddingBottom: '6px' }}>
            Before housing costs, by year
          </caption>
          <thead>
            <tr style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
              <th style={{ textAlign: 'left', padding: '4px 20px 4px 0', fontWeight: 'bold' }}>Year</th>
              <th style={{ textAlign: 'right', padding: '4px 20px 4px 0', fontWeight: 'bold' }}>Children</th>
              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 'bold' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((t) => (
              <tr key={t.fye} style={{ borderBottom: `1px solid ${INK_HAIRLINE}` }}>
                <td style={{ padding: '4px 20px 4px 0' }}>{fyLabel(t.fye)}</td>
                <td style={{ padding: '4px 20px 4px 0', textAlign: 'right' }}>{fmtNum(t.fig!.count)}</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{fmtPct(t.fig!.pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        {isCounty && 'Figures for this county are the total of its district councils. '}
        A child is counted if their family&rsquo;s income is below 60% of the UK median for that year and the family claimed Child Benefit plus at least one other benefit (Universal Credit, tax credits or Housing Benefit). The two measures can differ a lot: housing costs push the after-housing-costs figure far higher in expensive areas such as London. Figures are provisional and years before 2021-22 are not comparable, so the trend starts there.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '14px', color: INK, margin: 0 }}>
        Source: Department for Work and Pensions, Children in Low Income Families: local area statistics ({release}).
      </p>
    </section>
  );
}
