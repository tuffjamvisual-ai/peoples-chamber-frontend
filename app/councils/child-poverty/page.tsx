// /councils/child-poverty: every council ranked by the share of children under 16 in low income families after housing
// costs (owner approved 18 Nov 2026, Cowork ENTRY 317), modelled on /councils/children-in-care. No new data: the
// council_child_poverty table the council pages read (DWP Children in Low Income Families, local area statistics).
// County councils are summed from their districts, weighted (count / percentage), as on the council pages. Two ranked
// lists (Cowork ENTRY 325): councils that run children's services (counties, unitaries, metropolitan and London boroughs,
// and the Welsh, Scottish and Northern Irish councils), the headline ranking as on /councils/children-in-care; and district
// councils, ranked among districts only, each naming its county. Country figures are their councils added up the
// same way (the table holds no country rows). Wording in lib/child-poverty.ts, shared with the council section.

import PageSources from '@/app/components/PageSources';
import { SubFold } from '@/app/components/PhoneFolds';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import '../../components/phone-table.css';
import { supabase } from '@/lib/supabase';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import {
  loadAllCouncils, loadLatestYear, combine, fyLabel, fmtNum, fmtPct, EXPLAINER, sourceLine, RANKING_PATH, FIRST_COMPARABLE_FYE, SOURCE_PAGE, SOURCE_LABEL,
} from '@/lib/child-poverty';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { COUNCIL_DATA_TAG } from '@/lib/page-reads';
import ChildPovertyTables, { type PovertyTableRow } from './ChildPovertyTable';

export const revalidate = false; // A16: rebuilt only when council data changes (council-data and table tags), or on a deploy

export const metadata: Metadata = {
  title: 'Child poverty by council',
  description: PAGE_DESCRIPTIONS[RANKING_PATH],
  alternates: { canonical: RANKING_PATH },
};

const INK = '#14100d';
const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
const ACCENT = '#7a1612';
const SERIF = 'var(--font-special-elite), monospace';
const MONO = 'var(--font-special-elite), monospace';
const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
const section: CSSProperties = { borderTop: `1px solid ${INK_HAIRLINE}`, paddingTop: '20px', marginBottom: '28px' };
const big: CSSProperties = { fontFamily: SERIF, fontSize: '20px', lineHeight: 1.4, color: INK, margin: '0 0 6px' };

const COUNTRIES: [string, RegExp][] = [['England', /^E/], ['Wales', /^W/], ['Scotland', /^S/], ['Northern Ireland', /^N/]];

export default async function ChildPovertyPage() {
  const latest = await loadLatestYear();
  if (latest == null) return null;
  const [rows, councilsRes] = await Promise.all([
    loadAllCouncils([...new Set([latest, FIRST_COMPARABLE_FYE])]),
    cachedQuery(['q:app/councils/child-poverty/page.tsx:councils'], [COUNCIL_DATA_TAG, ...tableTags('councils')], () => supabase.from('councils').select('gss_code, slug, short_name, name, type, parent_slug')),
  ]);
  if (councilsRes.error) throw new Error(`councils: ${councilsRes.error.message}`);
  const councils = (councilsRes.data ?? []) as { gss_code: string | null; slug: string; short_name: string | null; name: string; type: string; parent_slug: string | null }[];
  const held = new Set(rows.map((r) => r.council_gss_code));
  const release = rows[0]?.release_label ?? '';

  // A council's own code, or a county's districts' codes.
  const codesOf = (c: (typeof councils)[number]): string[] =>
    c.type === 'county' ? councils.filter((d) => d.parent_slug === c.slug && d.gss_code && held.has(d.gss_code)).map((d) => d.gss_code!) : c.gss_code && held.has(c.gss_code) ? [c.gss_code] : [];

  const countyBySlug = new Map(councils.filter((c) => c.type === 'county').map((c) => [c.slug, c.short_name || c.name]));
  const table: (PovertyTableRow & { district: boolean })[] = councils.flatMap((c) => {
    const codes = codesOf(c);
    if (!codes.length) return [];
    const ahc = combine(rows, codes, 'relative_ahc', latest);
    const bhc = combine(rows, codes, 'relative_bhc', latest);
    const bhcFirst = combine(rows, codes, 'relative_bhc', FIRST_COMPARABLE_FYE);
    if (!ahc && !bhc) return [];
    const change = bhc?.pct != null && bhcFirst?.pct != null ? Math.round((bhc.pct - bhcFirst.pct) * 10) / 10 : null;
    const district = c.type === 'district';
    return [{ code: c.gss_code ?? c.slug, name: c.short_name || c.name, slug: c.slug, county: c.type === 'county', district, countyName: district && c.parent_slug ? countyBySlug.get(c.parent_slug) ?? null : null, ahcPct: ahc?.pct ?? null, bhcPct: bhc?.pct ?? null, ahcCount: ahc?.count ?? null, change }];
  }).sort((a, b) => (b.ahcPct ?? -1) - (a.ahcPct ?? -1) || a.name.localeCompare(b.name));

  // Each country: every council of its own added up (districts, never their counties, so nobody is counted twice).
  const countries = COUNTRIES.map(([name, re]) => {
    const codes = [...held].filter((g) => re.test(g));
    return { name, ahc: combine(rows, codes, 'relative_ahc', latest), bhc: combine(rows, codes, 'relative_bhc', latest), first: combine(rows, codes, 'relative_bhc', FIRST_COMPARABLE_FYE) };
  }).filter((c) => c.ahc || c.bhc);
  const eng = countries.find((c) => c.name === 'England');
  const changeLabel = `Before housing costs, change since ${fyLabel(FIRST_COMPARABLE_FYE)} (percentage points)`;

  return (
    <OpenGovShell pageStamp="Child poverty">
      <BackLink fallbackHref="/councils" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '14px', color: INK, textDecoration: 'none', fontFamily: MONO, fontSize: '15px' }} />
      <article style={{ padding: 'clamp(15px, 2vw, 24px) 0', color: INK, fontFamily: SERIF }}>
        <header style={{ borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '14px 12px', textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: SERIF, fontSize: '15px', letterSpacing: '0.16em', fontVariant: 'small-caps', color: INK, marginBottom: '4px' }}>
            United Kingdom · Councils · Children
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 500, letterSpacing: '0.005em', lineHeight: 1.18, margin: 0 }}>
            Child Poverty by Council
          </h1>
        </header>

        {eng?.ahc && (
          <p style={big}>England, {fyLabel(latest)}: <strong>{fmtPct(eng.ahc.pct)} of children under 16</strong> lived in low income families after housing costs ({fmtNum(eng.ahc.count)} children); {fmtPct(eng.bhc?.pct ?? null)} before housing costs.</p>
        )}
        <p style={{ ...para, margin: '0 0 24px' }}>
          {countries.filter((c) => c.name !== 'England').map((c) => `${c.name}: ${fmtPct(c.ahc?.pct ?? null)} after housing costs, ${fmtPct(c.bhc?.pct ?? null)} before.`).join(' ')}
          {' '}Each country&rsquo;s figure is its councils added up.
        </p>

        <ChildPovertyTables changeLabel={changeLabel} lists={[
          {
            id: 'cpov-a', heading: `Councils, ${fyLabel(latest)}`, rows: table.filter((r) => !r.district),
            note: `County councils (the total of their district councils), unitary councils, metropolitan and London boroughs (in England these run children's services), and every council in Wales, Scotland and Northern Ireland. Ranked by the share of children after housing costs, highest first.${eng?.bhc?.pct != null && eng.first?.pct != null ? ` England before housing costs: ${fmtPct(eng.first.pct)} in ${fyLabel(FIRST_COMPARABLE_FYE)}, ${fmtPct(eng.bhc.pct)} in ${fyLabel(latest)}.` : ''} The change is shown before housing costs because the figure after housing costs is held only from ${fyLabel(latest - 1)}.`,
          },
          {
            id: 'cpov-b', heading: 'District councils', rows: table.filter((r) => r.district),
            note: 'District councils in England, ranked among districts only; each is part of the county council named beside it, whose figure in the list above is the total of its districts.',
          },
        ]} />

        <section style={section}>
          <h2 style={h2}>About these figures</h2>
          <SubFold label="Read about the figures">
          <p style={para}>{EXPLAINER}</p>
          <p style={{ fontFamily: MONO, fontSize: '15px', lineHeight: 1.6, color: INK, margin: 0, maxWidth: '46em' }}>{sourceLine(release)}</p>
          </SubFold>
        </section>
        <PageSources sources={[{ label: SOURCE_LABEL, href: SOURCE_PAGE }]} />
      </article>
    </OpenGovShell>
  );
}
