// The search term log's rules (Cowork ENTRY 375 item 2): lib/search-terms.ts and the weekly summary's formatting.
// Run: npx tsx --tsconfig tsconfig.json --test scripts/checks/search-terms.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTerm, cleanResults, hourStart, homeBox, isSearchBox, retentionCutoff, searchLogRow, SEARCH_BOXES } from '../../lib/search-terms';
import { toMarkdown, statusLines, ukStamp } from '../search-terms-weekly.mjs';

test('cleanTerm: trimmed, spaces collapsed, lower case', () => {
  assert.equal(cleanTerm('  Keir   Starmer \n'), 'keir starmer');
  assert.equal(cleanTerm('HS2\tBudget'), 'hs2 budget');
  assert.equal(cleanTerm(''), null);
  assert.equal(cleanTerm('   '), null);
  assert.equal(cleanTerm(undefined), null);
  assert.equal(cleanTerm(42), null);
});

test('cleanTerm: at most 100 characters, never splitting a character', () => {
  assert.equal(cleanTerm('a'.repeat(150))!.length, 100);
  assert.equal(cleanTerm('😀'.repeat(120)), '😀'.repeat(100));
});

test('cleanTerm: an email address is dropped', () => {
  assert.equal(cleanTerm('jane.doe@example.com'), null);
  assert.equal(cleanTerm('contact Jane.Doe@Example.co.uk please'), null);
  assert.equal(cleanTerm('@MP twitter'), '@mp twitter'); // no address, so kept
});

test('cleanTerm: a phone number (7+ digits once spaces, dashes, brackets and + are removed) is dropped', () => {
  assert.equal(cleanTerm('07700 900123'), null);
  assert.equal(cleanTerm('+44 (0)20 7219-3000'), null);
  assert.equal(cleanTerm('call 0207 219 3000'), null);
  assert.equal(cleanTerm('1234567'), null);
  assert.equal(cleanTerm('123456'), '123456');
  assert.equal(cleanTerm('2024'), '2024');
  assert.equal(cleanTerm('hs2 2024'), 'hs2 2024');
});

test('cleanTerm: a full postcode keeps only its outward code', () => {
  assert.equal(cleanTerm('SW1A 1AA'), 'sw1a');
  assert.equal(cleanTerm('sw1a1aa'), 'sw1a');
  assert.equal(cleanTerm('M1 1AE'), 'm1');
  assert.equal(cleanTerm('B33 8TH'), 'b33');
  assert.equal(cleanTerm('cr2 6xh'), 'cr2');
  assert.equal(cleanTerm('EC1A 1BB'), 'ec1a');
  assert.equal(cleanTerm('GIR 0AA'), 'gir');
  assert.equal(cleanTerm('mp for SW1A 1AA'), 'mp for sw1a');
  assert.equal(cleanTerm('SW1A'), 'sw1a'); // an outward code alone is kept
  assert.equal(cleanTerm('Leeds'), 'leeds');
});

test('cleanResults: whole numbers from 0, or null; anything else refused', () => {
  assert.equal(cleanResults(0), 0);
  assert.equal(cleanResults(12), 12);
  assert.equal(cleanResults(null), null);
  assert.equal(cleanResults(undefined), null);
  assert.equal(cleanResults(-1), undefined);
  assert.equal(cleanResults(1.5), undefined);
  assert.equal(cleanResults('3'), undefined);
});

test('boxes and the homepage variants', () => {
  assert.deepEqual([...SEARCH_BOXES], ['site', 'home-site', 'councils', 'home-council', 'pmqs', 'home-pmqs', 'mps', 'home-mp']);
  assert.ok(isSearchBox('site'));
  assert.ok(!isSearchBox('admin'));
  assert.equal(homeBox('site', 'home'), 'home-site');
  assert.equal(homeBox('pmqs', 'home'), 'home-pmqs');
  assert.equal(homeBox('mps', 'home'), 'home-mp');
  assert.equal(homeBox('site', undefined), 'site');
  assert.equal(homeBox('site', 'other'), 'site');
});

test('hourStart: the start of the hour, UTC', () => {
  assert.equal(hourStart(new Date('2026-11-19T19:47:12.345Z')), '2026-11-19T19:00:00.000Z');
});

test('searchLogRow: only term, box, results and the hour are stored', () => {
  const now = new Date('2026-11-19T19:47:12Z');
  assert.deepEqual(searchLogRow({ term: ' Housing ', box: 'site', results: 3, ip: '1.2.3.4', ua: 'x' }, now),
    { term: 'housing', box: 'site', results: 3, at_hour: '2026-11-19T19:00:00.000Z' });
  assert.deepEqual(searchLogRow({ term: 'SW1A 1AA', box: 'home-council', results: 1 }, now),
    { term: 'sw1a', box: 'home-council', results: 1, at_hour: '2026-11-19T19:00:00.000Z' });
  assert.deepEqual(searchLogRow({ term: 'x', box: 'mps' }, now), { term: 'x', box: 'mps', results: null, at_hour: '2026-11-19T19:00:00.000Z' });
  assert.equal(searchLogRow({ term: 'a@b.com', box: 'site', results: 0 }, now), null);
  assert.equal(searchLogRow({ term: 'housing', box: 'nope', results: 0 }, now), null);
  assert.equal(searchLogRow({ term: 'housing', box: 'site', results: -2 }, now), null);
  assert.equal(searchLogRow({ term: '', box: 'site', results: 0 }, now), null);
  assert.equal(searchLogRow(null, now), null);
  assert.equal(searchLogRow(['housing'], now), null);
});

test('retentionCutoff: 13 months back, as Postgres counts months', () => {
  assert.equal(retentionCutoff(new Date('2026-11-19T03:37:00Z')), '2025-10-19T03:37:00.000Z');
  assert.equal(retentionCutoff(new Date('2027-03-31T03:37:00Z')), '2026-02-28T03:37:00.000Z');
  assert.equal(retentionCutoff(new Date('2026-01-15T00:00:00Z')), '2024-12-15T00:00:00.000Z');
});

const FIXTURE = {
  from: '2026-11-12T19:00:00Z', to: '2026-11-19T19:30:00Z', total: 7, zeroTotal: 2,
  boxes: [{ box: 'home-site', searches: 2 }, { box: 'site', searches: 5 }],
  top: [{ box: 'home-site', term: 'nhs', n: 2 }, { box: 'site', term: 'housing', n: 3 }, { box: 'site', term: 'a|b', n: 2 }],
  zero: [{ term: 'zzz', n: 2, boxes: ['site'] }],
};

test('weekly summary: Markdown per box in box order, and no results', () => {
  const out = toMarkdown(FIXTURE);
  assert.match(out, /^# Search terms, 2026-11-12 to 2026-11-19/);
  assert.match(out, /7 searches, 2 with no results\./);
  assert.ok(out.indexOf('## site (5 searches)') < out.indexOf('## home-site (2 searches)'));
  assert.match(out, /\| 1 \| housing \| 3 \|/);
  assert.match(out, /\| 2 \| a\\\|b \| 2 \|/);
  assert.match(out, /## No results \(top 20\)[\s\S]*\| 1 \| zzz \| 2 \| site \|/);
});

test('weekly summary: STATUS.md lines', () => {
  const now = new Date('2026-11-23T09:05:00Z');
  assert.equal(ukStamp(now), '23 Nov 2026 09:05 GMT');
  assert.equal(ukStamp(new Date('2026-07-01T09:05:00Z')), '1 Jul 2026 10:05 BST');
  assert.deepEqual(statusLines(FIXTURE, now), [
    '23 Nov 2026 09:05 GMT T1 SEARCH TERMS WEEK site: 5 searches; top "housing" 3, "a|b" 2.',
    '23 Nov 2026 09:05 GMT T1 SEARCH TERMS WEEK home-site: 2 searches; top "nhs" 2.',
    '23 Nov 2026 09:05 GMT T1 SEARCH TERMS WEEK no results: 2 searches; top "zzz" 2.',
  ]);
});
