// The 'why it ranks here' generator for /council-areas/lowest-scores (Cowork ENTRY 444, app/council-areas/lowest-scores/
// why.ts): the ten why sentences as Cowork checked them in audit/worst-places-415/WHY-DRAFT.md, the Hull account, the
// weights, the item 4 check, the house rules on all 294 sentences, and no body or dataset name in the sentences or folds
// (ENTRY 444 decisions, 21 Nov 2026 04:12, items 4 and 6), and the two rank correlations written in How the scores work
// (T2 review, 21 Nov 2026 06:12, note 1), and the police force named in each area's police sentence (T2, 06:17).
// Run: npx tsx --test scripts/checks/lowest-scores-why.test.ts
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, MEASURES, SOURCES } from '../../app/council-areas/lowest-scores/data';
import { englandFigure, explainMeasure, explainPolice, plainPeriod, shortFigure } from '../../app/council-areas/lowest-scores/explain';
import { areaCovered, effects, exactScore, shareWords, weightOf, weightingCheck, weightingSentence, whyAccount, whySentence, WHY_RULE, SHARES } from '../../app/council-areas/lowest-scores/why';
import imd from './fixtures/imd2025-rank-by-slug.json';
import pageData from '../../app/council-areas/lowest-scores/lowest-scores.json';

const area = (slug: string) => AREAS.find((a) => a.slug === slug)!;

test('the ten why sentences match WHY-DRAFT.md', () => {
  // ENTRY 482 REVISED (sewage removed): the same ten sentences Cowork accepted in WHY-DRAFT.md, in the new order.
  const want = [
    'Housing (fuel poverty) and crime pulled the score down most. 13.3 per cent of households were in fuel poverty, and only ten council areas had a higher crime score.',
    'Crime and housing (fuel poverty) pulled the score down most. Only three council areas had a higher crime score, and 13.5 per cent of households were in fuel poverty.',
    'Housing (fuel poverty) and crime pulled the score down most. 12.9 per cent of households were in fuel poverty, and only 19 council areas had a higher crime score.',
    'Crime and housing (fuel poverty) pulled the score down most. Blackpool had the highest crime score of the 294, and 13.9 per cent of households were in fuel poverty.',
    'Housing (fuel poverty) and health pulled the score down most. 13.5 per cent of households were in fuel poverty, and 75.1 per cent of adults were overweight or obese.',
    'Housing (fuel poverty) and health pulled the score down most. 14.8 per cent of households were in fuel poverty, the highest of the 294, and a baby born there can expect to live 78.2 years.',
    'Below average on all five topics. Housing (fuel poverty) and crime pulled the score down most. 12.3 per cent of households were in fuel poverty, and only 32 council areas had a higher crime score.',
    'Below average on all five topics. Health and crime pulled the score down most. 74.4 per cent of adults were overweight or obese, and only 28 council areas had a higher crime score.',
    'Housing (fuel poverty) and crime pulled the score down most. 12.7 per cent of households were in fuel poverty, and only 16 council areas had a higher crime score.',
    'Below average on all five topics. Crime and housing (fuel poverty) pulled the score down most. Only 12 council areas had a higher crime score, and 12.1 per cent of households were in fuel poverty.',
  ];
  assert.deepEqual(AREAS.slice(0, 10).map(whySentence), want);
});

test('exact scores match the page data and the weights match the method', () => {
  for (const a of AREAS) for (const m of a.all) assert.ok(Math.abs(Math.round(exactScore(m) * 10) / 10 - m.score) < 0.051, `${a.slug} ${m.key}`);
  assert.equal(weightOf('Crime'), 0.2);
  assert.equal(weightOf('Housing'), 0.2);
  assert.equal(weightOf('Health'), 0.1);
  assert.equal(shareWords(weightOf('Money, work and schools')), '6.7 per cent');
  assert.equal(shareWords(weightOf('Health')), '10 per cent');
  assert.equal(shareWords(weightOf('Crime')), '20 per cent');
  assert.equal(shareWords(weightOf('Environment and connectivity')), '5 per cent'); // four measures since sewage was removed (ENTRY 482 REVISED)
  // The weighted sum of the exact measure scores is the overall score.
  for (const a of AREAS) assert.ok(Math.abs(a.all.reduce((s, m) => s + exactScore(m) * weightOf(m.topic), 0) - a.score) < 0.051, a.slug);
});

test('Hull: crime, then fuel poverty, then gigabit broadband helped most', () => {
  const h = area('hull');
  const e = effects(h);
  assert.deepEqual(e.slice(0, 2).map((x) => x.m.key), ['crime', 'fuel_poverty']);
  assert.equal(e[0].effect.toFixed(2), '9.80');
  assert.equal(e[1].effect.toFixed(2), '9.73');
  const acc = whyAccount(h);
  assert.deepEqual(acc.map((p) => p.lead), ['Biggest effect: crime', 'Second biggest effect: fuel poverty', 'Helped most: gigabit broadband']);
  assert.match(acc[0].text, /4th highest of the 294 council areas \(April 2018 to March 2024\); the middle area is 147th\. Crime is 20 per cent of the overall score\.$/);
  assert.match(acc[1].text, /^13\.5 per cent of households were in fuel poverty \(2024\), 3\.6 percentage points above England's 9\.9 per cent: 5th worst of 294\. Fuel poverty is 20 per cent/);
  assert.match(acc[2].text, /99\.6 per cent .*\(January 2026\), 11\.2 percentage points above England's 88\.4 per cent: best of 294\. Gigabit broadband is 5 per cent/);
});

test('item 4: all ten stay in the bottom 20 under all seven weightings (nine before sewage was removed)', () => {
  const c = weightingCheck();
  assert.equal(c.ways, 7);
  assert.equal(c.stayed, 10);
  assert.deepEqual(c.out.map((o) => o.name), []);
  assert.equal(weightingSentence(c), 'We tried seven different ways of weighting the figures. All ten of these areas stayed in the bottom 20 every time.');
});

test('house rules on all 294 sentences and accounts', () => {
  for (const a of AREAS) {
    const texts = [whySentence(a), ...whyAccount(a).map((p) => `${p.lead}. ${p.text}`), areaCovered(a.name, a.type)];
    for (const t of texts) {
      const own = t.replaceAll(a.name, '');
      assert.doesNotMatch(own, /[-‐-―%]/, `${a.slug}: ${t}`);
      assert.doesNotMatch(t, /\b(now|currently|recently|latest|today|this year|so far|to date)\b/i, `${a.slug}: ${t}`);
      assert.doesNotMatch(t, /\btowns?\b|undefined|NaN/, `${a.slug}: ${t}`);
    }
    assert.ok(whyAccount(a).length >= 2, a.slug);
  }
  assert.equal(areaCovered('Burnley', 'District council'), 'Burnley, district council area');
  assert.equal(areaCovered('Hull', 'Unitary authority'), 'Hull, unitary authority');
});

// ENTRY 444 decisions item 4: body and dataset names only in the Sources fold.
const BODIES = ['DESNZ', 'MHCLG', 'Ofcom', 'ONS', 'Indices of Deprivation', 'OHID', 'DfE', 'DWP', 'Environment Agency', 'Home Office', 'Police', 'DfT', 'UKHSA', 'Office for National Statistics', 'Fingertips', 'Active Lives', 'Connected Nations', 'Nomis', 'STATS19'];
const BODY_RE = new RegExp(`\\b(${BODIES.join('|')})\\b`);

test('no body or dataset name in the why sentences, the Why fold or the folds of figures', () => {
  assert.match('Crime: MHCLG, English Indices of Deprivation 2025', BODY_RE); // the check itself catches them
  const texts: string[] = [WHY_RULE, ...SHARES.map((t) => t.share)];
  for (const m of MEASURES) texts.push(m.unit, m.period); // 'The 11 measures in 5 topics' fold
  for (const a of AREAS) {
    texts.push(whySentence(a), ...whyAccount(a).map((p) => `${p.lead}. ${p.text}`));
    for (const m of a.all) texts.push(plainPeriod(m.period), explainMeasure(m, a)); // 'Every measure explained' fold
  }
  for (const t of texts) assert.doesNotMatch(t, BODY_RE, t);
  // Hull's fold as the reader sees it: the period only, in brackets.
  const hull = whyAccount(area('hull')).map((p) => p.text).join(' ');
  for (const p of ['(April 2018 to March 2024)', '(2024)', '(January 2026)']) assert.ok(hull.includes(p), p);
});

test('every source behind the figures is in the Sources fold', () => {
  const hrefs = new Set(SOURCES.map((s) => s.href));
  for (const m of MEASURES) assert.ok(hrefs.has(m.href), m.key);
  const crime = SOURCES.find((s) => s.href === MEASURES.find((m) => m.key === 'crime')!.href)!;
  assert.match(crime.label, /^Crime, and the check against overall deprivation in How the scores work: MHCLG, English Indices of Deprivation 2025/);
  for (const b of ['DESNZ', 'MHCLG', 'Ofcom']) assert.ok(SOURCES.some((s) => s.label.includes(b)), b);
});

// T2 review 21 Nov 2026 06:12 note 1: How the scores work writes two Spearman rank correlations as figures (0.92 with the
// government's overall measure of deprivation, 0.89 with life expectancy; WHY-DRAFT.md: 0.923 and 0.891). They are not
// computed on the build, so this recomputes them from the page data and fails if the data changes them. The deprivation
// rank is not in the page data: scripts/checks/fixtures/imd2025-rank-by-slug.json (IoD 2025 File 10, rank of average score).
const ranks = (v: number[]) => {
  const s = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
  const r: number[] = new Array(v.length);
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++;
    for (let k = i; k <= j; k++) r[s[k][1]] = (i + j) / 2 + 1; // ties share the average rank
    i = j + 1;
  }
  return r;
};
const spearman = (x: number[], y: number[]) => {
  const [rx, ry] = [ranks(x), ranks(y)];
  const mean = (v: number[]) => v.reduce((s, n) => s + n, 0) / v.length;
  const [mx, my] = [mean(rx), mean(ry)];
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < rx.length; i++) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};

test('the two rank correlations in How the scores work match the data', () => {
  const page = readFileSync(new URL('../../app/council-areas/lowest-scores/page.tsx', import.meta.url), 'utf8');
  const written = page.match(/a rank correlation of (0\.\d\d)[^)]*\) and by life expectancy \((0\.\d\d)\)/);
  assert.ok(written, 'the correlation sentence is in page.tsx');
  const [, deprivation, life] = written;
  const imdRank = imd.ranks as Record<string, number>;
  assert.equal(AREAS.length, 294);
  for (const a of AREAS) assert.ok(Number.isInteger(imdRank[a.slug]), `deprivation rank for ${a.slug}`);
  const score = AREAS.map((a) => a.score);
  // Rank 1 is the most deprived and a low score is a worse place, so the same order gives a positive correlation.
  const withDeprivation = spearman(score, AREAS.map((a) => imdRank[a.slug]));
  const withLife = spearman(score, AREAS.map((a) => parseFloat(a.all.find((m) => m.key === 'life_expectancy')!.figure)));
  assert.equal(withDeprivation.toFixed(2), deprivation, `deprivation ${withDeprivation}`);
  assert.equal(withLife.toFixed(2), life, `life expectancy ${withLife}`);
  assert.equal(deprivation, '0.92');
  assert.equal(life, '0.88'); // 0.89 before sewage was removed
});

// T2 21 Nov 2026 06:17: explainPolice names the force. Status 'missing' reads 'Kent Police could not place many crimes ...'
// and the humberside flag (on an 'own' figure) reads 'Humberside Police could not place some crimes ...', so every area
// with either must be in that force's area. Read from the page data, lowest-scores.json.
test('the police force named in the police sentence covers the area', () => {
  const KENT = ['Dartford', 'Gravesham', 'Maidstone', 'Medway', 'Tonbridge and Malling', 'Tunbridge Wells'];
  const HUMBERSIDE = ['Hull', 'North East Lincolnshire', 'North Lincolnshire', 'East Riding of Yorkshire'];
  const areas = pageData.areas as { name: string; slug: string; police: { status: string; humberside?: boolean } }[];
  assert.equal(areas.length, 294);
  const missing = areas.filter((a) => a.police.status === 'missing');
  const humberside = areas.filter((a) => a.police.humberside);
  for (const a of missing) assert.ok(KENT.includes(a.name), `police status missing outside Kent: ${a.name}`);
  for (const a of humberside) {
    assert.ok(HUMBERSIDE.includes(a.name), `humberside flag outside Humberside: ${a.name}`);
    assert.equal(a.police.status, 'own', `${a.name}: the Humberside sentence is only written on an own figure`);
  }
  assert.ok(missing.length > 0 && humberside.length > 0);
  // The sentences as the page writes them name only these areas' forces.
  for (const a of AREAS) {
    const t = explainPolice(a);
    if (t.includes('Kent Police')) assert.ok(KENT.includes(a.name), `${a.name}: ${t}`);
    if (t.includes('Humberside Police')) assert.ok(HUMBERSIDE.includes(a.name), `${a.name}: ${t}`);
  }
});

// Cowork ENTRY 484 (owner approved 21 Nov 2026): real numbers first, then England; per cent measures in percentage points.
test('ENTRY 484: counts and England figures, Hull and Blackpool', () => {
  const hull = area('hull'), bp = area('blackpool');
  const m = (a: typeof hull, k: string) => explainMeasure(a.all.find((x) => x.key === k)!, a);
  assert.match(m(hull, 'road_safety'), /^8 people were killed and 166 seriously injured on roads in Hull, 41 per cent above the England rate\. 41st worst of 294\.$/);
  assert.match(m(bp, 'road_safety'), /^1 person was killed and 99 seriously injured on roads in Blackpool, 55 per cent above the England rate/);
  assert.match(m(hull, 'fuel_poverty'), /^13\.5 per cent of households are in fuel poverty, 3\.6 percentage points above England's 9\.9 per cent:/);
  assert.match(m(hull, 'child_poverty'), /^20,601 children, 37\.2 per cent, live in low income households once housing costs are paid, 10\.1 percentage points above England's 27\.1 per cent\./);
  assert.match(m(hull, 'gigabit'), /^130,749 of 131,287 homes and businesses, 99\.6 per cent, can get gigabit broadband, 11\.2 percentage points above/);
  assert.match(m(hull, 'life_expectancy'), /^A baby born in Hull can expect to live 77\.7 years, 3\.4 years less than England's 81\.1\./);
  assert.match(m(hull, 'schools'), /Attainment 8 score of 40\.4, 5\.7 points below England's 46\.1:/);
  // ENTRY 493 item 4: both rates per 1,000 residents side by side, then the count and the period.
  assert.match(explainPolice(hull), /^119\.6 crimes per 1,000 residents in Hull, against 83\.3 for England\. 32,936 crimes were recorded by the police, year to June 2026\. 4th highest/);
  assert.equal(shortFigure(hull.all.find((x) => x.key === 'fuel_poverty')!, hull), '13.5 per cent (England 9.9 per cent)');
  assert.equal(englandFigure('unemployment'), 'England (294 council areas) 4.5 per cent');
  assert.match(m(hull, 'unemployment'), /1\.4 percentage points above the 4\.5 per cent for England's 294 council areas\./);
  assert.equal(shortFigure(hull.all.find((x) => x.key === 'unemployment')!, hull), '5.9 per cent (294 council areas together 4.5 per cent)');
  assert.equal(englandFigure('gigabit'), 'England 88.4 per cent');
  assert.equal(englandFigure('crime'), null);
  for (const a of AREAS) {
    const texts = [...a.all.map((x) => explainMeasure(x, a)), ...a.all.map((x) => shortFigure(x, a)), explainPolice(a)];
    for (const t of texts) {
      assert.doesNotMatch([a.name, ...(a.police.with ?? [])].reduce((x, nm) => x.replaceAll(nm, ''), t), /[-‐-―%]|\(average |council area average|undefined|NaN|per 100,000/, `${a.slug}: ${t}`);
      assert.doesNotMatch(t, /percentage points? (above|below) England's \d+\.\d per cent.*per cent above England/, t);
    }
  }
});

// Cowork ENTRY 493 (5) and (6), owner approved 21 Nov 2026: built from the data, the wording Cowork accepted at 16:37.
import { firstAgainstSecond, tiesNotes } from '../../app/council-areas/lowest-scores/why';
test('ENTRY 493: why 1st is below 2nd, and the ties among the ten', () => {
  assert.equal(firstAgainstSecond(), "Hull scores lower than Burnley on four of the five topics (money, work and schools; housing: fuel poverty; environment and connectivity; crime), but Burnley's health score is far lower (6.0 against 12.5), so Burnley comes out lowest, by less than 0.1 points.");
  assert.deepEqual(tiesNotes(10), [{ after: 'city-of-doncaster', text: 'Barnsley, Hyndburn and City of Doncaster all round to 19.2; they are listed by their unrounded scores (19.175, 19.181 and 19.209).' }]);
  // The order follows the unrounded score.
  for (let i = 1; i < AREAS.length; i++) assert.ok(AREAS[i - 1].exact <= AREAS[i].exact, AREAS[i].slug);
});

// Cowork ENTRY 493 item 9 (owner approved 16:45): the towns line under each area name.
import { townsLine } from '../../app/council-areas/lowest-scores/data';
test('ENTRY 493: towns line, built from the two ONS sources', () => {
  assert.equal(townsLine(area('hyndburn')), 'Includes Accrington, Great Harwood, Oswaldtwistle and Clayton-le-Moors. The score covers the whole borough.');
  assert.equal(townsLine(area('north-east-lincolnshire')), 'Includes Grimsby, Cleethorpes, Humberston and New Waltham, and Immingham. The score covers the whole council area.');
  assert.equal(townsLine(area('hull')), 'The score covers the whole city.');
  for (const a of AREAS) assert.match(townsLine(a), /The score covers the whole (borough|city|district|council area)\.$/, a.slug);
  assert.ok(SOURCES.some((s) => s.label.startsWith('Towns under each area name: ONS')), 'towns source in the Sources fold');
});
