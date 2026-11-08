// Unit tests for scripts/career-sync-filter.ts (PCL1, 8 Nov 2026): one bad record leaves out only its own entry.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/career-sync-filter.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keepValid, MAX_EXCLUDED, type Built } from '../career-sync-filter';

const src = { title: 'UK Parliament: Members API, career', url: 'https://members.parliament.uk/member/1521/career' };
// The Members API record for Sharon Hodgson's Ecclesiastical Committee membership, as Parliament returns it.
const badRaw = { house: 1, name: 'Ecclesiastical Committee', id: 1, startDate: '2005-07-19T00:00:00', endDate: '2005-05-05T00:00:00', additionalInfo: null };
const good: Built = { raw: { name: 'Work and Pensions Committee' }, entry: { group: 'committees', start: '2005-07-19', end: '2010-05-06', title: 'Work and Pensions Committee', organisation: 'House of Commons', detail: null, source: src } };
const seat: Built = { raw: { name: 'Washington and Gateshead South' }, entry: { group: 'elections', start: '2005-05-05', end: 'present', title: 'MP for Washington and Gateshead South', organisation: 'House of Commons', detail: null, source: src } };
const bad: Built = { raw: badRaw, entry: { group: 'committees', start: '2005-07-19', end: '2005-05-05', title: 'Ecclesiastical Committee', organisation: 'House of Commons', detail: null, source: src } };

test('an entry ending before it starts is left out on its own; the rest of the timeline is kept', () => {
  const { kept, excluded } = keepValid(1521, 'Mrs Sharon Hodgson MP', [seat, bad, good]);
  assert.deepEqual(kept, [seat.entry, good.entry]);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].member_id, 1521);
  assert.equal(excluded[0].name, 'Mrs Sharon Hodgson MP');
  assert.equal(excluded[0].reason, 'end (2005-05-05) is before start (2005-07-19)');
  assert.deepEqual(excluded[0].raw, badRaw);
  assert.deepEqual(excluded[0].entry, bad.entry);
});

test('the same day for start and end is kept', () => {
  const same: Built = { raw: {}, entry: { ...good.entry, start: '2021-06-16', end: '2021-06-16' } };
  assert.equal(keepValid(1, 'x', [same]).excluded.length, 0);
});

test('a year end in the same year as a full date start is kept (end compared by its last day)', () => {
  const year: Built = { raw: {}, entry: { ...good.entry, start: '2021-06-16', end: '2021' } };
  assert.equal(keepValid(1, 'x', [year]).excluded.length, 0);
});

test('an MP whose every entry is valid loses nothing', () => {
  const { kept, excluded } = keepValid(4658, 'Alex Sobel MP', [seat, good]);
  assert.equal(kept.length, 2);
  assert.equal(excluded.length, 0);
});

test('the stop limit is 10', () => {
  assert.equal(MAX_EXCLUDED, 10);
});
