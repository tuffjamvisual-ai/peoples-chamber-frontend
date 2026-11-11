// T1-DF (c): a missed cron window earlier than that cron's last schedule change does not alert.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/cron-since.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkedSchedules, scheduleSince, unrecorded } from '../../lib/cron-since';
import { lastFireAtOrBefore } from '../../lib/cron-schedule';

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8')) as { crons: Array<{ path: string; schedule: string }> };

test('every vercel.json cron has its current schedule recorded in scripts/data/cron-schedules.json', () => {
  assert.deepEqual(unrecorded(vercel.crons), [], 'set schedule and since (the push time) for these in scripts/data/cron-schedules.json');
});

test('sync-connectivity: the Monday 9 Nov 10:41 window came before the weekly schedule went live, so it is not checked', () => {
  const due = lastFireAtOrBefore('41 10 * * 1', new Date('2026-11-11T19:00:00Z'))!;
  assert.equal(due.toISOString(), '2026-11-09T10:41:00.000Z');
  assert.ok(due < scheduleSince('/api/sync-connectivity', '41 10 * * 1')!);
  const next = lastFireAtOrBefore('41 10 * * 1', new Date('2026-11-16T11:30:00Z'))!;
  assert.ok(next >= scheduleSince('/api/sync-connectivity', '41 10 * * 1')!, 'the 16 Nov run is checked');
});

test('a schedule changed but not yet recorded counts from the build that carries it', () => {
  const since = scheduleSince('/api/sync-connectivity', '41 10 * * 2', '2026-11-12T09:00:00Z');
  assert.equal(since?.toISOString(), '2026-11-12T09:00:00.000Z');
  assert.equal(scheduleSince('/api/a-new-cron', '1 1 * * *', null), null);
});

test('no recorded time is before the 27 Oct 2026 restagger', () => {
  for (const [route, schedule] of checkedSchedules(vercel.crons)) {
    assert.ok(scheduleSince(route, schedule)! >= new Date('2026-10-27T04:00:00Z'), route);
  }
});
