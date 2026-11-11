// T1-DF (f): a bill read that times out at 30 s gets one retry at 45 s, only when the run has that time left.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/bill-sponsors-retries.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetries, REQUEST_MS, LONG_RETRY_MS, BillNotFoundError } from '../../lib/bill-sponsors-retries';

const timeout = () => Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
const plenty = { stopStarting: () => false };
const noSleep = async () => {};

test('a timeout at 30 s is tried again at 45 s, then at 30 s', async () => {
  const seen: number[] = [];
  const r = await withRetries(async (ms) => { seen.push(ms); if (seen.length < 3) throw timeout(); return 'ok'; }, plenty, noSleep);
  assert.equal(r, 'ok');
  assert.deepEqual(seen, [REQUEST_MS, LONG_RETRY_MS, REQUEST_MS]);
});

test('a 5xx is retried at 30 s, not 45 s', async () => {
  const seen: number[] = [];
  await withRetries(async (ms) => { seen.push(ms); if (seen.length < 2) throw new Error('Bills API 503'); return 1; }, plenty, noSleep);
  assert.deepEqual(seen, [REQUEST_MS, REQUEST_MS]);
});

test('no 45 s retry without 45 s (plus the wait) left in the run', async () => {
  const asked: number[] = [];
  const tight = { stopStarting: (ms: number) => { asked.push(ms); return ms > 20_000; } };
  await assert.rejects(withRetries(async () => { throw timeout(); }, tight, noSleep), /timeout/);
  assert.deepEqual(asked, [5_000 + LONG_RETRY_MS]);
});

test('a 404 is not retried', async () => {
  let n = 0;
  await assert.rejects(withRetries(async () => { n++; throw new BillNotFoundError(618); }, plenty, noSleep), BillNotFoundError);
  assert.equal(n, 1);
});
