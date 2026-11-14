// T2 ENTRY 1 item 3: the /pmqs search box reads a date typed in any of the usual ways.  npx tsx --test scripts/checks/pmqs-search.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datePrefix, cleanWords } from '../../lib/pmqs-words';

test('dates in the search box', () => {
  assert.equal(datePrefix('2019'), '2019');
  assert.equal(datePrefix('March 2019'), '2019-03');
  assert.equal(datePrefix('sept 2019'), '2019-09');
  assert.equal(datePrefix('21 October 2026'), '2026-10-21');
  assert.equal(datePrefix('21st Oct, 2026'), '2026-10-21');
  assert.equal(datePrefix('2026-10-21'), '2026-10-21');
  assert.equal(datePrefix('2026-7'), '2026-07');
  assert.equal(datePrefix('21/10/2026'), '2026-10-21');
});
test('words are not dates', () => {
  for (const w of ['food banks', 'Corbyn', 'may', 'May Day 2019', '1066', 'marching 2019', '12345']) assert.equal(datePrefix(w), null, w);
});
test('filter characters are dropped', () => {
  assert.equal(cleanWords('  a,(b)*  "c" '), 'a b c');
  assert.equal(cleanWords('x'.repeat(150)).length, 100);
});
