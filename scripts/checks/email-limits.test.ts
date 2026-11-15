// Security review M2 (COWORK-TO-T1 ENTRY 59): limits on the sign-up routes that send email (lib/email-limits.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/email-limits.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { overIpLimit, dailyCapReached, utcDayStart, IP_MAX, IP_WINDOW_MS, DAILY_CAP } from '../../lib/email-limits';

test('per IP: the sixth request in an hour is refused; routes and IPs are counted apart; the window expires', () => {
  const t0 = 1_800_000_000_000;
  for (let i = 0; i < IP_MAX; i++) assert.equal(overIpLimit('newsletter', '1.2.3.4', t0 + i), false);
  assert.equal(overIpLimit('newsletter', '1.2.3.4', t0 + 10), true);
  assert.equal(overIpLimit('signup', '1.2.3.4', t0 + 10), false, 'another route');
  assert.equal(overIpLimit('newsletter', '5.6.7.8', t0 + 10), false, 'another IP');
  assert.equal(overIpLimit('newsletter', '1.2.3.4', t0 + IP_WINDOW_MS + 100), false, 'after an hour');
});

test('the day is the UTC day (Resend counts its allowance per UTC day)', () => {
  assert.equal(utcDayStart(new Date('2026-11-15T00:30:00Z')), '2026-11-15T00:00:00.000Z');
  assert.equal(utcDayStart(new Date('2026-11-14T23:59:00Z')), '2026-11-14T00:00:00.000Z');
});

const fake = (count: number | null, error: unknown = null) => {
  const seen: Record<string, unknown> = {};
  const db = { from: (t: string) => ({ select: () => ({ gte: (c: string, v: string) => { Object.assign(seen, { t, c, v }); return Promise.resolve({ count, error }); } }) }) };
  return { db: db as unknown as SupabaseClient, seen };
};

test('daily caps: counted from today (UTC) in the right table; at the cap, or unreadable, it is reached', async () => {
  const n = fake(DAILY_CAP.newsletter - 1);
  assert.equal(await dailyCapReached(n.db, 'newsletter', new Date('2026-11-15T05:00:00Z')), false);
  assert.deepEqual(n.seen, { t: 'newsletter_subscribers', c: 'last_sent_at', v: '2026-11-15T00:00:00.000Z' });
  assert.equal(await dailyCapReached(fake(DAILY_CAP.newsletter).db, 'newsletter'), true);
  const s = fake(DAILY_CAP.signup);
  assert.equal(await dailyCapReached(s.db, 'signup'), true);
  assert.equal(s.seen.t, 'users');
  assert.equal(s.seen.c, 'verification_sent_at');
  assert.equal(await dailyCapReached(fake(null, { message: 'down' }).db, 'signup'), true, 'unreadable counts as reached');
  assert.ok(DAILY_CAP.newsletter + 2 * DAILY_CAP.signup < 100, 'room left in Resend\'s 100 a day');
});
