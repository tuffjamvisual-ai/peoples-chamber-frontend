// T1-MOB2 (4): a search of two or more words, not in quotes, puts the exact phrase first.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/question-phrase.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('the phrase searched first', async () => {
  const { phraseOf } = await import('../../lib/question-phrase');
  assert.equal(phraseOf('Public Duty Costs Allowance'), 'Public Duty Costs Allowance');
  assert.equal(phraseOf('  Public  Duty '), 'Public  Duty');
  assert.equal(phraseOf('"Public Duty Costs Allowance"'), null); // already a phrase search
  assert.equal(phraseOf('allowance'), null);                     // one word: nothing to put first
  assert.equal(phraseOf(''), null);
  assert.equal(phraseOf("Children's centres"), "Children's centres");
});
