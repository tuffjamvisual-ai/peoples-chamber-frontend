// Unit tests for scripts/refresh-pages.ts and the statements sync's change detection (PR1, 8 Nov 2026): the stable hash,
// the 700 page cap, retries (500 then 200; four 500s; a 429 stops at once), no CRON_SECRET, the dry run, IndexNow getting
// only the refreshed pages, and the fallback queue. No network or database: fetch, sleep, IndexNow and the queue are stand-ins.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/refresh-pages.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshPages, stableHash, MAX_PATHS, type RefreshDeps } from '../refresh-pages';
import { changedMembers } from '../sync-written-statements';

// Stand-ins: answers is the list of HTTP statuses (or 'none' for no answer) returned in turn; everything is recorded.
function fake(answers: Array<number | 'none'>) {
  const calls: string[] = [], sleeps: number[] = [], logs: string[] = [], indexed: string[][] = [], queued: number[][] = [];
  let i = 0;
  const deps: RefreshDeps = {
    fetch: async (_url, init) => {
      calls.push(JSON.parse(String(init.body)).paths[0]);
      const a = answers[Math.min(i++, answers.length - 1)];
      if (a === 'none') throw new Error('fetch failed');
      return new Response('{}', { status: a });
    },
    sleep: async (ms) => { sleeps.push(ms); },
    log: (l) => { logs.push(l); },
    indexNow: async (p) => { indexed.push(p); return { sent: p.length, already: 0, status: 200 }; },
    queue: async (ids) => { queued.push(ids); return `queued ${ids.length}`; },
  };
  return { deps, calls, sleeps, logs, indexed, queued };
}
const run = (paths: string[], f: ReturnType<typeof fake>, extra: { dryRun?: boolean; secret?: string } = {}) =>
  refreshPages(paths, { secret: 'secret' in extra ? extra.secret : 'test-secret', base: 'http://localhost:1', dryRun: extra.dryRun, deps: f.deps });

test('hash: a changed value differs', () => {
  assert.notEqual(stableHash([{ group: 'elections', title: 'MP for A' }]), stableHash([{ group: 'elections', title: 'MP for B' }]));
});

test('hash: the same value is unchanged; null and missing are the same', () => {
  const v = [{ group: 'posts', title: 'Minister', start: '2024-07-09', end: null }];
  assert.equal(stableHash(v), stableHash(JSON.parse(JSON.stringify(v))));
  assert.equal(stableHash(null), stableHash(undefined));
});

test('hash: reordered keys (as jsonb stores them) are unchanged; reordered entries are a change', () => {
  assert.equal(stableHash([{ title: 'X', group: 'bills', source: { url: 'https://a', title: 'T' } }]), stableHash([{ group: 'bills', source: { title: 'T', url: 'https://a' }, title: 'X' }]));
  assert.notEqual(stableHash([{ a: 1 }, { a: 2 }]), stableHash([{ a: 2 }, { a: 1 }]));
});

test('cap: 705 pages, the first 700 refreshed, 5 left and queued', async () => {
  const f = fake([200]);
  const paths = Array.from({ length: 705 }, (_, i) => `/mps/${i + 1}`);
  const r = await run(paths, f);
  assert.equal(f.calls.length, MAX_PATHS);
  assert.equal(r.refreshed.length, 700);
  assert.equal(r.overCap, 5);
  assert.deepEqual(f.queued, [[701, 702, 703, 704, 705]]);
  assert.match(f.logs.join('\n'), /705 pages changed, more than the 700 a run: refreshing the first 700, 5 left/);
});

test('retries: a 500 then a 200 refreshes the page after one retry of 2 seconds', async () => {
  const f = fake([500, 200]);
  const r = await run(['/mps/242'], f);
  assert.deepEqual(r.refreshed, ['/mps/242']);
  assert.equal(f.calls.length, 2);
  assert.ok(f.sleeps.includes(2000));
  assert.match(f.logs.join('\n'), /retry 1 of 3: \/mps\/242, HTTP 500/);
  assert.deepEqual(f.indexed, [['/mps/242']]);
  assert.deepEqual(f.queued, []);
});

test('retries: four 500s fail the page after 2, 4 and 8 seconds and stop; the rest are queued', async () => {
  const f = fake([500, 500, 500, 500]);
  const r = await run(['/mps/1', '/mps/2', '/mps/3'], f);
  assert.equal(f.calls.length, 4);
  assert.deepEqual(f.sleeps.filter((s) => s >= 2000), [2000, 4000, 8000]);
  assert.deepEqual(r.failed.map((x) => x.path), ['/mps/1']);
  assert.deepEqual(r.notRefreshed, ['/mps/2', '/mps/3']);
  assert.match(r.stopped ?? '', /HTTP 500 on \/mps\/1 after 3 retries/);
  assert.deepEqual(f.queued, [[1, 2, 3]]);
  assert.deepEqual(f.indexed, []);
});

test('no answer is retried like a 5xx', async () => {
  const f = fake(['none', 200]);
  const r = await run(['/mps/7'], f);
  assert.deepEqual(r.refreshed, ['/mps/7']);
  assert.match(f.logs.join('\n'), /no answer/);
});

test('a 429 (bot protection) stops at once with no retry; those pages are queued', async () => {
  const f = fake([200, 429]);
  const r = await run(['/mps/1', '/mps/2', '/mps/3'], f);
  assert.equal(f.calls.length, 2);
  assert.equal(f.sleeps.filter((s) => s >= 2000).length, 0);
  assert.deepEqual(r.refreshed, ['/mps/1']);
  assert.deepEqual(r.notRefreshed, ['/mps/2', '/mps/3']);
  assert.match(r.stopped ?? '', /HTTP 429/);
  assert.deepEqual(f.indexed, [['/mps/1']]);
  assert.deepEqual(f.queued, [[2, 3]]);
});

test('dry run: nothing fetched, sent to IndexNow or queued; the pages are listed', async () => {
  const f = fake([200]);
  const r = await run(['/mps/5403', '/mps/4320'], f, { dryRun: true });
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.indexed, []);
  assert.deepEqual(f.queued, []);
  assert.equal(r.refreshed.length, 0);
  assert.match(f.logs.join('\n'), /dry run: would refresh 2 page\(s\): \/mps\/5403 \/mps\/4320/);
});

test('no CRON_SECRET: nothing fetched; the MP pages go to the queue', async () => {
  const f = fake([200]);
  const r = await run(['/mps/9', '/mps/9'], f, { secret: '' });
  assert.equal(f.calls.length, 0);
  assert.equal(r.requested, 1);
  assert.match(r.stopped ?? '', /CRON_SECRET is not set/);
  assert.deepEqual(f.queued, [[9]]);
});

test('statements: only members with a new or changed row', () => {
  const row = (id: number, member: number, title: string) => ({ id, uin: `HCWS${id}`, house: 'Commons', member_id: member, member_role: 'Minister', date_made: '2026-11-02', title, answering_body_id: 53, answering_body_name: 'Cabinet Office', url: `https://questions-statements.parliament.uk/written-statements/detail/2026-11-02/hcws${id}` });
  const fetched = [row(1, 10, 'Same'), row(2, 20, 'New title'), row(3, 30, 'Brand new')];
  // As the database returns them: synced_at extra, answering_body_id as a string, keys in another order.
  const stored = [{ ...row(1, 10, 'Same'), answering_body_id: '53' as unknown as number, synced_at: 'x' }, { ...row(2, 20, 'Old title') }];
  assert.deepEqual([...changedMembers(fetched, stored)].sort(), [20, 30]);
});
