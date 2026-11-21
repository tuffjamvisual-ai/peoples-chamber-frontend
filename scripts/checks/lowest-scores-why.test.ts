// The 'why it ranks here' generator for /council-areas/lowest-scores (Cowork ENTRY 444, app/council-areas/lowest-scores/
// why.ts): the ten why sentences as Cowork checked them in audit/worst-places-415/WHY-DRAFT.md, the Hull account, the
// weights, the item 4 check, and the house rules on all 294 sentences.
// Run: npx tsx --test scripts/checks/lowest-scores-why.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS } from '../../app/council-areas/lowest-scores/data';
import { areaCovered, effects, exactScore, shareWords, weightOf, weightingCheck, weightingSentence, whyAccount, whySentence } from '../../app/council-areas/lowest-scores/why';

const area = (slug: string) => AREAS.find((a) => a.slug === slug)!;

test('the ten why sentences match WHY-DRAFT.md', () => {
  const want = [
    'Housing and crime pulled the score down most. 13.3 per cent of households were in fuel poverty, and only ten council areas had a higher crime score.',
    'Crime and housing pulled the score down most. Only three council areas had a higher crime score, and 13.5 per cent of households were in fuel poverty.',
    'Housing and crime pulled the score down most. 12.9 per cent of households were in fuel poverty, and only 19 council areas had a higher crime score.',
    'Housing and health pulled the score down most. 14.8 per cent of households were in fuel poverty, the highest of the 294, and a baby born there can expect to live 78.2 years.',
    'Crime and housing pulled the score down most. Blackpool had the highest crime score of the 294, and 13.9 per cent of households were in fuel poverty.',
    'Below average on all five topics. Health and crime pulled the score down most. 74.4 per cent of adults were overweight or obese, and only 28 council areas had a higher crime score.',
    'Housing and health pulled the score down most. 13.5 per cent of households were in fuel poverty, and 75.1 per cent of adults were overweight or obese.',
    'Housing and crime pulled the score down most. 12.7 per cent of households were in fuel poverty, and only 16 council areas had a higher crime score.',
    'Below average on all five topics. Housing and crime pulled the score down most. 12.3 per cent of households were in fuel poverty, and only 32 council areas had a higher crime score.',
    'Below average on all five topics. Crime and housing pulled the score down most. Only 12 council areas had a higher crime score, and 12.1 per cent of households were in fuel poverty.',
  ];
  assert.deepEqual(AREAS.slice(0, 10).map(whySentence), want);
});

test('exact scores match the page data and the weights match the method', () => {
  for (const a of AREAS) for (const m of a.all) assert.ok(Math.abs(Math.round(exactScore(m) * 10) / 10 - m.score) < 0.051, `${a.slug} ${m.key}`);
  assert.equal(weightOf('Crime'), 0.2);
  assert.equal(weightOf('Housing'), 0.2);
  assert.equal(weightOf('Health'), 0.1);
  assert.equal(shareWords(weightOf('Money, work and schools')), '6 2/3 per cent');
  assert.equal(shareWords(weightOf('Environment and connectivity')), '4 per cent');
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
  assert.match(acc[0].text, /4th highest of the 294 council areas \(Indices of Deprivation 2025, crimes April 2018 to March 2024, MHCLG\)/);
  assert.match(acc[1].text, /^13\.5 per cent of households were in fuel poverty \(2024, DESNZ\), against a council area average of 9\.7 per cent: 5th worst of 294\. Fuel poverty is 20 per cent/);
  assert.match(acc[2].text, /99\.6 per cent .*\(January 2026, Ofcom\).*87\.5 per cent: best of 294\. Gigabit broadband is 4 per cent/);
});

test('item 4: nine of the ten stay in the bottom 20 under all seven weightings', () => {
  const c = weightingCheck();
  assert.equal(c.ways, 7);
  assert.equal(c.stayed, 9);
  assert.deepEqual(c.out.map((o) => o.name), ['Sandwell']);
  assert.equal(weightingSentence(c), 'We tried seven different ways of weighting the figures. Nine of these ten areas stayed in the bottom 20 every time.');
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
