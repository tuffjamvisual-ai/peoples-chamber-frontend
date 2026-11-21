// One short plain sentence on every figure (Cowork ENTRY 436 point 2; the templates Cowork accepted in
// audit/worst-places-415/EXPLAINERS.md, with the ENTRY 436 GO answers). Owner rules: no hyphens, 'per cent', no time words,
// 'council area', never 'town'. The figure and average strings come from the page data; only their numbers are used here.
import type { Area, Measure } from './data';
import { POLICE, AVG_SCORE, ENGLAND } from './data';
import { cap, ordinal, plainRank, plainScoreRank } from './ranks';

const num = (s: string) => s.split(' ')[0];
const n = (x: number) => x.toLocaleString('en-GB');

// England's figure beside each measure (Cowork ENTRY 484, owner approved 21 Nov 2026): per cent measures in percentage
// points, never a percentage of a percentage; life expectancy in years; GCSE results in Attainment 8 points; road safety as
// the area's rate per resident against England's, in per cent. The crime score has no England figure (it is a rank).
const PCT = ['child_poverty', 'unemployment', 'fuel_poverty', 'obesity', 'air', 'gigabit', 'indoor_4g'] as const;
const basisOf = (key: string) => (ENGLAND.basis as Record<string, string> | undefined)?.[key];
const diff = (f: number, e: number) => Math.round((f - e) * 10) / 10;
const side = (d: number, unit: string) => `${Math.abs(d).toFixed(1)} ${unit}${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'above' : 'below'}`;
const pctVs = (p: number) => (p === 0 ? 'the same as the England rate' : `${Math.abs(p)} per cent ${p > 0 ? 'above' : 'below'} the England rate`);
export function vsEngland(m: Measure, a: Area): string {
  const f = Number(num(m.figure));
  if ((PCT as readonly string[]).includes(m.key)) {
    const e = ENGLAND[m.key as (typeof PCT)[number]];
    const d = diff(f, e);
    // A figure that is the 294 council areas together (no published England row) is named so (T2 13:28, Cowork 13:20).
    const ref = basisOf(m.key) ? `the ${e.toFixed(1)} per cent for England's ${basisOf(m.key)}` : `England's ${e.toFixed(1)} per cent`;
    return d === 0 ? `the same as ${ref}` : `${side(d, 'percentage point')} ${ref}`;
  }
  if (m.key === 'life_expectancy') {
    const d = diff(f, ENGLAND.life_expectancy);
    return d === 0 ? `the same as England's ${ENGLAND.life_expectancy.toFixed(1)} years` : `${Math.abs(d).toFixed(1)} years ${d < 0 ? 'less' : 'more'} than England's ${ENGLAND.life_expectancy.toFixed(1)}`;
  }
  if (m.key === 'schools') {
    const d = diff(f, ENGLAND.schools);
    return d === 0 ? `the same as England's ${ENGLAND.schools.toFixed(1)}` : `${side(d, 'point')} England's ${ENGLAND.schools.toFixed(1)}`;
  }
  if (m.key === 'road_safety' && a.facts.road) return pctVs(a.facts.road.pct_vs_england);
  return '';
}

/** England's figure for the measures fold ('England 9.9 per cent'); a figure that is the 294 council areas together, because
 *  the source publishes no England row for it, says so (Cowork 13:20: 'England (294 council areas)'). */
export function englandFigure(key: string): string | null {
  const basis = basisOf(key);
  const label = basis ? `England (${basis})` : 'England';
  if ((PCT as readonly string[]).includes(key)) return `${label} ${ENGLAND[key as (typeof PCT)[number]].toFixed(1)} per cent`;
  if (key === 'life_expectancy') return `${label} ${ENGLAND.life_expectancy.toFixed(1)} years`;
  if (key === 'schools') return `${label} ${ENGLAND.schools.toFixed(1)}`;
  return null;
}

/** Road casualties as counts: '8 people were killed and 166 seriously injured'. */
export function roadCounts(a: Area): string | null {
  const r = a.facts.road;
  if (!r) return null;
  return `${n(r.killed)} ${r.killed === 1 ? 'person was' : 'people were'} killed and ${n(r.serious)} seriously injured`;
}

/** The short figure in the measure lists: '13.5 per cent (England 9.9 per cent)'; road safety as counts. */
export function shortFigure(m: Measure, a: Area): string {
  if (m.key === 'road_safety' && a.facts.road) return `${n(a.facts.road.killed)} killed and ${n(a.facts.road.serious)} seriously injured in ${ENGLAND.road.year}, ${pctVs(a.facts.road.pct_vs_england)}`;
  const e = (PCT as readonly string[]).includes(m.key) ? `${ENGLAND[m.key as (typeof PCT)[number]].toFixed(1)} per cent`
    : m.key === 'life_expectancy' ? `${ENGLAND.life_expectancy.toFixed(1)} years` : m.key === 'schools' ? ENGLAND.schools.toFixed(1) : '';
  return e ? `${m.figure} (${basisOf(m.key) ? `${basisOf(m.key)} together` : 'England'} ${e})` : m.figure;
}

// The crime score reads 'highest' and 'lowest', not 'worst' and 'best'.
export const crimeRank = (m: Measure) => plainRank(m.rank, m.of, 'highest', 'lowest', m.tie);
// Without the closing 'of 294', for 'the 4th highest crime score of the 294 council areas'.
const crimeWord = (m: Measure) => crimeRank(m).replace(/ of \d+$/, '');
export const measureRank = (m: Measure) => (m.key === 'crime' ? `${crimeRank(m)} on the government's crime score` : plainRank(m.rank, m.of, 'worst', 'best', m.tie));
// A period for brackets: 'Indices of Deprivation 2025 (crimes April 2018 to March 2024)' without brackets inside brackets.
export const plainPeriod = (p: string) => p.replace(' (', ', ').replace(')', '');

// Attainment 8 divided by 10 is roughly the average grade per subject (English and maths count twice, ten slots in all).
function grade(a8: number) {
  const g = Math.round(a8 / 10);
  if (g === 4) return 'a grade 4, a standard pass,';
  if (g === 5) return 'a grade 5, a strong pass,';
  return `a grade ${g}`;
}

export function explainMeasure(m: Measure, a: Area): string {
  const place = a.name;
  const f = num(m.figure);
  const vs = vsEngland(m, a);
  const r = `${cap(plainRank(m.rank, m.of, 'worst', 'best', m.tie))}.`;
  switch (m.key) {
    case 'child_poverty': {
      const c = a.facts.child_poverty;
      return `${c ? `${n(c.count)} children, ` : ''}${f} per cent${c ? ',' : ' of children'} live in low income households once housing costs are paid, ${vs}. ${r}`;
    }
    case 'unemployment':
      return `${f} per cent of people who are working or looking for work have no job, ${vs}. ${r}`;
    case 'fuel_poverty':
      return `${f} per cent of households are in fuel poverty, ${vs}: they have a low income and live in a home with a poor energy efficiency rating. ${r}`;
    case 'life_expectancy':
      return `A baby born in ${place} can expect to live ${f} years, ${vs}. ${r}`;
    case 'obesity':
      return `${f} per cent of adults are overweight or obese, from a national survey, ${vs}. ${r}`;
    case 'air':
      return `An estimated ${f} per cent of deaths of adults aged 30 and over are linked to fine particle air pollution, ${vs}. ${r}`;
    case 'gigabit': {
      const g = a.facts.gigabit;
      return `${g ? `${n(g.count)} of ${n(g.premises)} homes and businesses, ${f} per cent,` : `${f} per cent of homes and businesses`} can get gigabit broadband, ${vs}. ${r}`;
    }
    case 'indoor_4g':
      return `${f} per cent of homes and businesses get a 4G signal indoors from all four mobile networks, ${vs}. ${r}`;
    case 'crime':
      return `${place} has the ${crimeWord(m)} crime score of the ${m.of} council areas (the middle area is ${ordinal(Math.ceil(m.of / 2))}). The score is the government's measure of how much violence, burglary, theft, criminal damage and antisocial behaviour people living there face, from police records.`;
    case 'schools':
      return `Pupils living in ${place} averaged an Attainment 8 score of ${f}, ${vs}: roughly ${grade(Number(f))} in each of their eight main GCSE subjects. ${r}`;
    case 'road_safety': {
      const c = roadCounts(a);
      return c ? `${cap(c)} on roads in ${place}, ${vs}. ${r}` : `${f} people in every 100,000 were killed or seriously injured on its roads. ${r}`;
    }
    default:
      return `${m.figure}. ${r}`;
  }
}

const list = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// ONS police recorded crime: information only; the ranking stays on the government's crime score (ENTRY 436 point 1).
export function explainPolice(a: Area): string {
  const crime = a.all.find((m) => m.key === 'crime');
  const rank = crime ? ` ${cap(crimeWord(crime))} of the ${crime.of} areas on the government's crime score.` : '';
  const p = a.police;
  if (p.status === 'missing') return `Kent Police could not place many crimes in an area in this table, so no reliable figure is published for ${a.name}.${rank}`;
  const c = a.facts.police;
  // ENTRY 493 item 4: the local rate and England's side by side, both per 1,000 residents, then the count and the period.
  const rates = (rate: string, place: string) => `${rate} crimes per 1,000 residents in ${place}, against ${POLICE.england} for England.`;
  const count = c ? ` ${n(c.count)} crimes were recorded by the police, ${POLICE.period}.` : ` ${cap(POLICE.period)}.`;
  if (p.status === 'combined') return `The police publish one figure for ${list([a.name, ...(p.with ?? [])])} together: ${rates(p.figure ?? '', 'the area')}${count}${rank}`;
  const humberside = p.humberside ? ` Humberside Police could not place some crimes in an area in this table, so ${a.name}'s figure is likely to be too low.` : '';
  return `${rates(p.figure ?? '', a.name)}${count}${rank}${humberside}`;
}

export function explainScore(a: Area, of: number): string {
  return `${a.score.toFixed(1)} out of 100. 100 would be the best figure of the ${of} council areas on every measure, 0 the worst on every one (average ${AVG_SCORE.toFixed(1)}). ${a.name} is the ${plainScoreRank(a.rank, of)}.`;
}
