// Year and month pages (Cowork ENTRY 367 item 3): the pure helpers in lib/year-pages.ts.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/year-pages.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareYearMonth, divisionMonthHref, monthCounts, monthName, monthOf, monthRange, neighbours, pmqsYearHref } from '../../lib/year-pages';

test('month names', () => {
  assert.equal(monthName(1), 'January');
  assert.equal(monthName(12), 'December');
  assert.equal(monthName(0), null);
  assert.equal(monthName(13), null);
});

test('the month in an address is two digits, 01 to 12', () => {
  assert.equal(monthOf('03'), 3);
  assert.equal(monthOf('12'), 12);
  for (const bad of ['3', '00', '13', '1a', 'page', '003', '']) assert.equal(monthOf(bad), null, bad);
});

test('month ranges end on the right day, leap years included', () => {
  assert.deepEqual(monthRange(2025, 3), { from: '2025-03-01', to: '2025-03-31' });
  assert.deepEqual(monthRange(2024, 2), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(monthRange(2025, 2), { from: '2025-02-01', to: '2025-02-28' });
  assert.deepEqual(monthRange(1990, 11), { from: '1990-11-01', to: '1990-11-30' });
});

test('addresses', () => {
  assert.equal(divisionMonthHref(2025, 3), '/divisions/year/2025/03');
  assert.equal(divisionMonthHref(2016, 11), '/divisions/year/2016/11');
  assert.equal(pmqsYearHref(1975), '/pmqs/year/1975');
});

test('previous and next skip years with nothing', () => {
  const years = [2004, 2005, 2010, 2011];
  const n = (a: number, b: number) => a - b;
  assert.deepEqual(neighbours(years, 2005, n), { previous: 2004, next: 2010 });
  assert.deepEqual(neighbours(years, 2004, n), { previous: null, next: 2005 });
  assert.deepEqual(neighbours(years, 2011, n), { previous: 2010, next: null });
  assert.deepEqual(neighbours([2011, 2004, 2010], 2007, n), { previous: 2004, next: 2010 });
});

test('previous and next months, across a year end', () => {
  const months = [{ year: 2024, month: 12 }, { year: 2025, month: 1 }, { year: 2025, month: 3 }];
  assert.deepEqual(neighbours(months, { year: 2025, month: 1 }, compareYearMonth), { previous: { year: 2024, month: 12 }, next: { year: 2025, month: 3 } });
  assert.deepEqual(neighbours(months, { year: 2025, month: 3 }, compareYearMonth), { previous: { year: 2025, month: 1 }, next: null });
});

test('month counts leave out empty months', () => {
  assert.deepEqual(monthCounts(['2025-03-04', '2025-01-02', '2025-03-05', 'bad']), [{ month: 1, count: 1 }, { month: 3, count: 2 }]);
  assert.deepEqual(monthCounts([]), []);
});
