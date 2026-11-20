// Meaning search (Cowork ENTRY 390 GO): the key that leaves out of 'Related by meaning' what /search already lists.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/meaning-search.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seenKey, MEANING_KINDS, MEANING_LABEL } from '@/lib/meaning/kinds';

test('a report is the same record at /editorials/ and /briefings/', () => {
  assert.equal(seenKey('/editorials/k3p9w7nx2d'), seenKey('/briefings/k3p9w7nx2d'));
});
test('query and trailing slash ignored, a special adviser anchor kept', () => {
  assert.equal(seenKey('/councils/hmos?x=1'), '/councils/hmos');
  assert.equal(seenKey('/mps/3914/'), '/mps/3914');
  assert.notEqual(seenKey('/transparency/special-advisers#a-b'), seenKey('/transparency/special-advisers#c-d'));
});
test('every kind has a label', () => {
  for (const k of MEANING_KINDS) assert.ok(MEANING_LABEL[k]);
});
