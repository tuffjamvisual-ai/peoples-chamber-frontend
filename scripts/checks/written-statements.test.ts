// Unit tests for lib/written-statements.ts (WS1, 8 Nov 2026): validate(), the url builder, the ministerial periods, the
// count inside them and the "since" labels. No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/written-statements.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, statementUrl, statementDay, ministerialPeriods, countInPeriods, coverageLabel, STATEMENTS_FROM, ANSWERS_FROM } from '../../lib/written-statements';

// HCWS448 as Parliament's API returns it (8 Nov 2026), less the fields we do not use.
const HCWS448 = {
  id: 1764716, memberId: 4820, memberRole: 'Parliamentary Secretary for the Cabinet Office', uin: 'HCWS448',
  dateMade: '2025-02-12T00:00:00', answeringBodyId: 53, answeringBodyName: 'Cabinet Office',
  title: 'Security and Intelligence Agencies: Contingencies Fund Advance 2024-25', house: 'Commons',
};

test('validate: a complete record becomes a row with its url', () => {
  const { row, problems } = validate(HCWS448);
  assert.deepEqual(problems, []);
  assert.deepEqual(row, {
    id: 1764716, uin: 'HCWS448', house: 'Commons', member_id: 4820, member_role: 'Parliamentary Secretary for the Cabinet Office',
    date_made: '2025-02-12', title: 'Security and Intelligence Agencies: Contingencies Fund Advance 2024-25',
    answering_body_id: 53, answering_body_name: 'Cabinet Office',
    url: 'https://questions-statements.parliament.uk/written-statements/detail/2025-02-12/hcws448',
  });
});

test('validate: id, memberId and dateMade are required', () => {
  assert.match(validate({ ...HCWS448, id: undefined }).problems.join(), /id missing/);
  assert.match(validate({ ...HCWS448, memberId: null }).problems.join(), /memberId missing/);
  assert.match(validate({ ...HCWS448, dateMade: undefined }).problems.join(), /dateMade missing/);
  assert.equal(validate({ ...HCWS448, memberId: 0 }).row, null);
  assert.equal(validate({ ...HCWS448, id: '1764716' }).row, null);
});

test('validate: an impossible date is refused', () => {
  assert.equal(validate({ ...HCWS448, dateMade: '2025-02-30T00:00:00' }).row, null);
  assert.equal(statementDay('12 February 2025'), null);
});

test('validate: no uin keeps the row with no url; optional fields become null', () => {
  const { row } = validate({ id: 1, memberId: 2, dateMade: '2020-01-02T00:00:00' });
  assert.equal(row?.url, null);
  assert.equal(row?.uin, null);
  assert.equal(row?.title, null);
  assert.equal(row?.answering_body_id, null);
  assert.equal(row?.house, 'Commons');
});

test('url: built from the day and the uin in lower case', () => {
  assert.equal(statementUrl('2025-07-17', 'HCWS853'), 'https://questions-statements.parliament.uk/written-statements/detail/2025-07-17/hcws853');
  assert.equal(statementUrl('2014-11-17', 'HCWS1'), 'https://questions-statements.parliament.uk/written-statements/detail/2014-11-17/hcws1');
});

test('url: none without a uin, with an odd uin or a bad day', () => {
  assert.equal(statementUrl('2025-07-17', null), null);
  assert.equal(statementUrl('2025-07-17', 'HCWS 853'), null);
  assert.equal(statementUrl('2025-13-01', 'HCWS853'), null);
  assert.equal(statementUrl(null, 'HCWS853'), null);
});

test('periods: posts as inclusive day ranges, a current post running to today', () => {
  const posts = [{ startDate: '2024-07-09T00:00:00', endDate: '2025-09-06T00:00:00' }, { startDate: '2026-01-01T00:00:00', endDate: null }, { startDate: null, endDate: '2020-01-01' }];
  assert.deepEqual(ministerialPeriods(posts, '2026-11-08'), [{ from: '2024-07-09', to: '2025-09-06' }, { from: '2026-01-01', to: '2026-11-08' }]);
});

test('count: only statements inside a post count, edges included', () => {
  const periods = ministerialPeriods([{ startDate: '2024-07-09', endDate: '2025-09-06' }], '2026-11-08');
  assert.equal(countInPeriods(['2025-02-12', '2025-07-17'], periods), 2);
  assert.equal(countInPeriods(['2024-07-08', '2024-07-09', '2025-09-06', '2025-09-07'], periods), 2);
  assert.equal(countInPeriods(['2025-02-12'], []), 0);
});

test('since: labelled only when a post started before the data', () => {
  const p2024 = ministerialPeriods([{ startDate: '2024-07-09', endDate: '2025-09-06' }], '2026-11-08');
  const p2010 = ministerialPeriods([{ startDate: '2010-05-13', endDate: '2012-09-04' }, { startDate: '2024-07-09', endDate: null }], '2026-11-08');
  assert.equal(coverageLabel(p2024, STATEMENTS_FROM), null);
  assert.equal(coverageLabel(p2010, STATEMENTS_FROM), 'since 2014');
  assert.equal(coverageLabel(p2024, ANSWERS_FROM), null);
  assert.equal(coverageLabel(ministerialPeriods([{ startDate: '2022-10-26', endDate: null }], '2026-11-08'), ANSWERS_FROM), 'since July 2024');
});
