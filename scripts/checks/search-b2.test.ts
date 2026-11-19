// /search stage B2 (Cowork ENTRY 384, ENTRY 390): word starts, names inside a sentence, some of the words, spelling and
// area codes. Pure logic only (lib/search/query-understanding.ts, lib/search-suggest.ts, lib/organisations.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/search-b2.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  keptWords, looseStages, looseScore, stemPrefix, nameWords, wordStartRe, startsWords,
  nameCore, peerCores, findNameRun, addCores, areaCode, nameLeads, orderCloseNames, atWordStart, type NameKind,
} from '../../lib/search/query-understanding';
import { buildVocabulary, suggestQuery } from '../../lib/search-suggest';

test('word starts: hmo is not inside Richmond, Edmonton or Mahmood', () => {
  for (const n of ['Richmond Park', 'Edmonton and Winchmore Hill', 'Khalid Mahmood', 'Lord Hague of Richmond']) assert.equal(startsWords(n, ['hmo']), false, n);
  assert.equal(startsWords('HMO Licensing Ltd', ['hmo']), true);
  assert.equal(startsWords('Richmond and Northallerton', ['north', 'rich']), true); // any order, word starts
  assert.equal(startsWords('Sinn Féin', ['fein']), true); // accents folded
});

test('word starts: the database filter takes letters and digits only', () => {
  assert.deepEqual(nameWords("O'Brien, (St.) Albans_%"), ['o', 'brien', 'st', 'albans']);
  assert.deepEqual(nameWords('a bc def', 2), ['bc', 'def']);
  assert.equal(wordStartRe('hmo'), '\\mhmo');
});

test('organisations on /search: the phrase at a word start (lib/organisations.ts searchOrganisations wordStart)', () => {
  assert.equal(atWordStart('Richmond Group Ltd', 'hmo'), false);
  assert.equal(atWordStart('The HMO Company', 'hmo'), true);
  assert.equal(atWordStart('Surfers Against Sewage', 'against sew'), true);
  assert.equal(atWordStart('Surfers Against Sewage', 'gainst'), false);
  assert.equal(atWordStart('Anything', '  '), false);
});

function index(): Map<string, NameKind[]> {
  const m = new Map<string, NameKind[]>();
  addCores(m, ['Shabana Mahmood', 'Esther McVey', 'Sir Keir Starmer', 'Kemi Badenoch'].map((n) => nameCore(n, 'mp')), 'mp');
  addCores(m, peerCores('Lord Hague of Richmond'), 'peer');
  addCores(m, [nameCore('Tim Bliss', 'spad')], 'spad');
  addCores(m, ['Wychavon District Council', 'Lewes District Council', 'Royal Borough of Kingston upon Thames'].map((n) => nameCore(n, 'council')), 'council');
  addCores(m, ['Wells and Mendip Hills', 'Yeovil', 'Bath'].map((n) => nameCore(n, 'constituency')), 'constituency');
  return m;
}

test('names inside a sentence: the longest whole name, the rest kept', () => {
  const m = index();
  assert.deepEqual(findNameRun('shabana mahmood salary', m), { start: 0, length: 2, kind: 'mp', name: 'shabana mahmood', rest: 'salary' });
  assert.equal(findNameRun('esther mcvey net worth', m)?.name, 'esther mcvey');
  assert.equal(findNameRun('keir starmer expenses', m)?.name, 'keir starmer'); // 'Sir' taken off
  assert.deepEqual(findNameRun('tim bliss special adviser', m), { start: 0, length: 2, kind: 'spad', name: 'tim bliss', rest: 'special adviser' });
  assert.deepEqual(findNameRun('wychavon population', m), { start: 0, length: 1, kind: 'council', name: 'wychavon', rest: 'population' });
  assert.equal(findNameRun('council tax in kingston upon thames', m)?.name, 'kingston upon thames');
  assert.equal(findNameRun('lord hague speeches', m)?.kind, 'peer');
  assert.equal(findNameRun('yeovil mp', m)?.name, 'yeovil');
});

test('names inside a sentence: no name, a whole-query name, or a lone surname gives nothing', () => {
  const m = index();
  for (const q of ['shabana mahmood', 'wychavon', 'hmo', 'uk council bankruptcies list', 'mahmood salary', 'food labelling', 'wells fargo']) assert.equal(findNameRun(q, m), null, q);
});

test('some of the words: filler dropped, then all but one, then any', () => {
  assert.deepEqual(keptWords('uk council bankruptcies list'), ['council', 'bankruptcies']);
  assert.deepEqual(keptWords('list of mps with second jobs 2026'), ['mps', 'second', 'jobs']);
  assert.deepEqual(looseStages('uk council bankruptcies list'), ['council bankruptcies', 'council or bankruptcies']);
  assert.deepEqual(looseStages('shabana mahmood salary'), ['mahmood salary or shabana salary or shabana mahmood', 'shabana or mahmood or salary']);
  assert.deepEqual(looseStages('sewige'), []);
  assert.deepEqual(looseStages('how many'), []);
});

test('some of the words: ranked by the words a title holds', () => {
  const ws = keptWords('uk council bankruptcies list');
  const a = looseScore(ws, "Council 'Bankruptcy' Notices in England and Wales: Every Section 114 Since 2018");
  const b = looseScore(ws, 'Council tax rises again', 'Bills up across England');
  const c = looseScore(ws, 'Something else', 'A council said so');
  assert.ok(a > b && b > c && c > 0, `${a} ${b} ${c}`);
  assert.equal(stemPrefix('bankruptcies'), 'bankruptc');
  assert.equal(stemPrefix('tax'), 'tax');
});

test('area codes', () => {
  assert.equal(areaCode(' e07000063 '), 'E07000063');
  assert.equal(areaCode('W06000015'), 'W06000015');
  assert.equal(areaCode('E1400123'), null);
  assert.equal(areaCode('lewes'), null);
});

test('spelling: sewige -> sewage from page words; the corrected search leads over an unrelated name', () => {
  const vocab = buildVocabulary(['Sewage Spills', 'sewage', 'Sewing', 'Kemi Badenoch']);
  assert.equal(suggestQuery('sewige', vocab), 'sewage');
  assert.equal(nameLeads('sewige', 'sewage', 'Sewing Together'), false);
  assert.equal(suggestQuery('badnoch', vocab), 'badenoch');
  assert.equal(nameLeads('badnoch', 'badenoch', 'Kemi Badenoch'), true);
  assert.equal(nameLeads('xyz', null, 'Kemi Badenoch'), true);
  assert.equal(nameLeads('xyz', 'abc', null), false);
});

test('close names: an MP before a donor of the same score', () => {
  const rows = [{ kind: 'donor', name: 'Kemi Badenoch', score: 0.375 }, { kind: 'mp', name: 'Kemi Badenoch', score: 0.375 }, { kind: 'donor', name: 'Better', score: 0.5 }];
  assert.deepEqual(orderCloseNames(rows).map((r) => `${r.kind}:${r.name}`), ['donor:Better', 'mp:Kemi Badenoch', 'donor:Kemi Badenoch']);
  // The live rows for 'badnoch' (did_you_mean, 19 Nov 2026): the MP is stored with her title and scores lower.
  const live = [{ kind: 'donor', name: ' Kemi Badenoch', score: 0.375 }, { kind: 'donor', name: ' Hamish A Badenoch', score: 0.3 }, { kind: 'mp', name: 'Mrs Kemi Badenoch', score: 0.3 }, { kind: 'donor', name: 'BAA', score: 0.2 }];
  assert.deepEqual(orderCloseNames(live).map((r) => r.kind + ':' + r.name.trim()), ['mp:Mrs Kemi Badenoch', 'donor:Kemi Badenoch', 'donor:Hamish A Badenoch', 'donor:BAA']);
  assert.equal(nameLeads('badnoch', 'badenoch', 'Mrs Kemi Badenoch'), true);
});
