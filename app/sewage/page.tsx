// /sewage — storm overflow (sewage spill) figures for England, Scotland and
// Northern Ireland: national totals by water company, a postcode search, and league
// tables of council areas, county councils and constituencies.
// Data: lib/sewage.ts (tables from scripts/migrations/2026-10-12h-sewage-overflows.sql,
// loaded by scripts/import-sewage.js).
//
// Councils do not run storm overflows; water companies do. The page says so,
// and the tables are titled "most sewage spills", not council performance.

import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import LastUpdated from '../components/LastUpdated';
import SewageExplorer from './SewageExplorer';
import type { ExplorerRow, ExplorerTable } from './SewageExplorer';
import {
  getAreaTotals, latestYears, getCompanyAreaTotals, getSourceStats, getCouncilRefs, countyTotals, companyTotals, companiesByArea, fmtInt,
} from '@/lib/sewage';
import type { AreaTotal, SourceStats } from '@/lib/sewage';
import type { CSSProperties } from 'react';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Sewage spills by council, constituency and water company',
  description:
    'How long storm overflows spilled sewage in every council area and constituency in England, Scotland and Northern Ireland, from Environment Agency, Scottish Water and NI Water monitoring data.',
  alternates: { canonical: '/sewage' },
};

const INK = '#14100d';
const INK_SOFT = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'Special Elite, monospace';
const MONO = 'Special Elite, monospace';

const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };

export default async function SewagePage() {
  const totals = await getAreaTotals();
  const years = latestYears(totals);
  const eaYear = years.England;
  const niYear = years['Northern Ireland'];
  const swYear = years.Scotland;
  const councils = await getCouncilRefs();
  const slugByCode = new Map(councils.filter((c) => c.gss_code).map((c) => [c.gss_code as string, c.slug]));

  // Summaries (migration 2026-10-19k) for the year shown for each source, not every overflow.
  const shown = ([['EA', eaYear], ['NIW', niYear], ['SW', swYear]] as const)
    .filter(([, y]) => y != null).map(([source, year]) => ({ source, year: year as number }));
  const [companyRows, stats] = await Promise.all([getCompanyAreaTotals(shown), getSourceStats()]);
  const NO_STATS: SourceStats = { year: 0, source: 'EA', overflows: 0, overflows_with_data: 0, spill_count: 0, spill_hours: 0, tidal: 0, nearest: 0,
    unplaced_sites: [], sites_in_scotland: [], overflows_in_wales: 0, volume_m3: null, volume_overflows: 0 };
  const statsOf = (source: string, year: number | null) => stats.find((x) => x.source === source && x.year === year) ?? NO_STATS;
  const eaS = statsOf('EA', eaYear), niS = statsOf('NIW', niYear), swS = statsOf('SW', swYear);
  const companies = companyTotals(companyRows);
  const byArea = companiesByArea(companyRows);

  const toRow = (t: AreaTotal, href: string | null): ExplorerRow => ({
    code: t.area_gss_code, name: t.area_name, href,
    overflows: t.overflows, withData: t.overflows_with_data, spilled: t.overflows_spilled,
    spills: t.spill_count, hours: Math.round(t.spill_hours),
    companies: byArea[`${t.area_type}|${t.area_gss_code}`] ?? [],
  });
  const pick = (type: 'council' | 'constituency', nation: string, year: number | null, prefix: string) =>
    year == null ? [] : totals.filter((t) => t.area_type === type && t.nation === nation && t.year === year && t.area_gss_code.startsWith(prefix));
  const councilHref = (code: string) => { const s = slugByCode.get(code); return s ? `/councils/${s}` : null; };

  const tables: ExplorerTable[] = [];
  if (eaYear != null) {
    const engCouncils = pick('council', 'England', eaYear, 'E');
    tables.push({ id: 'eng-council', label: 'Council areas (England)', nation: 'England', year: eaYear, areaWord: 'council areas with storm overflows', rows: engCouncils.map((t) => toRow(t, councilHref(t.area_gss_code))) });
    const counties = countyTotals(engCouncils, councils, eaYear);
    const countyCompanies = (code: string) => {
      const districts = councils.filter((d) => d.parent_slug && councils.find((c) => c.gss_code === code)?.slug === d.parent_slug).map((d) => d.gss_code);
      const seen = new Map<string, number>();
      for (const r of companyRows) if (r.source === 'EA' && r.area_type === 'council' && districts.includes(r.area_gss_code)) seen.set(r.company, (seen.get(r.company) ?? 0) + r.spill_hours);
      return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
    };
    tables.push({ id: 'eng-county', label: 'County councils (England)', nation: 'England', year: eaYear, areaWord: 'county council areas (totals of their districts)', rows: counties.map((t) => ({ ...toRow(t, councilHref(t.area_gss_code)), companies: countyCompanies(t.area_gss_code) })) });
    tables.push({ id: 'eng-constituency', label: 'Constituencies (England)', nation: 'England', year: eaYear, areaWord: 'constituencies with storm overflows', rows: pick('constituency', 'England', eaYear, 'E').map((t) => toRow(t, null)) });
  }
  if (swYear != null) {
    tables.push({ id: 'sco-council', label: 'Council areas (Scotland)', nation: 'Scotland', year: swYear, areaWord: 'council areas', rows: pick('council', 'Scotland', swYear, 'S').map((t) => toRow(t, councilHref(t.area_gss_code))) });
    tables.push({ id: 'sco-constituency', label: 'Constituencies (Scotland)', nation: 'Scotland', year: swYear, areaWord: 'constituencies', rows: pick('constituency', 'Scotland', swYear, 'S').map((t) => toRow(t, null)) });
  }
  if (niYear != null) {
    tables.push({ id: 'ni-council', label: 'Council areas (Northern Ireland)', nation: 'Northern Ireland', year: niYear, areaWord: 'council areas', rows: pick('council', 'Northern Ireland', niYear, 'N').map((t) => toRow(t, councilHref(t.area_gss_code))) });
    tables.push({ id: 'ni-constituency', label: 'Constituencies (Northern Ireland)', nation: 'Northern Ireland', year: niYear, areaWord: 'constituencies', rows: pick('constituency', 'Northern Ireland', niYear, 'N').map((t) => toRow(t, null)) });
  }

  // National figures and the notes' counts and names, from sewage_source_stats.
  const ea = { length: eaS.overflows }, ni = { length: niS.overflows }, sw = { length: swS.overflows };
  const eaHours = eaS.spill_hours;
  const eaSpills = eaS.spill_count;
  const eaNoData = eaS.overflows - eaS.overflows_with_data;
  const niHours = niS.spill_hours;
  const niSpills = niS.spill_count;
  const niReporting = niS.overflows_with_data;
  const eaUnplaced = eaS.unplaced_sites;
  const eaOffshore = eaS.nearest;
  const eaTidal = eaS.tidal;
  const swHours = swS.spill_hours;
  const swSpills = swS.spill_count;
  const swReporting = swS.overflows_with_data;
  const swVolume = { length: swS.volume_overflows };
  const swVolumeTotal = swS.volume_m3 ?? 0;
  const eaInWales = { length: eaS.overflows_in_wales };
  const eaInScotland = eaS.sites_in_scotland;

  const th: CSSProperties = { textAlign: 'left', padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'nowrap' };
  const td: CSSProperties = { padding: '6px 10px 6px 0', borderBottom: `1px solid ${INK_HAIRLINE}` };
  const tdNum: CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <OpenGovShell pageStamp="Sewage">
      <BackLink
        fallbackHref="/"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }}
      />
      <article style={{ padding: 'clamp(8px, 2vw, 24px) 0', color: '#1a140e', fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK_SOFT, marginBottom: '4px' }}>
            England · Scotland · Northern Ireland · Storm overflows
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Sewage Spills
          </h1>
        </header>

        <p style={para}>
          A storm overflow releases diluted sewage into a river or the sea when sewers are overloaded, usually in heavy rain. Overflows are run by water and sewerage companies, which must monitor how often and for how long each one spills. Councils do not run them, so these tables show where spills happened, not how well a council performs.
        </p>

        {eaYear != null && (
          <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' }}>
            England, {eaYear}: <strong>{fmtInt(eaHours)} hours</strong> of spills from {fmtInt(ea.length)} storm overflows ({fmtInt(eaSpills)} spills counted)
          </p>
        )}
        {swYear != null && (
          <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' }}>
            Scotland, {swYear}: <strong>{fmtInt(swHours)} hours</strong> from {fmtInt(swReporting)} of {fmtInt(sw.length)} overflows with figures ({fmtInt(swSpills)} spills)
          </p>
        )}
        {niYear != null && (
          <p style={{ fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 24px' }}>
            Northern Ireland, {niYear}: <strong>{fmtInt(niHours)} hours</strong> from {fmtInt(niReporting)} of {fmtInt(ni.length)} overflows with figures ({fmtInt(niSpills)} spills)
          </p>
        )}

        <SewageExplorer tables={tables} />

        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
          <h2 style={h2}>Water companies</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '14px', color: INK, width: '100%', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={th}>Company</th>
                  <th style={{ ...th, textAlign: 'right' }}>Overflows</th>
                  <th style={{ ...th, textAlign: 'right' }}>Spills</th>
                  <th style={{ ...th, textAlign: 'right' }}>Hours</th>
                  <th style={{ ...th, textAlign: 'right' }}>Spilled</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={`${c.nation}-${c.company}`}>
                    <td style={td}>{c.company}{c.nation === 'Northern Ireland' ? ` (Northern Ireland, ${niYear})` : c.nation === 'Scotland' ? ` (Scotland, ${swYear})` : ''}</td>
                    <td style={tdNum}>{fmtInt(c.overflows)}</td>
                    <td style={tdNum}>{fmtInt(c.spills)}</td>
                    <td style={tdNum}>{fmtInt(c.hours)}</td>
                    <td style={tdNum}>{c.withData ? Math.round((c.spilled / c.withData) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ ...para, fontSize: '14px', marginTop: '10px' }}>
            Dwr Cymru Welsh Water’s figures here are only the overflows listed in the Environment Agency’s return for England.
          </p>
        </section>

        <section style={{ borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' }}>
          <h2 style={h2}>How these figures are made</h2>
          <p style={para}>
            England: every storm overflow in the Environment Agency’s {eaYear} annual return ({fmtInt(ea.length)} overflows). Each one is placed in its council area and Westminster constituency from the grid reference of its outlet, using Office for National Statistics boundaries (July 2024 constituencies, May 2026 council areas). {fmtInt(eaTidal)} outlets lie below the high-tide line and are placed using the boundaries that extend out to sea. {fmtInt(eaOffshore)} lie further out and are counted with the nearest council area and constituency within 15 km; two of these were checked by hand and placed by the location of their treatment works instead (Ryde, Isle of Wight, and Hayle, Cornwall), because the nearest shore was a different area.
            {eaUnplaced.length > 0 && ` ${fmtInt(eaUnplaced.length)} overflow${eaUnplaced.length === 1 ? ' could not be placed because its published grid reference is not valid' : 's could not be placed because their published grid references are not valid'} (${eaUnplaced.join(', ')}); ${eaUnplaced.length === 1 ? 'it is' : 'they are'} included in the national and company totals but not in any area.`}
            {eaInScotland.length > 0 && ` ${fmtInt(eaInScotland.length)} overflow${eaInScotland.length === 1 ? ' in the English return sits' : 's in the English return sit'} just over the border in Scotland (${eaInScotland.join(', ')}); ${eaInScotland.length === 1 ? 'it is' : 'they are'} counted in the Scottish tables with Scottish Water’s overflows.`}
            {eaInWales.length > 0 && ` ${fmtInt(eaInWales.length)} overflow${eaInWales.length === 1 ? ' in the English return sits' : 's in the English return sit'} in Wales; ${eaInWales.length === 1 ? 'it is' : 'they are'} in the company totals but not in any table until Welsh figures are added.`}
          </p>
          <p style={para}>
            Hours are the total time all spills lasted. “Spilled” uses only overflows with figures for the year, so an overflow with no monitoring data is not counted as one that did not spill. Spills are counted the Environment Agency’s way: any discharge in the first 12 hours counts as one spill, and each further 24 hour block counts as another. {fmtInt(eaNoData)} English overflows have no figures for {eaYear}, so some totals may be lower than the true amount.
          </p>
          {swYear != null && (
            <p style={para}>
              Scotland: Scottish Water’s overflow event data for {swYear}, {fmtInt(sw.length)} overflows, {fmtInt(swReporting)} of them with figures (the others had no monitoring data for the year). Each one is placed from its coordinates using the same boundaries as England. Scottish Water counts each separate spill, not the Environment Agency’s 12 and 24 hour blocks, and for some overflows publishes only spills longer than 15 minutes 30 seconds, so Scotland is shown in its own tables, not ranked against England. Volume is published only for overflows that report to the Scottish Environment Protection Agency (SEPA): {fmtInt(swVolumeTotal)} cubic metres from {fmtInt(swVolume.length)} overflows in {swYear}. Scottish Water’s figures for earlier years cover far fewer overflows, so the tables use {swYear}.
            </p>
          )}
          <p style={para}>
            Northern Ireland: NI Water’s Event Duration Monitor data, with the council area and constituency as NI Water gives them. In {niYear}, {fmtInt(niReporting)} of {fmtInt(ni.length)} overflows reported figures; the rest are counted as overflows but add nothing to the totals. NI Water’s figures are recorded differently from England’s and Scotland’s, so each nation is shown in its own tables, not ranked together.
          </p>
          <p style={para}>
            Wales is not included yet. Natural Resources Wales and Dwr Cymru Welsh Water publish their own figures, which Open Govt is working to add.
          </p>
          <p style={{ fontFamily: MONO, fontSize: '14px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>
            Sources: Environment Agency, Event Duration Monitoring storm overflow annual return {eaYear}, and Office for National Statistics boundaries, both licensed under the Open Government Licence v3.0 (contains OS data © Crown copyright and database right 2026). Scottish Water, Reported Overflow Event Data to SEPA and Non-Reported Overflow Event Data (2026), licensed under the Open Government Licence. NI Water, Event Duration Monitor data, as published by NI Water.
          </p>
        </section>
      </article>
      <LastUpdated sourceKey="sewage_overflows" />
    </OpenGovShell>
  );
}
