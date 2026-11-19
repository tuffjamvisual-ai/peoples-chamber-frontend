// Unit tests for lib/directory-match.ts and the directory's keywords (Cowork ENTRY 383, 19 Nov 2026): the owner's examples
// and the ten test searches find their pages, words match in any order, case, punctuation, accents and simple plurals do
// not matter, and the name ranks above the keywords and the keywords above the description. No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/directory-match.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScore, normalise, fold, queryWords, rankMatches } from '../../lib/directory-match';
import { DIRECTORY, KEYWORDS, searchDirectory } from '../../lib/directory';

const top = (q: string, n = 3) => searchDirectory(q, n).map((p) => p.href);

test('normalise: case, punctuation, apostrophes, & and accents', () => {
  assert.equal(normalise("  Prime Minister's  Questions! "), 'prime ministers questions');
  assert.equal(normalise('Sinn Féin'), 'sinn fein');
  assert.equal(normalise('A&E'), 'ae');
  assert.equal(normalise('Money & Power'), 'money power');
  assert.equal(normalise('HMOs (Houses in Multiple Occupation)'), 'hmos houses in multiple occupation');
});

test('fold: simple plurals', () => {
  assert.equal(fold('hmos'), 'hmo');
  assert.equal(fold('mps'), 'mp');
  assert.equal(fold('parties'), 'party');
  assert.equal(fold('taxes'), 'tax');
  assert.equal(fold('houses'), 'house');
  assert.equal(fold('bus'), 'bus');
  assert.equal(fold('address'), 'address');
});

test('joining words are not required, unless they are all there is', () => {
  assert.deepEqual(queryWords('what is the youth crime'), ['youth', 'crime']);
  assert.deepEqual(queryWords('the'), ['the']);
  assert.deepEqual(searchDirectory('the'), []);
});

test("owner's examples: youth crime, young offenders -> Youth Justice (knife crime removed, Cowork ENTRY 387)", () => {
  for (const q of ['youth crime', 'young offenders', 'Youth Crime', 'crime, youth', 'YOUTH-CRIME']) {
    assert.equal(top(q)[0], '/councils/youth-justice', q);
  }
});

test("owner's examples: HMO, bedsits, shared houses -> HMOs", () => {
  for (const q of ['HMO', 'hmos', 'bedsits', 'bedsit', 'shared houses', 'shared house', 'houses shared']) {
    assert.equal(top(q)[0], '/councils/hmos', q);
  }
});

test("owner's examples: MPs pay, salary -> MP Earnings", () => {
  for (const q of ['MPs pay', "MP's pay", 'mp pay', 'salary', 'MP salary']) {
    assert.equal(top(q)[0], '/earnings', q);
  }
});

test('knife crime is not put on Youth Justice (Cowork ENTRY 387: the page does not count knife offences)', () => {
  assert.deepEqual(top('knife crime'), []);
});

test('the other nine test searches each find a page', () => {
  const want: Record<string, string> = {
    'youth crime': '/councils/youth-justice',
    'hmo': '/councils/hmos',
    'bedsits': '/councils/hmos',
    'mp pay': '/earnings',
    'council tax': '/councils',
    'sewage': '/sewage',
    'asylum hotels': '/topics/immigration',
    'prison places': '/topics/justice-and-policing',
    'student loans': '/topics/education',
  };
  for (const [q, href] of Object.entries(want)) assert.ok(top(q, 8).includes(href), `${q} -> ${href}: ${top(q, 8).join(', ')}`);
  assert.ok(top('prison places', 8).includes('/transparency/state-dashboard'));
});

test('every word must be found, in any order', () => {
  const e = { title: 'Youth Justice', desc: 'Children given their first caution', keywords: ['youth crime'] };
  assert.ok(matchScore(e, 'crime youth') > 0);
  assert.ok(matchScore(e, 'justice caution') > 0);
  assert.equal(matchScore(e, 'youth sewage'), 0);
});

test('a short word is a whole word, unless it is the last word being typed', () => {
  const e = { title: 'Youth Justice', keywords: [] };
  assert.equal(matchScore(e, 'yo'), 0);
  assert.ok(matchScore(e, 'yo', { typing: true }) > 0);
  assert.ok(matchScore(e, 'yout') > 0);
  assert.ok(matchScore({ title: 'MP Earnings' }, 'mp') > 0);
});

test('rank: the name, then a keyword phrase, then the description', () => {
  const byName = { title: 'Sewage Spills', desc: '', keywords: [] };
  const byKeyword = { title: 'Local Section', desc: '', keywords: ['sewage'] };
  const byDesc = { title: 'Other', desc: 'Includes sewage figures', keywords: [] };
  assert.ok(matchScore(byName, 'sewage') > matchScore(byKeyword, 'sewage'));
  assert.ok(matchScore(byKeyword, 'sewage') > matchScore(byDesc, 'sewage'));
  assert.deepEqual(rankMatches([byDesc, byKeyword, byName], 'sewage').map((e) => e.title), ['Sewage Spills', 'Local Section', 'Other']);
});

test("another name for a page counts as its name ('Storm Overflows' finds Sewage Spills)", () => {
  assert.equal(top('storm overflows')[0], '/sewage');
});

test('every page in the directory has 3 to 8 keywords', () => {
  for (const e of DIRECTORY.filter((d) => !d.see)) {
    const k = KEYWORDS[e.href];
    assert.ok(k && k.length >= 3 && k.length <= 8, `${e.href}: ${k?.length ?? 0}`);
    assert.deepEqual(e.keywords, k);
  }
});
