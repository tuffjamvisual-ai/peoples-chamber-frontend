// Shared data and styles for /council-areas/lowest-scores and its per-area pages (DRAFT, Cowork ENTRY 415 GO v3 and
// v3 ADDENDUM). Data: lowest-scores.json, written by the audit's scratch script (v3.py) from audit/worst-places-415/
// scores.csv v3; no database read. Every one of the 294 council areas has every measure (the v3 rule).
import type { CSSProperties } from 'react';
import data from './lowest-scores.json';

export type Measure = { key: string; label: string; figure: string; average: string; rank: number; of: number; period: string; score: number; topic: string };
export type Area = { rank: number; name: string; slug: string; type: string; score: number; topics: { label: string; score: number }[]; down: Measure[]; up: Measure[]; all: Measure[] };
export type MeasureInfo = { key: string; label: string; unit: string; period: string; better: string; topic: string; source: string; href: string };

export const AREAS = data.areas as Area[];
export const MEASURES = data.measures as MeasureInfo[];
export const TOPICS = data.topics as { key: string; label: string; measures: string[] }[];
export const RANKED = data.ranked as number;
export const MEASURE_COUNT = data.measureCount as number;
export const bySlug = new Map(AREAS.map((a) => [a.slug, a]));

// One line per source address: measures from the same source (Ofcom) share it.
export const SOURCES = [...MEASURES.reduce((m, x) => {
  const prev = m.get(x.href);
  m.set(x.href, prev ? { ...prev, labels: [...prev.labels, x.label] } : { labels: [x.label], source: x.source });
  return m;
}, new Map<string, { labels: string[]; source: string }>())].map(([href, v]) => ({ label: `${v.labels.join(' and ')}: ${v.source}`, href }));
// Road safety and sewage are per resident: the population source joins the fold (it is not a measure, so it is not counted below).
export const SOURCE_COUNT = SOURCES.length;
SOURCES.push({ label: 'Population (for road safety and sewage per resident): ONS mid-2025 population estimates', href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates' });
// One plain line for an area whose rank readers are likely to question (Cowork ENTRY 415 v3b PICTURES: Blackpool).
export const AREA_NOTES: Record<string, string> = {
  blackpool: 'Worst of the 294 on crime and life expectancy, 2nd on fuel poverty and 5th on GCSE results; clean air and better than average broadband and 4G lift only its environment score.',
};

export const INK = '#14100d';
export const INK_HAIRLINE = 'rgba(20,16,13,0.2)';
export const ACCENT = '#7a1612';
export const SERIF = 'var(--font-special-elite), monospace';
export const MONO = 'var(--font-special-elite), monospace';
export const h2: CSSProperties = { fontFamily: MONO, fontSize: '15px', letterSpacing: '0.22em', textTransform: 'uppercase', color: ACCENT, fontWeight: 'bold', margin: '0 0 14px' };
export const para: CSSProperties = { fontFamily: MONO, fontSize: '15px', lineHeight: 1.75, color: INK, margin: '0 0 14px', maxWidth: '46em' };
export const foldSummary: CSSProperties = { cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, fontSize: '15px', color: INK };

export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};
