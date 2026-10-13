// /sewage — storm overflow (sewage spill) figures for England and Northern
// Ireland: national totals by water company, a postcode search, and league
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
  getAreaTotals, latestYears, getAllOverflows, getCouncilRefs, countyTotals, companyTotals, companiesByArea, fmtInt,
} from '@/lib/sewage';
import type { AreaTotal, Overflow } from '@/lib/sewage';
import type { CSSProperties } from 'react';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Sewage spills by council, constituency and water company',
  description:
    'How long storm overflows spilled sewage in every council area and constituency in England and Northern Ireland, from Environment Agency and NI Water monitoring data.',
  alternates: { canonical: '/sewage' },
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
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
  const councils = await getCouncilRefs();
  const slugByCode = new Map(councils.filter((c) => c.gss_code).map((c) => [c.gss_code as string, c.slug]));

  const yearsToRead = [...new Set([eaYear, niYear].filter((y): y is number => y != null))];
  const overflowSets = await Promise.all(yearsToRead.map((y) => getAllOverflows(y)));
  const ea: Overflow[] = overflowSets.flat().filter((o) => o.source === 'EA' && o.year === eaYear);
  const ni: Overflow[] = overflowSets.flat().filter((o) => o.source === 'NIW' && o.year === niYear);
  const companies = companyTotals([...ea, ...ni]);
  const byArea = companiesByArea([...ea, ...ni]);

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
      for (const o of ea) if (o.council_gss_code && districts.includes(o.council_gss_code)) seen.set(o.company, (seen.get(o.company) ?? 0) + (o.spill_hours ?? 0));
      return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    };
    tables.push({ id: 'eng-county', label: 'County councils (England)', nation: 'England', year: eaYear, areaWord: 'county council areas (totals of their districts)', rows: counties.map((t) => ({ ...toRow(t, councilHref(t.area_gss_code)), companies: countyCompanies(t.area_gss_code) })) });
    tables.push({ id: 'eng-constituency', label: 'Constituencies (England)', nation: 'England', year: eaYear, areaWord: 'constituencies with storm overflows', rows: pick('constituency', 'England', eaYear, 'E').map((t) => toRow(t, null)) });
  }
  if (niYear != null) {
    tables.push({ id: 'ni-council', label: 'Council areas (Northern Ireland)', nation: 'Northern Ireland', year: niYear, areaWord: 'council areas', rows: pick('council', 'Northern Ireland', niYear, 'N').map((t) => toRow(t, councilHref(t.area_gss_code))) });
    tables.push({ id: 'ni-constituency', label: 'Constituencies (Northern Ireland)', nation: 'Northern Ireland', year: niYear, areaWord: 'constituencies', rows: pick('constituency', 'Northern Ireland', niYear, 'N').map((t) => toRow(t, null)) });
  }

  const sum = (rows: Overflow[], f: (o: Overflow) => number) => rows.reduce((t, o) => t + f(o), 0);
  const eaHours = sum(ea, (o) => o.spill_hours ?? 0);
  const eaSpills = sum(ea, (o) => o.spill_count ?? 0);
  const eaNoData = ea.filter((o) => o.spill_count == null).length;
  const niHours = sum(ni, (o) => o.spill_hours ?? 0);
  const niSpills = sum(ni, (o) => o.spill_count ?? 0);
  const niReporting = ni.filter((o) => o.spill_count != null).length;
  const eaUnplaced = ea.filter((o) => o.placement === 'unplaced');
  const eaOffshore = ea.filter((o) => o.placement === 'nearest').length;
  const eaTidal = ea.filter((o) => o.placement === 'tidal').length;
  const crossBorder = ea.filter((o) => o.council_gss_code && !o.council_gss_code.startsWith('E'));

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
            England · Northern Ireland · Storm overflows
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
                  <th style={{ ...th, textAlign: 'right' }}>Hours per overflow</th>
                  <th style={{ ...th, textAlign: 'right' }}>Spilled</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={`${c.nation}-${c.company}`}>
                    <td style={td}>{c.company}{c.nation === 'Northern Ireland' ? ` (Northern Ireland, ${niYear})` : ''}</td>
                    <td style={tdNum}>{fmtInt(c.overflows)}</td>
                    <td style={tdNum}>{fmtInt(c.spills)}</td>
                    <td style={tdNum}>{fmtInt(c.hours)}</td>
                    <td style={tdNum}>{fmtInt(c.overflows ? c.hours / c.overflows : 0)}</td>
                    <td style={tdNum}>{c.overflows ? Math.round((c.spilled / c.overflows) * 100) : 0}%</td>
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
            {eaUnplaced.length > 0 && ` ${fmtInt(eaUnplaced.length)} overflow${eaUnplaced.length === 1 ? ' could not be placed because its published grid reference is not valid' : 's could not be placed because their published grid references are not valid'} (${eaUnplaced.map((o) => o.site_name || o.site_id).join(', ')}); ${eaUnplaced.length === 1 ? 'it is' : 'they are'} included in the national and company totals but not in any area.`}
            {crossBorder.length > 0 && ` ${fmtInt(crossBorder.length)} overflow${crossBorder.length === 1 ? ' in the English return sits' : 's in the English return sit'} just over the border in Wales or Scotland; ${crossBorder.length === 1 ? 'it is' : 'they are'} in the company totals but not in the tables, which cover England only.`}
          </p>
          <p style={para}>
            Hours are the total time all spills lasted. Spills are counted the Environment Agency’s way: any discharge in the first 12 hours counts as one spill, and each further 24-hour block counts as another. {fmtInt(eaNoData)} English overflows have no figures for {eaYear}, so some totals may be lower than the true amount.
          </p>
          <p style={para}>
            Northern Ireland: NI Water’s Event Duration Monitor data, with the council area and constituency as NI Water gives them. In {niYear}, {fmtInt(niReporting)} of {fmtInt(ni.length)} overflows reported figures; the rest are counted as overflows but add nothing to the totals. NI Water’s figures are recorded differently from England’s, so the two nations are shown in separate tables, not ranked together.
          </p>
          <p style={para}>
            Wales and Scotland are not included yet. Natural Resources Wales, Dwr Cymru Welsh Water and Scottish Water publish their own figures, which Open Govt is working to add.
          </p>
          <p style={{ fontFamily: MONO, fontSize: '13px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>
            Sources: Environment Agency, Event Duration Monitoring storm overflow annual return {eaYear}, and Office for National Statistics boundaries, both licensed under the Open Government Licence v3.0 (contains OS data © Crown copyright and database right 2026). NI Water, Event Duration Monitor data, as published by NI Water.
          </p>
        </section>
      </article>
      <LastUpdated sourceKey="sewage_overflows" />
    </OpenGovShell>
  );
}
