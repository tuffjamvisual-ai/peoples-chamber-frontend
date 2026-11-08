// Unit tests for scripts/career-sync-filter.ts (PCL1, 8 Nov 2026): one bad record leaves out only its own entry; and
// elections contested and lost (PCL2, 8 Nov 2026).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/career-sync-filter.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keepValid, contestEntries, MAX_EXCLUDED, type Built } from '../career-sync-filter';
import { validate } from '../../lib/career-timeline';

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

// Elections contested and lost (PCL2, 8 Nov 2026). The Members API Biography record for Sarah Pochin (5403), as Parliament
// returns it: Bolton South East, 8 June 2017, not won; she won Runcorn and Helsby on 1 May 2025.
const pochinContest = { house: 1, name: 'Bolton South East', id: 3345, startDate: '2017-06-08T00:00:00', endDate: null, additionalInfo: null, additionalInfoLink: null };
const pochinSeat = { house: 1, name: 'Runcorn and Helsby', id: 4270, startDate: '2025-05-01T00:00:00', endDate: null };

test('a contested election becomes one dated elections entry, sourced to the career page, and passes validate()', () => {
  const { built, skipped } = contestEntries(5403, [pochinContest], [pochinSeat]);
  assert.equal(skipped, 0);
  assert.equal(built.length, 1);
  assert.deepEqual(built[0].entry, {
    group: 'elections', start: '2017-06-08', end: '2017-06-08',
    title: 'Contested Bolton South East, not elected',
    organisation: 'House of Commons', detail: null,
    source: { title: 'UK Parliament: Members API, career', url: 'https://members.parliament.uk/member/5403/career' },
  });
  assert.deepEqual(built[0].raw, pochinContest);
  assert.deepEqual(validate([built[0].entry]), []);
  assert.equal(keepValid(5403, 'Sarah Pochin MP', built).kept.length, 1);
});

test('a contest that is already a win in representations (same seat, same day) is not added twice', () => {
  const won = { ...pochinContest, name: 'Runcorn and Helsby', startDate: '2025-05-01T00:00:00' };
  const { built, skipped } = contestEntries(5403, [pochinContest, won], [pochinSeat]);
  assert.equal(skipped, 1);
  assert.deepEqual(built.map((b) => b.entry.title), ['Contested Bolton South East, not elected']);
});

test('the same seat contested on another day is kept (a loss before a later win)', () => {
  const earlier = { ...pochinContest, name: 'Runcorn and Helsby', startDate: '2024-07-04T00:00:00' };
  assert.equal(contestEntries(5403, [earlier], [pochinSeat]).built.length, 1);
});

test('no electionsContested list adds nothing', () => {
  assert.deepEqual(contestEntries(5403, undefined, [pochinSeat]), { built: [], skipped: 0 });
});

test('validate() rejects a contested election with a wrong title, no day, or an end that is not its day', () => {
  const ok = contestEntries(5403, [pochinContest], []).built[0].entry;
  assert.match(validate([{ ...ok, title: 'Contested Bolton South East, 2017, not elected' }])[0], /title must read "Contested <constituency>, not elected"/);
  assert.match(validate([{ ...ok, title: 'Contested Bolton South East, 9 June 2017, not elected' }])[0], /title must read "Contested <constituency>, not elected"/);
  assert.match(validate([{ ...ok, title: 'Contested Bolton South East' }])[0], /title must read "Contested <constituency>, not elected"/);
  assert.match(validate([{ ...ok, start: '2017', end: '2017' }])[0], /needs its day/);
  assert.match(validate([{ ...ok, end: 'present' }])[0], /ends on its own day/);
  assert.match(validate([{ ...ok, end: '2018-01-01' }])[0], /ends on its own day/);
});

test('until the nightly sync rewrites them, PCL2 titles dated to their own day still pass, so no page loses its timeline', () => {
  const ok = contestEntries(5403, [pochinContest], []).built[0].entry;
  assert.deepEqual(validate([{ ...ok, title: 'Contested Bolton South East, 8 June 2017, not elected' }]), []);
});
