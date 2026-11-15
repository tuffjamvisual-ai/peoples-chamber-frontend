// T1-SOTN (COWORK-TO-T1 ENTRY 105): the State of the nation figures (lib/state-of-the-nation.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/state-of-the-nation.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodLabel, formatValue, changeText, fytd, onsFigure, reviewedFigure, headlineFour, ONS_SERIES, type Figure } from '../../lib/state-of-the-nation';

test('periods: months, rolling three months (named by the middle month), quarters', () => {
  assert.equal(periodLabel('2026 SEP', 'month'), 'September 2026');
  assert.equal(periodLabel('2026 JUL', 'lfs'), 'June to August 2026');
  assert.equal(periodLabel('2026 JAN', 'lfs'), 'December 2025 to February 2026');
  assert.equal(periodLabel('2026 Q3', 'quarter'), 'July to September 2026');
});

test('values and changes are written plainly, with no judgement', () => {
  assert.equal(formatValue(3.5, 'pct'), '3.5%');
  assert.equal(formatValue(691, 'thousands'), '691,000');
  assert.equal(formatValue(97832, 'gbp-m'), '£97.8bn');
  assert.equal(formatValue(3005, 'gbp-bn'), '£3,005bn');
  assert.equal(changeText(3.5, 3.1, 'August 2026', 'pct'), 'up from 3.1% in August 2026');
  assert.equal(changeText(4.7, 4.7, 'March to May 2026', 'pct'), 'the same as in March to May 2026');
});

test('financial year to date sums April to the latest month, and compares the same months a year earlier', () => {
  const months = [
    ...['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => ({ date: `2025 ${m}`, value: String(-(10 + i)) })),
    ...['JAN', 'FEB', 'MAR'].map((m) => ({ date: `2026 ${m}`, value: '-1' })),
    ...['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'].map((m) => ({ date: `2026 ${m}`, value: '-20' })),
  ];
  const r = fytd(months)!;
  assert.equal(r.sum, -120);
  assert.equal(r.prevSum, -(10 + 11 + 12 + 13 + 14 + 15));
  assert.equal(r.label, 'April to September 2026');
});

test('ONS figure: borrowing shown as a positive amount; LFS change compares the three months before; New within 7 days', () => {
  const b = ONS_SERIES.find((s) => s.id === 'borrowing-month')!;
  const now = Date.parse('2026-11-15T00:00:00Z');
  const f = onsFigure(b, { description: { title: 't', cdid: 'J5II', datasetId: 'PUSF', releaseDate: '2026-10-20T23:00:00.000Z' }, months: [{ date: '2026 AUG', value: '-17252' }, { date: '2026 SEP', value: '-24520' }] }, now);
  assert.equal(f.value, '£24.5bn');
  assert.equal(f.change, 'up from £17.3bn in August 2026');
  assert.equal(f.isNew, false);
  const u = ONS_SERIES.find((s) => s.id === 'unemployment')!;
  const months = ['APR', 'MAY', 'JUN', 'JUL'].map((m, i) => ({ date: `2026 ${m}`, value: String(4.4 + i * 0.1) }));
  const g = onsFigure(u, { description: { title: 't', cdid: 'MGSX', datasetId: 'LMS', releaseDate: '2026-11-11T00:00:00.000Z' }, months }, now);
  assert.equal(g.period, 'June to August 2026');
  assert.equal(g.change, 'up from 4.4% in March to May 2026');
  assert.equal(g.isNew, true);
});

test('reviewed figures show only when Cowork has checked them; otherwise "Not yet published here" (value null)', () => {
  const item = { id: 'bank-rate', group: 'Cost of living' as const, label: 'Bank Rate' };
  const entry = { value: '4.00%', period: 'from 6 November 2026', previous: 'down from 4.25%', sourceUrl: 'https://www.bankofengland.co.uk/', publishedOn: '2026-11-06', checkedOn: '2026-11-15', checkedBy: 'Cowork' };
  assert.equal(reviewedFigure(item, { 'bank-rate': entry }).value, '4.00%');
  assert.equal(reviewedFigure(item, { 'bank-rate': { ...entry, checkedBy: null } }).value, null);
  assert.equal(reviewedFigure(item, { 'bank-rate': { ...entry, checkedBy: 'T1' } }).value, null);
  assert.equal(reviewedFigure(item, {}).value, null);
});

test('homepage band: inflation, unemployment, borrowing this year, and NHS waits or else the Crown Court backlog', () => {
  const f = (id: string, value: string | null): Figure => ({ id, group: 'Economy', label: id, value, period: null, change: null, sourceUrl: null, sourceName: null, publishedOn: null, isNew: false });
  const base = [f('cpi', '3.5%'), f('unemployment', '4.7%'), f('borrowing-ytd', '£97.8bn'), f('crown-court', '80,829')];
  assert.deepEqual(headlineFour([...base, f('nhs-waiting', null)]).map((x) => x.id), ['cpi', 'unemployment', 'borrowing-ytd', 'crown-court']);
  assert.deepEqual(headlineFour([...base, f('nhs-waiting', '7.4m')]).map((x) => x.id), ['cpi', 'unemployment', 'borrowing-ytd', 'nhs-waiting']);
});
