// "Child poverty" section for council pages (server component). Reads
// council_child_poverty — DWP Children in Low Income Families local area
// statistics; see scripts/migrations/2026-10-11f-council-child-poverty.sql.
//
// County councils have no rows of their own: their figures are summed from
// their districts (gssCodes). Each district's child population is derived
// as count / percentage, so the county percentage is weighted correctly
// rather than averaged.

import { SubFold } from './PhoneFolds';
import Link from 'next/link';
import { tagDb, COUNCIL_DATA_TAG } from '@/lib/page-reads';
import { combine, fmtNum, fmtPct, fyLabel, EXPLAINER, sourceLine, RANKING_PATH, type PovertyRow, type Figure } from '@/lib/child-poverty';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

type Row = PovertyRow;

// Shared by this section and the area summary (/your-area), so both show the same figure.
export async function loadChildPoverty(gssCodes: string[]) {
  if (gssCodes.length === 0) return null;
  const { data, error: dataErr } = await tagDb([COUNCIL_DATA_TAG])
    .from('council_child_poverty')
    .select('council_gss_code, measure, fye, children_count, percentage, release_label')
    .in('council_gss_code', gssCodes)
    .in('measure', ['relative_ahc', 'relative_bhc'])
    .limit(1000);
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`CouncilChildPovertySection council_child_poverty: ${dataErr.message}`);
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

  return { latest, ahc, bhc, trend, release };
}

export default async function CouncilChildPovertySection({ gssCodes, isCounty }: { gssCodes: string[]; isCounty: boolean }) {
  const loaded = await loadChildPoverty(gssCodes);
  if (!loaded) return null;
  const { latest, ahc, bhc, trend, release } = loaded;
  const stat = (label: string, fig: Figure | null, sub: string) =>
    fig && (
      <div style={{ flex: '1 1 220px', borderLeft: `3px solid ${INK}`, padding: '4px 0 4px 12px' }}>
        <div style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '2px' }}>{label}</div>
        <div style={{ fontFamily: SERIF, fontSize: '30px', lineHeight: 1.1, color: INK }}>
          <strong>{fmtPct(fig.pct)}</strong>
        </div>
        <div style={{ fontFamily: MONO, fontSize: '15px', color: INK }}>
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
        Children under 16 living in families on low incomes, {fyLabel(latest)}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        {stat('After housing costs', ahc, 'income after rent or mortgage')}
        {stat('Before housing costs', bhc, 'income before rent or mortgage')}
      </div>

      {trend.length > 1 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>
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

      {/* CHILD-POVERTY-RANK (owner approved 18 Nov 2026, Cowork ENTRY 317). */}
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 14px' }}>
        <Link href={RANKING_PATH} style={{ color: INK, textDecoration: 'underline' }}>See every council</Link>, ranked by the share after housing costs.
      </p>

      {/* T1-MOB batch 1 (Cowork 13 Nov 2026): on phones what the figure counts and its source fold (the council figures
          ran to 3,600px at 320); from 768px as before. */}
      <SubFold label="About these figures">
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        {isCounty && 'Figures for this county are the total of its district councils. '}
        {EXPLAINER}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>
        {sourceLine(release)}
      </p>
      </SubFold>
    </section>
  );
}
