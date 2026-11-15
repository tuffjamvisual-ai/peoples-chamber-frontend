// T1-MPINCR (COWORK-TO-T1 ENTRY 125): the weekly top up counts each contribution once.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/mp-contributions-incremental.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyWindow, countedThrough, windowStart } from '../../lib/mp-contributions-incremental';

const c = (memberId: number, extId: string, day: string, text = 'one two three') => ({ memberId, extId, day, text });

test('counted through is the day before the last count; the window starts with a 2 day overlap', () => {
  assert.equal(countedThrough('2026-11-15T09:46:19Z'), '2026-11-14');
  assert.equal(windowStart(['2026-11-14', '2026-11-10']), '2026-11-09');
});

test('first weekly run (no overlap list): only days after each MP\'s count', () => {
  const through = new Map([[1, '2026-11-14'], [2, '2026-11-10']]);
  const r = applyWindow([c(1, 'a', '2026-11-14'), c(1, 'b', '2026-11-15'), c(2, 'x', '2026-11-10'), c(2, 'y', '2026-11-11'), c(3, 'z', '2026-11-15')], through, null, '2026-11-21');
  assert.deepEqual(r.add.get(1), { n: 1, words: 3 });
  assert.deepEqual(r.add.get(2), { n: 1, words: 3 });
  assert.equal(r.add.has(3), false); // no stored total: the per-MP count takes it
});

test('later runs: a late-published contribution in the overlap counts once; one already seen does not', () => {
  const through = new Map([[1, '2026-11-21']]);
  const seen = new Set(['old']);
  const r = applyWindow([c(1, 'old', '2026-11-21'), c(1, 'late', '2026-11-20'), c(1, 'new', '2026-11-25'), c(1, 'new', '2026-11-25')], through, seen, '2026-11-28');
  assert.deepEqual(r.add.get(1), { n: 2, words: 6 });
  assert.equal(r.skippedSeen, 1);
});

test('the overlap ids kept are the last 2 days of the window', () => {
  const r = applyWindow([c(1, 'a', '2026-11-26'), c(1, 'b', '2026-11-27'), c(1, 'd', '2026-11-28')], new Map([[1, '2026-11-21']]), new Set(), '2026-11-28');
  assert.deepEqual(r.keepIds.sort(), ['b', 'd']);
});
