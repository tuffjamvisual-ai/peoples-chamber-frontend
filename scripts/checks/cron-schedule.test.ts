// lib/cron-schedule.ts: the last time a vercel.json schedule fired (T1-PRESSWEEKDAY, COWORK-TO-T1 ENTRY 128).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/cron-schedule.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastFireAtOrBefore } from '../../lib/cron-schedule';

const last = (s: string, at: string) => lastFireAtOrBefore(s, new Date(at))?.toISOString() ?? null;

test('weekday ranges: the last run before Monday is Friday', () => {
  assert.equal(last('17 */2 * * 1-5', '2026-11-16T00:10:00Z'), '2026-11-13T22:17:00.000Z');
  assert.equal(last('17 */2 * * 1-5', '2026-11-16T03:00:00Z'), '2026-11-16T02:17:00.000Z');
});
test('a range with a step: odd hours', () => {
  assert.equal(last('16 1-23/2 * * *', '2026-11-15T12:00:00Z'), '2026-11-15T11:16:00.000Z');
  assert.equal(last('16 1-23/2 * * 1-5', '2026-11-15T12:00:00Z'), '2026-11-13T23:16:00.000Z');
});
test('the forms used before still match', () => {
  assert.equal(last('3 11,23 * * *', '2026-11-15T12:00:00Z'), '2026-11-15T11:03:00.000Z');
  assert.equal(last('20 2 * * 0', '2026-11-15T12:00:00Z'), '2026-11-15T02:20:00.000Z');
});
