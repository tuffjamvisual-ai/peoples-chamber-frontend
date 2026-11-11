// T1-MP: council suggestions for the "Find your local council" box (lib/council-suggest.ts).
// Run: npx tsx --test scripts/checks/council-suggest.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { similarity, suggestCouncils } from '../../lib/council-suggest';

const COUNCILS = [
  { slug: 'somerset', name: 'Somerset Council', short_name: 'Somerset' },
  { slug: 'north-somerset', name: 'North Somerset Council', short_name: 'North Somerset' },
  { slug: 'leeds', name: 'Leeds City Council', short_name: 'Leeds' },
  { slug: 'ynys-mon', name: 'Isle of Anglesey County Council', short_name: 'Ynys Môn' },
];

test('similarity: the same words score 1, unrelated words near 0', () => {
  assert.equal(similarity('Somerset', 'somerset'), 1);
  assert.ok(similarity('Somersett', 'Somerset') > 0.6);
  assert.ok(similarity('xyzxyz', 'Leeds') < 0.1);
});

test('a misspelt council is suggested, best first', () => {
  assert.deepEqual(suggestCouncils('Somersett', COUNCILS).map((c) => c.slug), ['somerset', 'north-somerset']);
  assert.deepEqual(suggestCouncils('Ynys Mon', COUNCILS).map((c) => c.slug), ['ynys-mon']);
});

test('nothing close, or too short, suggests nothing', () => {
  assert.deepEqual(suggestCouncils('xyzxyz', COUNCILS), []);
  assert.deepEqual(suggestCouncils('So', COUNCILS), []);
  assert.deepEqual(suggestCouncils('Danny Kruger', COUNCILS), []);
});
