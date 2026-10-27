// "Sewage spills" section for council pages (server component, England,
// Scotland and Northern Ireland). Reads sewage_area_totals and sewage_overflows via
// lib/sewage.ts; see scripts/migrations/2026-10-12h-sewage-overflows.sql.
//
// Storm overflows are run by water companies, not councils: the section says
// so plainly and names the companies. County councils have no figures of
// their own (they are not in the ONS council boundaries), so a county shows
// the total of its districts. Welsh councils show nothing until Welsh data is
// loaded (the one English-return overflow in Wales would otherwise appear as a
// misleading partial count).

import { getAreaTotals, latestYears, getCouncilOverflows, getCouncilRefs, rankByHours, countyTotals, isCoveredCode, nationOfCode, fmtInt, fmtHours, ordinal } from '@/lib/sewage';
import type { Overflow, AreaTotal } from '@/lib/sewage';
import type { CSSProperties } from 'react';
import Link from 'next/link';

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';

export default async function CouncilSewageSection({
  gssCode,
  isCounty,
  districtCodes,
  fullListHref,
}: {
  gssCode: string | null;
  isCounty: boolean;
  districtCodes: string[];
  /** On the council page: link the full list of overflows (its own page) instead of including it (owner's approval,
   * 21 Oct 2026). Omitted on /councils/[slug]/sewage itself. */
  fullListHref?: string;
}) {
  if (!gssCode || !isCoveredCode(gssCode)) return null;
  const nation = nationOfCode(gssCode);
  if (!nation) return null;

  let totals: AreaTotal[];
  try { totals = await getAreaTotals(); } catch { return null; }
  const year = latestYears(totals)[nation];
  if (year == null) return null;
  const councilTotals = totals.filter((t) => t.area_type === 'council' && t.nation === nation && t.year === year);

  // This council's figures and its rank.
  let mine: AreaTotal | null = null;
  let rank: number | null = null, of: number | null = null, rankGroup = '';
  const codes = isCounty ? districtCodes.filter(Boolean) : [gssCode];
  if (isCounty) {
    if (codes.length === 0) return null;
    let councils;
    try { councils = await getCouncilRefs(); } catch { return null; }
    const counties = rankByHours(countyTotals(councilTotals, councils, year));
    const r = counties.find((c) => c.area_gss_code === gssCode);
    if (!r) return null;
    mine = r; rank = r.rank; of = r.of; rankGroup = 'county council areas';
  } else {
    const ranked = rankByHours(councilTotals);
    const r = ranked.find((c) => c.area_gss_code === gssCode);
    if (!r) return null;
    mine = r; rank = r.rank; of = r.of;
    rankGroup = nation === 'England' ? 'council areas in England with storm overflows' : nation === 'Scotland' ? 'council areas in Scotland' : 'council areas in Northern Ireland';
  }

  let overflows: Overflow[];
  try { overflows = await getCouncilOverflows(codes, year); } catch { overflows = []; }
  overflows.sort((a, b) => (b.spill_hours ?? -1) - (a.spill_hours ?? -1) || (b.spill_count ?? -1) - (a.spill_count ?? -1));

  const companyHours = new Map<string, number>();
  for (const o of overflows) companyHours.set(o.company, (companyHours.get(o.company) ?? 0) + (o.spill_hours ?? 0));
  const companies = [...companyHours.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const offshore = overflows.filter((o) => o.placement === 'nearest' || o.placement === 'tidal').length;
  const noData = mine.overflows - mine.overflows_with_data;

  // Scotland: spill volume is published for overflows reported to SEPA.
  const showVolume = overflows.some((o) => o.volume_m3 != null);

  // Northern Ireland: earlier years from NI Water's workbook.
  const niYears = nation === 'Northern Ireland'
    ? totals.filter((t) => t.area_type === 'council' && t.area_gss_code === gssCode).sort((a, b) => a.year - b.year)
    : [];

  const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'nowrap' };
  const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}`, verticalAlign: 'top' };
  const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
  const TOP = 15;

  const overflowTable = (rows: Overflow[]) => (
    <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%', minWidth: '520px' }}>
        <thead>
          <tr>
            <th style={th}>Overflow</th>
            <th style={th}>Company</th>
            <th style={{ ...th, textAlign: 'right' }}>Spills</th>
            <th style={{ ...th, textAlign: 'right' }}>Hours</th>
            <th style={{ ...th, textAlign: 'right' }}>Monitor working</th>
            {showVolume && <th style={{ ...th, textAlign: 'right' }}>Volume (m³)</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={`${o.source}-${o.site_id}`}>
              <td style={td}>
                {o.site_name || o.site_name_operator || o.site_id}
                {o.receiving_water && <span style={{ display: 'block', fontSize: '15px' }}>into {o.receiving_water}</span>}
              </td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>{o.company}</td>
              <td style={tdNum}>{o.spill_count == null ? 'not reported' : fmtInt(o.spill_count)}</td>
              <td style={tdNum}>{o.spill_hours == null ? 'not reported' : fmtHours(o.spill_hours)}</td>
              <td style={tdNum}>{o.monitoring_pct == null ? 'n/a' : `${Math.round(o.monitoring_pct)}%`}</td>
              {showVolume && <td style={tdNum}>{o.volume_m3 == null ? 'n/a' : fmtInt(o.volume_m3)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const sourceLine = nation === 'England'
    ? `Source: Environment Agency, Event Duration Monitoring storm overflow annual return ${year}. Locations placed in council areas using Office for National Statistics boundaries. Contains public sector information licensed under the Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2026.`
    : nation === 'Scotland'
      ? `Source: Scottish Water, overflow event data (${year} figures), licensed under the Open Government Licence${companies.length > 1 ? '; Environment Agency storm overflow annual return for English water company overflows' : ''}. Locations placed in council areas using Office for National Statistics boundaries (contains OS data © Crown copyright and database right 2026).`
      : `Source: NI Water, Event Duration Monitor data (${year} figures). Council areas as given by NI Water.`;

  return (
    <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
      <h2 style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' }}>
        Sewage spills
      </h2>
      <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 4px' }}>
        <strong>{fmtInt(mine.spill_hours)} hours</strong> of sewage spills from {fmtInt(mine.overflows)} storm overflow{mine.overflows === 1 ? '' : 's'} in {year}
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 14px' }}>
        {[
          `${fmtInt(mine.spill_count)} spills counted`,
          `${fmtInt(mine.overflows_spilled)} of ${fmtInt(mine.overflows_with_data)} overflows with figures spilled at least once`,
          rank != null && of != null ? `${ordinal(rank)} most spill hours of ${of} ${rankGroup}` : null,
        ].filter(Boolean).join(' · ')}
      </p>

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 14px' }}>
        Storm overflows are run by water companies, not by the council. {companies.length === 1 ? 'The company responsible here is' : 'The companies responsible here are'}{' '}
        {companies.join(', ')}.
      </p>

      {/* The council page shows the top 15 and links the rest (fullListHref); /councils/[slug]/sewage shows them all. */}
      {overflows.length > 0 && (fullListHref || overflows.length <= TOP) && (
        <>
          <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>
            {overflows.length > TOP ? `The ${TOP} overflows with the longest spills` : 'Every overflow in this area'}
          </p>
          {overflowTable(overflows.slice(0, TOP))}
          {overflows.length > TOP && (
            <p style={{ fontFamily: MONO, fontSize: '15px', margin: '0 0 14px' }}>
              <Link href={fullListHref!} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All {fmtInt(overflows.length)} overflows in this area →</Link>
            </p>
          )}
        </>
      )}
      {overflows.length > TOP && !fullListHref && (
        <>
          <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px' }}>Every overflow in this area, longest spills first</p>
          {overflowTable(overflows)}
        </>
      )}

      {niYears.length > 1 && (
        <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px', width: '100%', maxWidth: '560px' }}>
          <caption style={{ textAlign: 'left', fontFamily: MONO, fontSize: '15px', color: INK, paddingBottom: '6px' }}>Year by year</caption>
          <thead>
            <tr>
              <th style={th}>Year</th>
              <th style={{ ...th, textAlign: 'right' }}>Overflows reporting</th>
              <th style={{ ...th, textAlign: 'right' }}>Spills</th>
              <th style={{ ...th, textAlign: 'right' }}>Hours</th>
            </tr>
          </thead>
          <tbody>
            {niYears.map((t) => (
              <tr key={t.year}>
                <td style={td}>{t.year}</td>
                <td style={tdNum}>{fmtInt(t.overflows_with_data)} of {fmtInt(t.overflows)}</td>
                <td style={tdNum}>{fmtInt(t.spill_count)}</td>
                <td style={tdNum}>{fmtInt(t.spill_hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: '0 0 6px' }}>
        {isCounty && 'Figures for this county are the total of its district councils. '}
        A storm overflow releases diluted sewage into a river or the sea when sewers are overloaded, usually in heavy rain. Hours are the total time all spills lasted.{' '}
        {nation === 'England' && 'Spills are counted the Environment Agency’s way: any discharge in the first 12 hours counts as one spill, and each further 24 hour block counts as another. '}
        {nation === 'Scotland' && 'Scottish Water counts each separate spill, and for some overflows publishes only spills longer than 15 minutes 30 seconds, so these figures are not directly comparable with England’s. Volume is published only for overflows reported to the Scottish Environment Protection Agency (SEPA). '}
        {noData > 0 && `${fmtInt(noData)} overflow${noData === 1 ? ' has' : 's have'} no figures for ${year}, so the totals may be lower than the true amount. `}
        {offshore > 0 && `${fmtInt(offshore)} overflow${offshore === 1 ? ' discharges' : 's discharge'} below the high-tide line or out at sea and ${offshore === 1 ? 'is' : 'are'} counted with the nearest council area. `}
        <a href="/sewage" style={{ color: INK, textDecoration: 'underline' }}>Compare every council, constituency and water company</a>.
      </p>
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: 0 }}>{sourceLine}</p>
    </section>
  );
}
