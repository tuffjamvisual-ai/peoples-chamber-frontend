// Shared data and styles for /council-areas/lowest-scores and its per-area pages (DRAFT, Cowork ENTRY 415 GO v3 and
// v3 ADDENDUM). Data: lowest-scores.json, written by the audit's scratch script (v3.py) from audit/worst-places-415/
// scores.csv v3; no database read. Every one of the 294 council areas has every measure (the v3 rule).
import type { CSSProperties } from 'react';
import data from './lowest-scores.json';

export type Measure = { key: string; label: string; figure: string; average: string; rank: number; of: number; period: string; score: number; topic: string; tie?: number };
// ONS police recorded crime (ENTRY 436 point 1): shown for information, not scored. own: the area's own figure; combined: one
// figure for this area and its neighbours together ('with'); missing: no reliable figure (Kent, ONS note 5).
export type Police = { status: 'own' | 'combined' | 'missing'; figure?: string; with?: string[]; humberside?: boolean; kent?: boolean };
// Counts behind the figures and their England comparison (Cowork ENTRY 484, owner approved 21 Nov 2026), from the same source
// files (audit e484/facts484.py): road casualties in 2025 (pct: the area's rate per resident against England's, in per cent),
// children in low income households, premises that can get gigabit broadband, and police recorded crimes.
export type Facts = {
  road?: { killed: number; serious: number; pct_vs_england: number };
  child_poverty?: { count: number };
  gigabit?: { count: number; premises: number };
  police?: { count: number; pct_vs_england: number };
};
export type Area = { rank: number; name: string; slug: string; type: string; score: number; topics: { label: string; score: number }[]; down: Measure[]; up: Measure[]; all: Measure[]; police: Police; facts: Facts; exact: number; towns: string[]; covers: string };  // exact: the unrounded overall score, which sets the order (ENTRY 493 (5), (6))
export type MeasureInfo = { key: string; label: string; unit: string; period: string; better: string; topic: string; source: string; href: string };

// No body or dataset names in the page text, only in the Sources fold (Cowork ENTRY 444 decisions, 21 Nov 2026 04:12, item 4):
// the period beside each figure is plain ('(April 2018 to March 2024)'), and the three units that named a body or survey
// read plainly. The data file keeps its own strings; only what the page shows changes here; the Sources fold keeps each full source.
const PLAIN_PERIOD: Record<string, string> = { crime: 'April 2018 to March 2024' };
const PLAIN_UNIT: Record<string, string> = {
  crime: 'the government\'s crime score (recorded violence, stalking and harassment, burglary, theft, criminal damage, public order and weapons offences, and antisocial behaviour incidents), shown as a rank among the 294 council areas, where 1st is the highest',
  obesity: 'per cent of adults overweight or obese (from a national survey)',
  road_safety: 'people killed or seriously injured on the roads in the area per 100,000 residents (serious injuries as officially adjusted)',
};
const plainMeasure = <T extends { key: string; period: string }>(m: T): T => (PLAIN_PERIOD[m.key] ? { ...m, period: PLAIN_PERIOD[m.key] } : m);

export const AREAS = (data.areas as Area[]).map((a) => ({ ...a, down: a.down.map(plainMeasure), up: a.up.map(plainMeasure), all: a.all.map(plainMeasure) }));
export const MEASURES = (data.measures as MeasureInfo[]).map((m) => ({ ...plainMeasure(m), unit: PLAIN_UNIT[m.key] ?? m.unit }));
export const TOPICS = data.topics as { key: string; label: string; measures: string[] }[];
export const RANKED = data.ranked as number;
export const MEASURE_COUNT = data.measureCount as number;
export const bySlug = new Map(AREAS.map((a) => [a.slug, a]));
// The housing topic holds one measure, fuel poverty, so it is named for it (Cowork ENTRY 493 item 7): 'Housing: fuel
// poverty' in headings, 'housing (fuel poverty)' in running text. The data keeps 'Housing' as the topic key.
// 'Includes Accrington, Great Harwood, Oswaldtwistle and Clayton-le-Moors. The score covers the whole borough.' (Cowork ENTRY
// 493 item 9, owner approved 16:45): the four largest built up areas whose largest share of 2021 residents is in the area
// (ONS BUA 2022 to LAD lookup and Census 2021 residents; audit/lowest-scores-493/towns493.py). A name that has 'and' in it
// takes a comma before the last 'and', so the list still reads clearly.
export function townsLine(a: Area): string {
  const t = a.towns;
  const covers = `The score covers the whole ${a.covers}.`;
  if (t.length < 2) return covers; // one town areas (Hull, Blackpool): only the coverage line (Cowork 16:56)
  const last = t.length > 1 ? `${t.slice(0, -1).join(', ')}${t.slice(0, -1).some((x) => x.includes(' and ')) || t[t.length - 1].includes(' and ') ? ',' : ''} and ${t[t.length - 1]}` : t[0];
  return `Includes ${last}. ${covers}`;
}
export const topicHeading = (label: string) => (label === 'Housing' ? 'Housing: fuel poverty' : label);
// The page headline (owner approved, Cowork ENTRY 493 item 1, 21 Nov 2026): the two lowest areas, built from the data,
// never written in by hand. Used by the page title and h1, its metadata and share image, and the homepage box.
export const HEADLINE = `${AREAS[0].name} and ${AREAS[1].name} score lowest in opengovt's ranking of living conditions in England`;
export const POLICE = data.police as { period: string; england: string };
// England's figure for every measure, from the same source files (ENTRY 484: compare with England throughout).
export const ENGLAND = data.england as {
  road: { killed: number; serious: number; year: string }; police: { count: number; per_1000: number; period: string };
  child_poverty: number; unemployment: number; fuel_poverty: number; life_expectancy: number; obesity: number; air: number;
  gigabit: number; indoor_4g: number; schools: number; basis?: Record<string, string>;
};
// The council area averages of the overall and topic scores (each area counting once).
export const AVG_SCORE = AREAS.reduce((s, a) => s + a.score, 0) / AREAS.length;
export const AVG_TOPIC = new Map(TOPICS.map((t, i) => [t.label, AREAS.reduce((s, a) => s + a.topics[i].score, 0) / AREAS.length]));

// One line per source address: measures from the same source (Ofcom) share it.
export const SOURCES = [...MEASURES.reduce((m, x) => {
  const prev = m.get(x.href);
  m.set(x.href, prev ? { ...prev, labels: [...prev.labels, x.label] } : { labels: [x.label], source: x.source, key: x.key });
  return m;
}, new Map<string, { labels: string[]; source: string; key: string }>())].map(([href, v]) => ({
  // The rank check against overall deprivation in How the scores work comes from the same publication as the crime
  // score; the page text no longer names it (ENTRY 444 decisions item 4), so its Sources line says so.
  label: v.key === 'crime'
    ? `${v.labels.join(' and ')}, and the check against overall deprivation in How the scores work: ${v.source} and overall rank`
    : `${v.labels.join(' and ')}: ${v.source}`,
  href,
}));
// Road safety is per resident: the population source joins the fold (it is not a measure, so it is not counted below).
// Sewage spills were removed from the index (owner, Cowork ENTRY 482 REVISED, 21 Nov 2026: they do not make a place worse to live).
export const SOURCE_COUNT = SOURCES.length;
SOURCES.push({ label: 'Population (for road safety per resident): ONS mid-2025 population estimates', href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates' });
// The police recorded crime figure on each area page is shown, not scored (ENTRY 436), so it is not counted either.
// Towns line under each area name (Cowork ENTRY 493 item 9): the two ONS sources it is built from.
SOURCES.push({ label: 'Towns under each area name: ONS, Built Up Area (2022) to Local Authority District (December 2022) lookup, and Output Area (2021) to Built Up Area to Local Authority District best fit lookup', href: 'https://geoportal.statistics.gov.uk/' });
SOURCES.push({ label: 'Residents of each built up area: ONS, Census 2021, TS001 Number of usual residents (by output area)', href: 'https://www.nomisweb.co.uk/sources/census_2021_bulk' });
SOURCES.push({ label: 'Police recorded crime (shown on each area page, not scored): ONS, Police force area data tables, year ending June 2026, tables C1 to C4 (Community Safety Partnerships), P1 and P3 (England); rates per 1,000 residents on ONS mid-2024 population estimates for the areas (Table C4) and mid-2025 for England (Table P3)', href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables' });
// One plain line for an area whose rank readers are likely to question (Cowork ENTRY 415 v3b PICTURES: Blackpool).
export const AREA_NOTES: Record<string, string> = {
  blackpool: 'Worst of the 294 on crime and life expectancy, 2nd worst on fuel poverty and 5th worst on GCSE results; clean air and better than average broadband and 4G lift only its environment score.',
};

export const INK = '#14100d';
export const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
export const ACCENT = '#7a1612';
export const SERIF = 'var(--font-special-elite), monospace';
export const MONO = 'var(--font-special-elite), monospace';
export const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
export const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
export const foldSummary: CSSProperties = { cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, fontSize: '15px', color: INK };

export { ordinal } from './ranks';
