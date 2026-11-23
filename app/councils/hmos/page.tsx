// /councils/hmos: houses in multiple occupation in every council area (owner approved 19 Nov 2026, Cowork ENTRY 362).
// Totals for England, Wales and Scotland, each labelled with its own measure and date, and never added into one UK total;
// a box to find a council by name, town or postcode (the /councils lookup, opening the council's Housing tab); then every
// council, grouped by region and county (England, from LAHS's region) and by nation, sortable by any column (SortTables),
// three rows shown on phones and tablets then "Show all" (NoJsPager and the phone script, the site's list rule). Data:
// council_hmos (migration 2026-11-19a); wording in lib/hmos.ts.
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import CouncilSearch from '../../components/CouncilSearch';
import NoJsPager from '@/app/components/NoJsPager';
import { SubFold } from '@/app/components/PhoneFolds';
import PageSources from '@/app/components/PageSources';
import '../../components/phone-table.css';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import {
  loadLatest, count, fy, marchDate, share, perThousand, perThousandText, NATIONAL_PATH, SOURCE, OGL, OGL_URL, DIFFERENT_MEASURES,
  DEFINITION_2018, ENGLAND_ESTIMATE_NOTE, WALES_NOTE, SCOTLAND_NOTE, NI_NOTE, OVER_100_NOTE, NO_FIGURE, type HmoRow,
} from '@/lib/hmos';
import SortTables from './SortTables';

export const revalidate = false; // A16: rebuilt only when council data changes (council-data and table tags), or on a deploy

export const metadata: Metadata = {
  title: 'HMOs by council, town and postcode',
  description: PAGE_DESCRIPTIONS[NATIONAL_PATH],
  alternates: { canonical: NATIONAL_PATH },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const h3: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', color: INK, fontWeight: 'bold', margin: '18px 0 8px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.7, color: INK, margin: '0 0 12px', maxWidth: '46em' };
const th: CSSProperties = { textAlign: 'right', padding: '6px 8px', borderBottom: `1px solid ${INK}`, fontWeight: 'normal', whiteSpace: 'normal', fontSize: '13px' };
const td: CSSProperties = { padding: '6px 8px', borderBottom: `1px solid ${INK_HAIRLINE}`, textAlign: 'right', whiteSpace: 'nowrap' };
const section: CSSProperties = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' };

type Council = { gss_code: string; slug: string; name: string; parent_slug: string | null };
type Item = { row: HmoRow; slug: string; name: string };

// One table: England's columns, or Wales's, or Scotland's.
function Table({ id, items, nation }: { id: string; items: Item[]; nation: HmoRow['nation'] }) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const cols: { label: string; value: (r: HmoRow) => number | null; text: (r: HmoRow) => string }[] =
    nation === 'England' ? [
      { label: 'Estimated HMOs', value: (r) => r.estimated, text: (r) => count(r.estimated) },
      { label: 'Needing a mandatory licence', value: (r) => r.licensable, text: (r) => count(r.licensable) },
      { label: 'Licensed', value: (r) => r.licensed, text: (r) => count(r.licensed) },
      { label: 'Licensed %', value: (r) => share(r.licensed, r.licensable), text: (r) => { const p = share(r.licensed, r.licensable); return p == null ? NO_FIGURE : `${p}%`; } },
      { label: 'Per 1,000 homes', value: (r) => perThousand(r.estimated, r.homes), text: (r) => perThousandText(perThousand(r.estimated, r.homes)) },
    ] : nation === 'Wales' ? [
      { label: 'Estimated HMOs', value: (r) => r.estimated, text: (r) => count(r.estimated) },
      { label: 'Known HMOs', value: (r) => r.known, text: (r) => count(r.known) },
      { label: 'HMO licences', value: (r) => r.licensed, text: (r) => count(r.licensed) },
      { label: 'Per 1,000 homes', value: (r) => perThousand(r.estimated, r.homes), text: (r) => perThousandText(perThousand(r.estimated, r.homes)) },
    ] : [
      { label: 'Licences in force', value: (r) => r.licensed, text: (r) => count(r.licensed) },
      { label: 'Per 1,000 homes', value: (r) => perThousand(r.licensed, r.homes), text: (r) => perThousandText(perThousand(r.licensed, r.homes)) },
    ];
  return (
    <NoJsPager id={id} count={sorted.length} rows="> tbody > tr" size={25} always cards={['Council', ...cols.map((c) => c.label)]} title={1}>
      <table className="pt-cards hmo-table" style={{ borderCollapse: 'collapse', fontFamily: MONO, fontSize: '15px', color: INK, width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" data-sort="0" style={{ ...th, textAlign: 'left' }}>Council</th>
            {cols.map((c, i) => <th key={c.label} scope="col" data-sort={i + 1} style={th}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((it) => (
            <tr key={it.row.ons_code}>
              <td data-v={it.name} style={{ ...td, textAlign: 'left', whiteSpace: 'normal' }}>
                <Link href={`/councils/${it.slug}#housing`} style={{ color: INK, textDecoration: 'underline' }}>{it.name}</Link>
              </td>
              {cols.map((c) => { const v = c.value(it.row); return <td key={c.label} data-v={v == null ? '' : String(v)} style={td}>{c.text(it.row)}</td>; })}
            </tr>
          ))}
        </tbody>
      </table>
    </NoJsPager>
  );
}

export default async function HmosPage() {
  const [{ rows, years }, councilsRes] = await Promise.all([
    loadLatest(),
    cachedQuery(['q:app/councils/hmos/page.tsx:councils'], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('gss_code, slug, name, short_name, parent_slug').not('gss_code', 'is', null).limit(2000)),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  const all = (councilsRes.data ?? []) as (Council & { short_name: string | null })[];
  const byCode = new Map(all.map((c) => [c.gss_code, c]));
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const items = (nation: HmoRow['nation']) => rows.filter((r) => r.nation === nation && r.area_level === 'council')
    .map((row) => { const c = byCode.get(row.ons_code); return c ? { row, slug: c.slug, name: c.short_name || c.name, parent: c.parent_slug } : null; })
    .filter((x): x is Item & { parent: string | null } => !!x);
  const nationRow = (code: string) => rows.find((r) => r.ons_code === code);
  const eng = nationRow('E92000001'), wal = nationRow('W92000004'), sco = nationRow('S92000003');

  // England by region, then by county: councils with no county first, then each county's districts.
  const england = items('England');
  const regions = [...new Set(england.map((i) => i.row.region ?? 'England'))].sort();

  const card = (value: string, label: string, sub: string) => (
    <div style={{ border: `1px solid ${INK_HAIRLINE}`, padding: '8px 10px', fontFamily: MONO, color: INK }}>
      <div style={{ fontSize: '24px', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '15px', lineHeight: 1.35, marginTop: '4px' }}>{label}</div>
      <div style={{ fontSize: '13px', lineHeight: 1.35, marginTop: '6px' }}>{sub}</div>
    </div>
  );

  return (
    <OpenGovShell>
      <BackLink fallbackHref="/councils" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }} />
      <style>{`.hmo-sort { font: inherit; color: inherit; background: none; border: 0; padding: 0; text-align: inherit; cursor: pointer; text-decoration: underline; } .hmo-fold > summary { cursor: pointer; text-decoration: underline; } .hmo-fold { margin: 0 0 6px; } .hmo-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 10px; margin: 0 0 12px; }`}</style>
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: MONO }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', marginBottom: '4px' }}>Councils · Housing</div>
          <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, lineHeight: 1.18, margin: 0 }}>Houses in Multiple Occupation by Council</h1>
        </header>

        <div id="find" data-main-action style={{ maxWidth: '46em', marginBottom: '18px' }}>
          <CouncilSearch hash="#housing" placeholder="Postcode, town or council" />
        </div>

        <section style={section}>
          <h2 style={h2}>The nations</h2>
          <div className="hmo-cards">
            {eng && card(count(eng.estimated), 'England: estimated HMOs', `Council estimates, ${marchDate(eng.year)}`)}
            {eng && card(count(eng.licensed), 'England: with a mandatory licence', `${share(eng.licensed, eng.licensable)} per cent of ${count(eng.licensable)} needing one, ${marchDate(eng.year)}`)}
            {wal && card(count(wal.estimated), 'Wales: estimated HMOs', `${count(wal.licensed)} licences, ${marchDate(wal.year)}`)}
            {sco && card(count(sco.licensed), 'Scotland: licences in force', `All HMOs, ${marchDate(sco.year)}`)}
          </div>
          <p style={para}>The nations count different things, so their figures must not be added into one UK total.</p>

        </section>

        <section style={section} id="england">
          <h2 style={h2}>England, {fy(years.England ?? '2025-03-31')}</h2>

          {regions.map((reg) => {
            const inReg = england.filter((i) => (i.row.region ?? 'England') === reg);
            const own = inReg.filter((i) => !i.parent);
            const counties = [...new Set(inReg.filter((i) => i.parent).map((i) => i.parent as string))].sort();
            const rid = reg.toLowerCase().replace(/[^a-z]+/g, '-');
            return (
              <details key={reg} className="hmo-fold">
                <summary style={{ ...h3, margin: '6px 0' }}>{reg} ({inReg.length} councils)</summary>
                {own.length > 0 && <Table id={`hmo-${rid}`} items={own} nation="England" />}
                {/* Phones (owner standing rule, Cowork ENTRY 539 and 542, 23 Nov 2026): each county's councils in a fold naming
                    the county and its count, so opening a region does not open every council at once; every council stays in
                    the page. From the phone width up the fold is not there and the page is as before. */}
                {counties.map((cs) => {
                  const inCounty = inReg.filter((i) => i.parent === cs);
                  return (
                    <SubFold key={cs} label={`${bySlug.get(cs)?.name ?? cs} (${inCounty.length} ${inCounty.length === 1 ? 'council' : 'councils'})`}>
                      <div>
                        <h4 style={{ ...h3, fontSize: '15px', textTransform: 'none', letterSpacing: 0, margin: '14px 0 6px' }}>
                          <Link href={`/councils/${cs}#housing`} style={{ color: INK }}>{bySlug.get(cs)?.name ?? cs}</Link>
                        </h4>
                        <Table id={`hmo-${rid}-${cs}`} items={inCounty} nation="England" />
                      </div>
                    </SubFold>
                  );
                })}
              </details>
            );
          })}
        </section>

        <section style={section} id="wales">
          <h2 style={h2}>Wales and Scotland</h2>
          <details className="hmo-fold"><summary style={{ ...h3, margin: '6px 0' }}>Wales, {fy(years.Wales ?? '2025-03-31')} ({items('Wales').length} councils)</summary><Table id="hmo-wales" items={items('Wales')} nation="Wales" /></details>
          <details className="hmo-fold" id="scotland"><summary style={{ ...h3, margin: '6px 0' }}>Scotland, {marchDate(years.Scotland ?? '2026-03-31')} ({items('Scotland').length} councils)</summary><Table id="hmo-scotland" items={items('Scotland')} nation="Scotland" /></details>
        </section>
        <details className="hmo-fold" style={{ marginTop: '8px' }}>
          <summary style={h2}>How the nations’ figures differ</summary>
          <p style={para}>{DIFFERENT_MEASURES}</p>
          <p style={para}>The true number of HMOs is not known: {ENGLAND_ESTIMATE_NOTE.charAt(0).toLowerCase() + ENGLAND_ESTIMATE_NOTE.slice(1)}</p>
          <p style={para}>England: {DEFINITION_2018} {OVER_100_NOTE}</p>
          <p style={para}>Wales: {WALES_NOTE}</p>
          <p style={para}>Scotland: {SCOTLAND_NOTE} {sco?.homes_year ? `Homes figures are for ${sco.homes_year.slice(0, 4)}.` : ''}</p>
          <p style={para}>Northern Ireland: {NI_NOTE}</p>
        </details>
      </article>
      <SortTables selector=".hmo-table" />
      <PageSources sources={[
        { label: `${SOURCE.England.label}, ${marchDate(years.England ?? '2025-03-31')}`, href: SOURCE.England.href },
        { label: `${SOURCE.Wales.label}, ${marchDate(years.Wales ?? '2025-03-31')}`, href: SOURCE.Wales.href },
        { label: `${SOURCE.Scotland.label}, licences ${marchDate(years.Scotland ?? '2026-03-31')}${sco?.homes_year ? `, homes ${sco.homes_year.slice(0, 4)}` : ''}`, href: SOURCE.Scotland.href },
      ]}>
        <a href={OGL_URL} style={{ color: INK }}>{OGL}</a>
      </PageSources>
    </OpenGovShell>
  );
}
