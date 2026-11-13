// Source down (Cowork 13 Nov 2026, COWORK-TO-T1 ENTRY 4): lib/source-status.ts and its use in lib/si-treaties-sync.ts.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/source-status.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sourceDownReason, markSourceDown, clearSourceDown, sourceDownMessage, SOURCE_PREFIX, DOWN_AFTER_ERRORS } from '../../lib/source-status';
import { runSiTreatiesSync, CURSOR_ROUTE } from '../../lib/si-treaties-sync';

// A stand-in for the Supabase client: every query chain resolves to no rows and no error, and writes to sync_cursor are
// kept, so a test can see what a run recorded.
function fakeDb(rows: Record<string, unknown> = {}, tables: Record<string, unknown[]> = {}) {
  const cursor = new Map<string, unknown>(Object.entries(rows));
  const writes: Array<{ table: string; op: string; value: unknown }> = [];
  const from = (table: string) => {
    let op = 'select';
    let key: string | null = null;
    let value: unknown = null;
    const chain: Record<string, unknown> = {};
    const self = new Proxy(chain, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => {
            if (table === 'sync_cursor' && op === 'upsert') { const v = value as { route: string; cursor: unknown }; cursor.set(v.route, v.cursor); }
            if (table === 'sync_cursor' && op === 'delete' && key) cursor.delete(key);
            if (op !== 'select') writes.push({ table, op, value: op === 'delete' ? key : value });
            const data = table === 'sync_cursor' && op === 'select' && key ? (cursor.has(key) ? { cursor: cursor.get(key), updated_at: new Date().toISOString() } : null) : op === 'select' ? (tables[table] ?? []) : null;
            resolve({ data, error: null, count: 0 });
          };
        }
        return (...args: unknown[]) => {
          if (prop === 'upsert' || prop === 'insert' || prop === 'update' || prop === 'delete') { op = prop; value = args[0]; }
          if (prop === 'eq' && args[0] === 'route') key = args[1] as string;
          return self;
        };
      },
    });
    return self;
  };
  return { db: { from } as unknown as SupabaseClient, cursor, writes };
}

test('down: no answers, only 5xx (and timeouts); the most common status is named', () => {
  assert.equal(sourceDownReason(0, ['HTTP 503', 'HTTP 503', 'timeout', 'HTTP 502']), 'HTTP 503');
  assert.equal(sourceDownReason(0, ['HTTP 500']), 'HTTP 500');
});

test('not down: any answer, a 4xx, a network error, timeouts only, or no calls', () => {
  assert.equal(sourceDownReason(1, ['HTTP 503']), null);
  assert.equal(sourceDownReason(0, ['HTTP 503', 'HTTP 404']), null);
  assert.equal(sourceDownReason(0, ['HTTP 503', 'network error: ECONNRESET']), null);
  assert.equal(sourceDownReason(0, ['timeout', 'timeout']), null);
  assert.equal(sourceDownReason(0, []), null);
});

test('marking keeps the first time it was seen and counts runs; clearing removes it', async () => {
  const { db, cursor } = fakeDb();
  const a = await markSourceDown(db, '/api/x', 'HTTP 503', new Date('2026-11-13T02:48:00Z'));
  const b = await markSourceDown(db, '/api/x', 'HTTP 503', new Date('2026-11-14T02:48:00Z'));
  assert.equal(a?.runs, 1);
  assert.equal(b?.runs, 2);
  assert.equal(b?.since, '2026-11-13T02:48:00.000Z');
  assert.equal(b?.lastSeenAt, '2026-11-14T02:48:00.000Z');
  assert.ok(cursor.has(SOURCE_PREFIX + '/api/x'));
  await clearSourceDown(db, '/api/x');
  assert.ok(!cursor.has(SOURCE_PREFIX + '/api/x'));
  assert.match(sourceDownMessage(b!), /^source unavailable \(HTTP 503\) since 2026-11-13 02:48 UTC, last seen 2026-11-14 02:48 UTC \(2 runs\); our sync ran and wrote nothing/);
});

test('statutory instruments sync: a source answering 503 returns 200, stops early, writes no rows and records the source as down', async () => {
  // Ten instruments waiting for their timelines, so the run would go on calling if it did not stop early.
  const { db, cursor, writes } = fakeDb({}, { statutory_instruments: Array.from({ length: 10 }, (_, i) => ({ api_id: `si${i}` })) });
  let calls = 0;
  const fetchFn = (async () => { calls++; return new Response('Service Unavailable', { status: 503 }); }) as typeof fetch;
  const r = await runSiTreatiesSync({ supabase: db, fetchFn, gapMs: 0, budgetMs: 60_000, log: () => {} });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.source_unavailable, 'HTTP 503');
  assert.ok(!('partial' in r.body), 'no partial flag, so it is not counted as a stalled pass');
  assert.equal(calls, DOWN_AFTER_ERRORS, `stops after ${DOWN_AFTER_ERRORS} server errors in a row`);
  assert.equal(writes.filter((w) => w.table !== 'sync_cursor').length, 0, 'no data rows written');
  assert.ok(cursor.has(SOURCE_PREFIX + CURSOR_ROUTE));
  const pass = cursor.get(CURSOR_ROUTE) as { pending: string[] } | undefined;
  assert.deepEqual(pass?.pending, ['si-list', 'si-flags', 'treaty-list', 'timelines'], 'its position is kept for the next run');
});

test('statutory instruments sync: when the source answers again, the record is cleared', async () => {
  const { db, cursor } = fakeDb({ [SOURCE_PREFIX + CURSOR_ROUTE]: { reason: 'HTTP 503', since: '2026-11-13T02:48:00Z', lastSeenAt: '2026-11-13T02:48:00Z', runs: 1 } });
  const fetchFn = (async () => new Response(JSON.stringify({ items: [], totalResults: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  const r = await runSiTreatiesSync({ supabase: db, fetchFn, gapMs: 0, budgetMs: 60_000, log: () => {} });
  assert.equal(r.status, 200);
  assert.ok(!('source_unavailable' in r.body));
  assert.ok(!cursor.has(SOURCE_PREFIX + CURSOR_ROUTE));
});
