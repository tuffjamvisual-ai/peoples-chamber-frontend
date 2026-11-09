// The Data Health Check's whip rule (JF1a): fail only when a Commons division arrived after the last whip rebuild.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/whip-health.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { whipVerdict } = require('../whip-health.js') as { whipVerdict: (a: { refreshedAt: string | null; newestAppliedAt: string | null; now: Date }) => { ok: boolean; detail: string } };

const now = new Date('2026-11-08T17:40:00Z'); // the Sunday run that failed

test('no new division for 3 days passes (a weekend or a recess)', () => {
  const v = whipVerdict({ refreshedAt: '2026-11-05T21:10:00Z', newestAppliedAt: '2026-11-05T21:05:00Z', now });
  assert.equal(v.ok, true);
  assert.match(v.detail, /^rebuilt 2 days ago; no division since/);
  assert.equal(whipVerdict({ refreshedAt: '2026-07-20T21:10:00Z', newestAppliedAt: '2026-07-20T21:05:00Z', now }).ok, true); // weeks of recess
});

test('a division after the last rebuild fails', () => {
  const v = whipVerdict({ refreshedAt: '2026-11-05T21:10:00Z', newestAppliedAt: '2026-11-06T14:00:00Z', now });
  assert.equal(v.ok, false);
  assert.equal(v.detail, 'a division arrived 2026-11-06 after the last rebuild (2026-11-05)');
});

test('a sync that has applied parties but not yet rebuilt gets an hour', () => {
  assert.equal(whipVerdict({ refreshedAt: '2026-11-05T21:10:00Z', newestAppliedAt: '2026-11-08T17:10:00Z', now }).ok, true);
  assert.equal(whipVerdict({ refreshedAt: '2026-11-05T21:10:00Z', newestAppliedAt: '2026-11-08T16:30:00Z', now }).ok, false);
});

test('never rebuilt fails; no division ever applied passes', () => {
  assert.deepEqual(whipVerdict({ refreshedAt: null, newestAppliedAt: '2026-11-06T14:00:00Z', now }), { ok: false, detail: 'never rebuilt' });
  assert.equal(whipVerdict({ refreshedAt: '2026-11-05T21:10:00Z', newestAppliedAt: null, now }).ok, true);
});
