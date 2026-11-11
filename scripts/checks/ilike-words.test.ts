// T1-QA9 A11: search words as one ilike pattern.  npx tsx --test scripts/checks/ilike-words.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ilikeWords } from '../../lib/ilike-words';
const like = (pattern: string, s: string) => new RegExp('^' + pattern.split('%').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i').test(s);
test('a council name with commas finds itself', () => {
  for (const n of ['Bournemouth, Christchurch and Poole Council', 'Armagh City, Banbridge and Craigavon Borough Council', 'Newry, Mourne and Down District Council']) {
    assert.ok(like(ilikeWords(n), n), n);
  }
  assert.ok(like(ilikeWords('Bournemouth Christchurch Poole'), 'Bournemouth, Christchurch and Poole Council'));
});
test('no wildcard or filter characters get through', () => {
  assert.equal(/[,()_]/.test(ilikeWords('a_b, (c)')), false);
  assert.equal(ilikeWords('  ,, '), '');
});
