// Unit tests for lib/search-suggest.ts ("Did you mean" on /search, SR1, 8 Nov 2026). No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/search-suggest.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVocabulary, suggestQuery, editDistance } from '../../lib/search-suggest';

const vocab = buildVocabulary(['Finance Bill', 'Finance Act 2020', 'Financial Services Bill', "Children's Wellbeing and Schools Bill", 'Planning and Infrastructure Bill [HL]', 'Keir Starmer', 'Pride in Place money in Thamesmead']);

test('swapped letters are one edit', () => {
  assert.equal(editDistance('finanec', 'finance', 2), 1);
  assert.equal(editDistance('bill', 'bill', 1), 0);
});

test('"Finanec Bill" offers "Finance Bill", in the reader\'s case', () => {
  assert.equal(suggestQuery('Finanec Bill', vocab), 'Finance Bill');
  assert.equal(suggestQuery('finanec bill', vocab), 'finance bill');
  assert.equal(suggestQuery('FINANEC BILL', vocab), 'FINANCE BILL');
});

test('known words, or nothing to change: no suggestion', () => {
  assert.equal(suggestQuery('Finance Bill', vocab), null);
  assert.equal(suggestQuery('', vocab), null);
});

test('a nonsense word, or any word that cannot be matched, gives no suggestion', () => {
  assert.equal(suggestQuery('qzxvbnm', vocab), null);
  assert.equal(suggestQuery('Finanec qzxvbnm', vocab), null);
});

test('cautious: the first letter must match, one edit for short words, two for six letters or more', () => {
  assert.equal(suggestQuery('Ginance', vocab), null);       // first letter differs
  assert.equal(suggestQuery('Bil', vocab), 'Bill');          // one edit, short word
  assert.equal(suggestQuery('Bxxl', vocab), null);           // two edits, short word
  assert.equal(suggestQuery('Starmmr', vocab), 'Starmer');   // one edit, long word
  assert.equal(suggestQuery('Thamesmaed', vocab), 'Thamesmead');
});

test('numbers are never changed', () => {
  assert.equal(suggestQuery('Finanec Act 2021', vocab), null);
  assert.equal(suggestQuery('Finanec Act 2020', vocab), 'Finance Act 2020');
});
