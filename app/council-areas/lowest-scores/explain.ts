// One short plain sentence on every figure (Cowork ENTRY 436 point 2; the templates Cowork accepted in
// audit/worst-places-415/EXPLAINERS.md, with the ENTRY 436 GO answers). Owner rules: no hyphens, 'per cent', no time words,
// 'council area', never 'town'. The figure and average strings come from the page data; only their numbers are used here.
import type { Area, Measure } from './data';
import { POLICE, AVG_SCORE } from './data';
import { cap, ordinal, plainRank, plainScoreRank } from './ranks';

const num = (s: string) => s.split(' ')[0];

// The crime score reads 'highest' and 'lowest', not 'worst' and 'best'.
export const crimeRank = (m: Measure) => plainRank(m.rank, m.of, 'highest', 'lowest', m.tie);
// Without the closing 'of 294', for 'the 4th highest crime score of the 294 council areas'.
const crimeWord = (m: Measure) => crimeRank(m).replace(/ of \d+$/, '');
export const measureRank = (m: Measure) => (m.key === 'crime' ? `${crimeRank(m)} on the government’s crime score` : plainRank(m.rank, m.of, 'worst', 'best', m.tie));
// A period for brackets: 'Indices of Deprivation 2025 (crimes April 2018 to March 2024)' without brackets inside brackets.
export const plainPeriod = (p: string) => p.replace(' (', ', ').replace(')', '');

// Attainment 8 divided by 10 is roughly the average grade per subject (English and maths count twice, ten slots in all).
function grade(a8: number) {
  const g = Math.round(a8 / 10);
  if (g === 4) return 'a grade 4, a standard pass,';
  if (g === 5) return 'a grade 5, a strong pass,';
  return `a grade ${g}`;
}

export function explainMeasure(m: Measure, place: string): string {
  const f = num(m.figure);
  const a = num(m.average);
  const r = `${cap(plainRank(m.rank, m.of, 'worst', 'best', m.tie))}.`;
  switch (m.key) {
    case 'child_poverty':
      return `${f} per cent of children live in low income households, once housing costs are paid (average ${a} per cent). ${r}`;
    case 'unemployment':
      return `${f} per cent of people who are working or looking for work have no job (average ${a} per cent). ${r}`;
    case 'fuel_poverty':
      return `${f} per cent of households are in fuel poverty: they have a low income and live in a home with a poor energy efficiency rating (average ${a} per cent). ${r}`;
    case 'life_expectancy': {
      const gap = Math.round((Number(f) - Number(a)) * 10) / 10;
      const vs = gap === 0 ? 'the same as the average council area' : `${Math.abs(gap).toFixed(1)} years ${gap < 0 ? 'less' : 'more'} than the average council area`;
      return `${f} years. A baby born in ${place} can expect to live ${f} years, ${vs} (${a}). ${r}`;
    }
    case 'obesity':
      return `${f} per cent of adults are overweight or obese, from a national survey (average ${a} per cent). ${r}`;
    case 'air':
      return `An estimated ${f} per cent of deaths of adults aged 30 and over are linked to fine particle air pollution (average ${a} per cent). ${r}`;
    case 'gigabit':
      return `${f} per cent of homes and businesses can get gigabit broadband (average ${a} per cent). ${r}`;
    case 'indoor_4g':
      return `${f} per cent of homes and businesses get a 4G signal indoors from all four mobile networks (average ${a} per cent). ${r}`;
    case 'crime':
      return `${place} has the ${crimeWord(m)} crime score of the ${m.of} council areas (the middle area is ${ordinal(Math.ceil(m.of / 2))}). The score is the government’s measure of how much violence, burglary, theft, criminal damage and antisocial behaviour people living there face, from police records.`;
    case 'schools':
      return `Pupils living in ${place} averaged an Attainment 8 score of ${f} (average ${a}): roughly ${grade(Number(f))} in each of their eight main GCSE subjects. ${r}`;
    case 'road_safety':
      return `For every 100,000 people living in ${place}, ${f} people were killed or seriously injured on its roads (average ${a}). ${r}`;
    case 'sewage':
      if (m.figure.startsWith('0 ')) return `No storm overflow in ${place} was recorded spilling sewage (average ${a} hours for every 1,000 people). ${r}`;
      if (m.figure.startsWith('under 1 ')) return `Storm overflows in ${place} spilled sewage for under 1 hour in all for every 1,000 people living there (average ${a}). ${r}`;
      return `Storm overflows in ${place} spilled sewage for a combined ${f} ${f === '1' ? 'hour' : 'hours'} for every 1,000 people living there (average ${a}). ${r}`;
    default:
      return `${m.figure} (average ${m.average}). ${r}`;
  }
}

const list = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// ONS police recorded crime: information only; the ranking stays on the government's crime score (ENTRY 436 point 1).
export function explainPolice(a: Area): string {
  const crime = a.all.find((m) => m.key === 'crime');
  const rank = crime ? ` ${cap(crimeWord(crime))} of the ${crime.of} areas on the government’s crime score.` : '';
  const p = a.police;
  if (p.status === 'missing') return `Kent Police could not place many crimes in an area in this table, so no reliable figure is published for ${a.name}.${rank}`;
  if (p.status === 'combined') return `The police publish one figure for ${list([a.name, ...(p.with ?? [])])} together: ${p.figure} crimes per 1,000 residents, ${POLICE.period} (England ${POLICE.england}).${rank}`;
  const humberside = p.humberside ? ` Humberside Police could not place some crimes in an area in this table, so ${a.name}’s figure is likely to be too low.` : '';
  return `${p.figure} crimes recorded by the police per 1,000 residents, ${POLICE.period} (England ${POLICE.england}).${rank}${humberside}`;
}

export function explainScore(a: Area, of: number): string {
  return `${a.score.toFixed(1)} out of 100. 100 would be the best figure of the ${of} council areas on every measure, 0 the worst on every one (average ${AVG_SCORE.toFixed(1)}). ${a.name} is the ${plainScoreRank(a.rank, of)}.`;
}
