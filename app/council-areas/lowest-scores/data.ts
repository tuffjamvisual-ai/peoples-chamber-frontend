// Shared data and styles for /council-areas/lowest-scores and its per-area pages (DRAFT, Cowork ENTRY 415 GO v3 and
// v3 ADDENDUM). Data: lowest-scores.json, written by the audit's scratch script (v3.py) from audit/worst-places-415/
// scores.csv v3; no database read. Every one of the 294 council areas has every measure (the v3 rule).
import type { CSSProperties } from 'react';
import data from './lowest-scores.json';

export type Measure = { key: string; label: string; figure: string; average: string; rank: number; of: number; period: string; score: number; topic: string; tie?: number };
// ONS police recorded crime (ENTRY 436 point 1): shown for information, not scored. own: the area's own figure; combined: one
// figure for this area and its neighbours together ('with'); missing: no reliable figure (Kent, ONS note 5).
export type Police = { status: 'own' | 'combined' | 'missing'; figure?: string; with?: string[]; humberside?: boolean; kent?: boolean };
export type Area = { rank: number; name: string; slug: string; type: string; score: number; topics: { label: string; score: number }[]; down: Measure[]; up: Measure[]; all: Measure[]; police: Police };
export type MeasureInfo = { key: string; label: string; unit: string; period: string; better: string; topic: string; source: string; href: string };

export const AREAS = data.areas as Area[];
export const MEASURES = data.measures as MeasureInfo[];
export const TOPICS = data.topics as { key: string; label: string; measures: string[] }[];
export const RANKED = data.ranked as number;
export const MEASURE_COUNT = data.measureCount as number;
export const bySlug = new Map(AREAS.map((a) => [a.slug, a]));
export const POLICE = data.police as { period: string; england: string };
// The council area averages of the overall and topic scores (each area counting once).
export const AVG_SCORE = AREAS.reduce((s, a) => s + a.score, 0) / AREAS.length;
export const AVG_TOPIC = new Map(TOPICS.map((t, i) => [t.label, AREAS.reduce((s, a) => s + a.topics[i].score, 0) / AREAS.length]));

// One line per source address: measures from the same source (Ofcom) share it.
export const SOURCES = [...MEASURES.reduce((m, x) => {
  const prev = m.get(x.href);
  m.set(x.href, prev ? { ...prev, labels: [...prev.labels, x.label] } : { labels: [x.label], source: x.source });
  return m;
}, new Map<string, { labels: string[]; source: string }>())].map(([href, v]) => ({ label: `${v.labels.join(' and ')}: ${v.source}`, href }));
// Road safety and sewage are per resident: the population source joins the fold (it is not a measure, so it is not counted below).
export const SOURCE_COUNT = SOURCES.length;
SOURCES.push({ label: 'Population (for road safety and sewage per resident): ONS mid-2025 population estimates', href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates' });
// The police recorded crime figure on each area page is shown, not scored (ENTRY 436), so it is not counted either.
SOURCES.push({ label: 'Police recorded crime (shown on each area page, not scored): ONS, Police force area data tables, year ending June 2026, tables C1 to C4 (Community Safety Partnerships) and P3 (England)', href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/crimeandjustice/datasets/policeforceareadatatables' });
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
