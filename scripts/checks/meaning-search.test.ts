// Meaning search (Cowork ENTRY 390 GO): the key that leaves out of 'Related by meaning' what /search already lists.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/meaning-search.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seenKey, meaningDetail, MEANING_KINDS, MEANING_LABEL } from '@/lib/meaning/kinds';

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
test('each APPG is its own record on the APPG list', () => {
  assert.notEqual(seenKey('/transparency/appgs?q=A%20one'), seenKey('/transparency/appgs?q=B%20two'));
});
test('the line under a result: date, and a debate\'s House (Cowork ENTRY 390 PICTURES)', () => {
  assert.equal(meaningDetail('debate', '2025-03-12', 'Commons'), 'Commons debate · 12 Mar 2025');
  assert.equal(meaningDetail('debate', null, 'Lords'), 'Lords debate');
  assert.equal(meaningDetail('bill', '2026-11-03', null), 'Last updated 3 Nov 2026');
  assert.equal(meaningDetail('edm', '2025-06-04', 'Commons'), 'Tabled 4 Jun 2025');
  assert.equal(meaningDetail('petition', '2025-01-31', null), 'Opened 31 Jan 2025');
  assert.equal(meaningDetail('report', '2026-10-29', null), '29 Oct 2026');
  assert.equal(meaningDetail('mp', null, null), null);
  assert.equal(meaningDetail('bill', 'not a date', null), null);
});
