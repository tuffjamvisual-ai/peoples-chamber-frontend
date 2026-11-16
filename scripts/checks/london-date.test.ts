// Date rules worked out in the browser (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 140): the day before, the day of and the
// day after each change, and around midnight in London in winter (GMT) and summer (BST).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/london-date.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { londonDay, addDays, daysBetween, isRecent, monthPassed, dayNumber } from '@/lib/london-date';
import { onDay } from '@/lib/pac-dated';
import { rotate } from '@/lib/home-rotation';
import { billsWindow, divisionsFrom } from '@/lib/this-week-window';

test('londonDay around midnight: GMT in winter, BST in summer', () => {
  assert.equal(londonDay(new Date('2026-11-15T23:59:59Z')), '2026-11-15'); // GMT: still the 15th
  assert.equal(londonDay(new Date('2026-11-16T00:00:00Z')), '2026-11-16');
  assert.equal(londonDay(new Date('2026-06-30T22:59:59Z')), '2026-06-30'); // BST: 23:59:59 on the 30th
  assert.equal(londonDay(new Date('2026-06-30T23:00:00Z')), '2026-07-01'); // BST: midnight, already 1 July in London
  assert.equal(londonDay(new Date('2026-03-29T00:30:00Z')), '2026-03-29'); // the night the clocks go forward
  assert.equal(londonDay(new Date('2026-10-24T23:30:00Z')), '2026-10-25'); // BST until the clocks go back
});

test('addDays and daysBetween across month and year ends', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-10-25', '2026-10-26'), 1); // the day the clocks go back is still one day
  assert.equal(dayNumber('1970-01-02'), 1);
});

test('"new" mark: the publication day and the 6 days after', () => {
  assert.equal(isRecent('2026-11-10', 7, '2026-11-09'), false); // the day before publication
  assert.equal(isRecent('2026-11-10', 7, '2026-11-10'), true);  // the day of
  assert.equal(isRecent('2026-11-10', 7, '2026-11-16'), true);  // the sixth day after
  assert.equal(isRecent('2026-11-10', 7, '2026-11-17'), false); // the seventh day after
  assert.equal(isRecent(null, 7, '2026-11-10'), false);
  // Midnight in London decides, not UTC: 23:30 UTC on 16 Nov is still the 16th in London in winter...
  assert.equal(isRecent('2026-11-10', 7, londonDay(new Date('2026-11-16T23:30:00Z'))), true);
  // ...but in summer 23:30 UTC on 16 June is already the 17th in London.
  assert.equal(isRecent('2026-06-10', 7, londonDay(new Date('2026-06-16T23:30:00Z'))), false);
});

test('target passed: once the target month is over in London', () => {
  assert.equal(monthPassed('2026-10-01', '2026-10-31'), false); // the last day of the month
  assert.equal(monthPassed('2026-10-01', '2026-11-01'), true);  // the first day after
  assert.equal(monthPassed('2026-10-01', '2026-09-30'), false);
  assert.equal(monthPassed(null, '2026-11-01'), false);
  // 31 October 23:30 UTC is 31 October in London (GMT): not yet passed. 31 August 23:30 UTC is 1 September (BST): passed.
  assert.equal(monthPassed('2026-10-01', londonDay(new Date('2026-10-31T23:30:00Z'))), false);
  assert.equal(monthPassed('2026-08-01', londonDay(new Date('2026-08-31T23:30:00Z'))), true);
  const d = { base: 'Target still to come', month: '2026-10-01', passed: 'Target passed' };
  assert.equal(onDay(d, '2026-10-31'), 'Target still to come');
  assert.equal(onDay(d, '2026-11-01'), 'Target passed');
  assert.equal(onDay({ base: 'Delivered' }, '2030-01-01'), 'Delivered');
});

test('homepage rotation: the same shuffle as before, a new order each day, the held lead first', () => {
  const pool = Array.from({ length: 16 }, (_, i) => ({ slug: `r${i}` }));
  // The rule as it was in app/page.tsx before ENTRY 140, for comparison.
  const old = (day: number) => { const s = [...pool]; let seed = day; for (let i = s.length - 1; i > 0; i--) { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; const p = seed % (i + 1); [s[i], s[p]] = [s[p], s[i]]; } return s; };
  const day = dayNumber('2026-11-16');
  assert.deepEqual(rotate(pool, day, '', null), old(day));
  assert.notDeepEqual(rotate(pool, day, '', null).map((x) => x.slug), rotate(pool, day + 1, '', null).map((x) => x.slug));
  assert.equal(rotate(pool, day, 'r5', null)[0].slug, 'r5');
  assert.equal(rotate(pool, day, 'older', { slug: 'older' })[0].slug, 'older');
});

test('this week: bills today to six days ahead; votes from the Monday of last week', () => {
  assert.deepEqual(billsWindow('2026-11-16'), { start: '2026-11-16', end: '2026-11-22' });
  assert.equal(divisionsFrom('2026-11-16'), '2026-11-09'); // a Monday: the Monday a week before
  assert.equal(divisionsFrom('2026-11-22'), '2026-11-09'); // the Sunday after: the same
  assert.equal(divisionsFrom('2026-11-23'), '2026-11-16'); // the next Monday moves on a week
});
