// Unit tests for lib/bill-search.ts ("Find a bill" on /bills, BS1, 8 Nov 2026): case and punctuation do not matter, the
// reader's text is cleaned and cut to 100 characters. No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/bill-search.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billTitleMatches, cleanBillQuery, BILL_QUERY_MAX } from '../../lib/bill-search';

test('case does not matter', () => {
  assert.ok(billTitleMatches('Animal Shelters (Licensing) Bill', 'animal SHELTERS'));
});

test('brackets and other marks do not matter: "lords" finds "[Lords]" and a full title with brackets finds itself', () => {
  assert.ok(billTitleMatches('Planning and Infrastructure Bill [Lords]', 'lords'));
  assert.ok(billTitleMatches('Animal Shelters (Licensing) Bill', 'Animal Shelters (Licensing) Bill'));
  assert.ok(billTitleMatches('Animal Shelters (Licensing) Bill', 'shelters licensing'));
  assert.ok(billTitleMatches('E-Scooters (Safety and Sale) Bill [HL]', 'e scooters'));
});

test('apostrophes are dropped: "childrens" finds "Children\'s"', () => {
  assert.ok(billTitleMatches("Children's Wellbeing and Schools Bill", 'childrens'));
  assert.ok(billTitleMatches('Children’s Wellbeing and Schools Bill', "children's wellbeing"));
});

test('no match, and text with no letters or digits matches nothing', () => {
  assert.equal(billTitleMatches('Animal Shelters (Licensing) Bill', 'zzqxw'), false);
  assert.equal(billTitleMatches('Animal Shelters (Licensing) Bill', '(( ))'), false);
});

test('the text is trimmed, spaces collapsed and cut to 100 characters; anything else is no search', () => {
  assert.equal(cleanBillQuery('  high   speed  '), 'high speed');
  assert.equal(cleanBillQuery('x'.repeat(150)).length, BILL_QUERY_MAX);
  assert.equal(cleanBillQuery(['first', 'second']), 'first');
  assert.equal(cleanBillQuery(undefined), '');
});
