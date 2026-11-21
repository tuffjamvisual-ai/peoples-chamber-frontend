// 'Why it ranks here' for /council-areas/lowest-scores and its 294 area pages (Cowork ENTRY 444, owner: keep the scoring,
// change what the reader sees first). Everything here is generated from the page data by one set of rules, the same for
// all 294 council areas; no sentence is written for a particular place.
//
//   whySentence   (ENTRY 444 item 2) the two lowest scoring topics (all five weigh the same) and, in each, the measure
//                 with the lowest score (the one pulling that topic down most), with its figure in plain words. Opens
//                 'Below average on all five topics.' when every topic score is under 50 (the council area average of
//                 every topic score is 50, as the scores are rank based).
//   whyAccount    (item 3(b)) the measure with the biggest effect, the second, and the one that helped most, each with
//                 its figure, the council area average, a plain rank, its share of the overall score, period and source.
//                 Effect = (50 minus the measure's score) times its share: the points it takes off the overall score
//                 against a middle area (50 on every measure); the most negative helped most.
//   weightingCheck (item 4) the ten lowest under seven weightings: the five topics equal (the method used), the twelve
//                 measures equal, and the five topics equal with each topic left out in turn.
//
// Scores: the page data rounds each measure score to 0.1, so the order here uses the exact score from the rank (the
// v3 method: best 100, worst 0, ties share the average), which matches the rounded score for every measure. Hull's two
// biggest effects are 9.80 and 9.73 points, so rounding would matter.
// Owner rules: no hyphens, 'per cent', no time words, 'council area', describe only what is measured.
import type { Area, Measure } from './data';
import { AREAS, MEASURES, TOPICS } from './data';
import { cap, ordinal, plainRank } from './ranks';

const num = (s: string) => s.split(' ')[0];
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Numbers up to ten in words, larger ones as figures. */
export const countWord = (n: number) => (n <= 10 ? WORDS[n] : String(n));

/** The exact 0 to 100 score from a measure's rank (1 = the worst figure) and tie (how many share that rank). */
export function exactScore(m: Pick<Measure, 'rank' | 'of' | 'tie'>): number {
  const t = m.tie ?? 1;
  const j = m.of - m.rank;
  const i = j - t + 1;
  return 100 * (1 - (i + j) / 2 / (m.of - 1));
}

const TOPIC_SIZE = new Map(TOPICS.map((t) => [t.label, t.measures.length]));
/** A measure's share of the overall score: a fifth for its topic, split equally among the topic's measures. */
export const weightOf = (topic: string) => 1 / TOPICS.length / (TOPIC_SIZE.get(topic) ?? 1);

/** '20 per cent', '6 2/3 per cent'. */
export function shareWords(w: number): string {
  const pct = w * 100;
  if (Math.abs(pct - Math.round(pct)) < 1e-9) return `${Math.round(pct)} per cent`;
  for (const d of [2, 3, 4]) {
    const whole = Math.floor(pct);
    const n = Math.round((pct - whole) * d);
    if (Math.abs((pct - whole) * d - n) < 1e-9) return `${whole} ${n}/${d} per cent`;
  }
  return `${pct.toFixed(1)} per cent`;
}

/** Topic scores from the exact measure scores, in the page's topic order. */
export function topicScores(a: Area): { label: string; score: number }[] {
  return TOPICS.map((t) => {
    const ms = a.all.filter((m) => m.topic === t.label);
    return { label: t.label, score: ms.reduce((s, m) => s + exactScore(m), 0) / ms.length };
  });
}

/** The topics from lowest score to highest (ties keep the page's topic order). */
export function lowestTopics(a: Area) {
  return topicScores(a).map((t, i) => ({ ...t, i })).sort((x, y) => x.score - y.score || x.i - y.i);
}

/** The measure pulling a topic down most: its lowest score (ties keep the data's order). */
export function lowestMeasure(a: Area, topic: string): Measure {
  const ms = a.all.filter((m) => m.topic === topic);
  return ms.reduce((lo, m) => (exactScore(m) < exactScore(lo) ? m : lo), ms[0]);
}

const BETTER = new Map(MEASURES.map((m) => [m.key, m.better]));

/** The crime score has no figure on the page, only a rank: 'only ten council areas had a higher crime score'. */
function crimeWords(m: Measure, place: string): string {
  const tie = m.tie ?? 1;
  const joint = tie > 1 ? 'joint ' : '';
  if (m.rank <= m.of / 2) {
    const higher = m.rank - 1;
    if (higher === 0) return `${place} had the ${joint}highest crime score of the ${m.of}`;
    return `only ${countWord(higher)} council ${higher === 1 ? 'area' : 'areas'} had a higher crime score`;
  }
  const lower = m.of + 1 - m.rank - tie;
  if (lower === 0) return `${place} had the ${joint}lowest crime score of the ${m.of}`;
  return `only ${countWord(lower)} council ${lower === 1 ? 'area' : 'areas'} had a lower crime score`;
}

/** A measure's figure in plain words, as a clause: '13.5 per cent of households were in fuel poverty'. When it is the
 *  worst figure of the 294 it says so (', the highest of the 294'). */
export function figureWords(m: Measure, place: string): string {
  if (m.key === 'crime') return crimeWords(m, place);
  const f = num(m.figure);
  let s: string;
  switch (m.key) {
    case 'child_poverty': s = `${f} per cent of children were in low income households`; break;
    case 'unemployment': s = `${f} per cent of people working or looking for work had no job`; break;
    case 'fuel_poverty': s = `${f} per cent of households were in fuel poverty`; break;
    case 'life_expectancy': s = `a baby born there can expect to live ${f} years`; break;
    case 'obesity': s = `${f} per cent of adults were overweight or obese`; break;
    case 'air': s = `an estimated ${f} per cent of adult deaths were linked to fine particle air pollution`; break;
    case 'gigabit': s = `${f} per cent of homes and businesses could get gigabit broadband`; break;
    case 'indoor_4g': s = `${f} per cent of homes and businesses had indoor 4G from all four networks`; break;
    case 'schools': s = `pupils averaged an Attainment 8 score of ${f} at GCSE`; break;
    case 'road_safety': s = `${f} in every 100,000 people were killed or seriously injured on the roads`; break;
    case 'sewage':
      if (m.figure.startsWith('0 ')) s = 'no storm overflow was recorded spilling sewage';
      else if (m.figure.startsWith('under 1 ')) s = 'storm overflows spilled sewage for under 1 hour for every 1,000 people';
      else s = `storm overflows spilled sewage for ${f} ${f === '1' ? 'hour' : 'hours'} for every 1,000 people`;
      break;
    default: s = `${m.label.toLowerCase()} was ${m.figure}`;
  }
  if (m.rank === 1) s += `, the ${(m.tie ?? 1) > 1 ? 'joint ' : ''}${BETTER.get(m.key) === 'higher' ? 'lowest' : 'highest'} of the ${m.of}`;
  return s;
}

// A topic name in running text: 'housing', 'crime'; a name with 'and' in it reads as 'the money, work and schools topic'.
const topicName = (label: string) => (label.includes(' and ') ? `the ${label.toLowerCase()} topic` : label.toLowerCase());

/** The why sentence (ENTRY 444 item 2). */
export function whySentence(a: Area): string {
  const order = lowestTopics(a);
  const [t1, t2] = order;
  const allBelow = order.every((t) => t.score < 50);
  const pair = `${topicName(t1.label)} and ${topicName(t2.label)}`;
  let lead: string;
  if (t2.score < 50) lead = `${cap(pair)} pulled the score down most.`;
  else if (t1.score < 50) lead = `${cap(topicName(t1.label))} pulled the score down most, then ${topicName(t2.label)}.`;
  else lead = `${cap(pair)} were its two lowest topics.`;
  const c1 = figureWords(lowestMeasure(a, t1.label), a.name);
  const c2 = figureWords(lowestMeasure(a, t2.label), a.name);
  return `${allBelow ? 'Below average on all five topics. ' : ''}${lead} ${cap(c1)}, and ${c2}.`;
}

// Area covered (ENTRY 444 item 1): official facts only. The page data holds the council area's name and type and no county
// or region, so only those two show; no towns or villages are named. 'District council' reads as the council itself after
// a place name, so it becomes 'district council area'.
export const areaCovered = (name: string, type: string) => `${name}, ${type === 'District council' ? 'district council area' : type.toLowerCase()}`;

// ---- 'Why <place> ranks here' (item 3(b)) ----

export type Effect = { m: Measure; weight: number; effect: number };
/** Every measure with its share and its effect on the overall score against a middle area, biggest first. */
export function effects(a: Area): Effect[] {
  return a.all
    .map((m, i) => ({ m, i, weight: weightOf(m.topic), effect: (50 - exactScore(m)) * weightOf(m.topic) }))
    .sort((x, y) => y.effect - x.effect || x.i - y.i)
    .map(({ m, weight, effect }) => ({ m, weight, effect }));
}

const PUBLISHER = new Map(MEASURES.map((m) => [m.key, m.source.split(',')[0]]));
const plainPeriod = (p: string) => p.replace(' (', ', ').replace(')', '');

export type AccountPart = { lead: string; text: string };
/** One measure's lines: figure (with period and source beside it), council area average, plain rank, share. */
function partFor(e: Effect, lead: string, place: string): AccountPart {
  const { m } = e;
  const where = `(${plainPeriod(m.period)}, ${PUBLISHER.get(m.key)})`;
  const share = `${m.label} is ${shareWords(e.weight)} of the overall score.`;
  if (m.key === 'crime') {
    const rank = plainRank(m.rank, m.of, 'highest', 'lowest', m.tie);
    return { lead, text: `${place}’s crime score was the ${rank.replace(/ of \d+$/, '')} of the ${m.of} council areas ${where}; the middle area is ${ordinal(Math.ceil(m.of / 2))}. ${share}` };
  }
  const rank = plainRank(m.rank, m.of, 'worst', 'best', m.tie);
  return { lead, text: `${cap(figureWords({ ...m, rank: 0 }, place))} ${where}, against a council area average of ${m.average}: ${rank}. ${share}` };
}

/** The account in the ENTRY's order: biggest effect, second, helped most. */
export function whyAccount(a: Area): AccountPart[] {
  const list = effects(a);
  const down = list.filter((e) => e.effect > 0);
  const up = [...list].reverse().find((e) => e.effect < 0);
  const out: AccountPart[] = [];
  if (down[0]) out.push(partFor(down[0], `Biggest effect: ${down[0].m.label.toLowerCase()}`, a.name));
  if (down[1]) out.push(partFor(down[1], `Second biggest effect: ${down[1].m.label.toLowerCase()}`, a.name));
  if (!down.length) out.push({ lead: 'Biggest effect', text: `No measure is worse than the middle of the ${a.all[0].of}.` });
  out.push(up ? partFor(up, `Helped most: ${up.m.label.toLowerCase()}`, a.name) : { lead: 'Helped most', text: `No measure is better than the middle of the ${a.all[0].of}.` });
  return out;
}

/** Every measure's share, for the 'biggest effect' rule in How the scores work. */
export const SHARES = TOPICS.map((t) => ({ topic: t.label, count: t.measures.length, share: shareWords(weightOf(t.label)) }));

// ---- The weighting check (item 4) ----

export function weightingCheck(areas: Area[] = AREAS, bottom = 20, top = 10) {
  const scores = new Map(areas.map((a) => [a.slug, topicScores(a).map((t) => t.score)]));
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const runs: { name: string; score: (a: Area) => number }[] = [
    { name: 'the five topics counting equally', score: (a) => mean(scores.get(a.slug)!) },
    { name: `every one of the ${areas[0].all.length} measures counting equally`, score: (a) => mean(a.all.map(exactScore)) },
    ...TOPICS.map((t, i) => ({ name: `leaving out ${t.label.toLowerCase()}`, score: (a: Area) => mean(scores.get(a.slug)!.filter((_, k) => k !== i)) })),
  ];
  const positions = runs.map((r) => {
    const order = [...areas].sort((x, y) => r.score(x) - r.score(y));
    return new Map(order.map((a, i) => [a.slug, i + 1]));
  });
  const ten = [...areas].sort((x, y) => x.rank - y.rank).slice(0, top);
  const out = ten.filter((a) => positions.some((p) => p.get(a.slug)! > bottom))
    .map((a) => {
      const k = positions.reduce((w, p, i) => (p.get(a.slug)! > positions[w].get(a.slug)! ? i : w), 0);
      return { name: a.name, position: positions[k].get(a.slug)!, run: runs[k].name };
    });
  return { ways: runs.length, stayed: ten.length - out.length, of: ten.length, bottom, out };
}

/** 'We tried seven different ways of weighting the figures. Nine of these ten areas stayed in the bottom 20 every time.' */
export function weightingSentence(c = weightingCheck()): string {
  const stayed = c.stayed === c.of ? `All ${countWord(c.of)} of these areas` : `${cap(countWord(c.stayed))} of these ${countWord(c.of)} areas`;
  return `We tried ${countWord(c.ways)} different ways of weighting the figures. ${stayed} stayed in the bottom ${c.bottom} every time.`;
}
