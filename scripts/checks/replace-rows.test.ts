// Fable review finding 5: lib/replace-rows.ts never leaves a group empty, reads every error.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/replace-rows.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { replaceRows, ReplaceRowsError } from '../../lib/replace-rows';

type Row = { id: number; g: string; v: string };
// A small stand-in for the parts of supabase-js the helper uses.
function fakeDb(rows: Row[], fail: { insertAt?: number; delete?: boolean } = {}) {
  let next = 1000, inserts = 0;
  const db = {
    from: () => ({
      select: () => {
        const q = { col: '', val: '', last: 0, n: 1000 };
        const chain = {
          eq(c: string, v: string) { q.col = c; q.val = v; return chain; },
          gt(_c: string, v: number) { q.last = v; return chain; },
          order() { return chain; },
          limit(n: number) { q.n = n; return chain; },
          then(res: (x: unknown) => void) { res({ data: rows.filter((r) => (r as Record<string, unknown>)[q.col] === q.val && r.id > q.last).sort((a, b) => a.id - b.id).slice(0, q.n).map((r) => ({ id: r.id })), error: null }); },
        };
        return chain;
      },
      insert: (batch: Omit<Row, 'id'>[]) => ({
        select: async () => {
          inserts++;
          if (fail.insertAt === inserts) return { data: null, error: { message: 'insert refused' } };
          const added = batch.map((b) => ({ ...b, id: next++ }));
          rows.push(...added);
          return { data: added.map((a) => ({ id: a.id })), error: null };
        },
      }),
      delete: () => ({
        in: async (_c: string, ids: number[]) => {
          if (fail.delete) return { error: { message: 'delete refused' } };
          for (const id of ids) { const i = rows.findIndex((r) => r.id === id); if (i >= 0) rows.splice(i, 1); }
          return { error: null };
        },
      }),
    }),
  };
  return db as unknown as SupabaseClient;
}
const start = (): Row[] => [{ id: 1, g: 'a', v: 'old1' }, { id: 2, g: 'a', v: 'old2' }, { id: 3, g: 'b', v: 'other' }];
const fresh = (n: number) => Array.from({ length: n }, (_, i) => ({ g: 'a', v: `new${i}` }));

test('replaces only the group, new rows in, old rows out, other groups untouched', async () => {
  const rows = start();
  const r = await replaceRows(fakeDb(rows), 't', { col: 'g', val: 'a' }, fresh(3));
  assert.deepEqual(r, { inserted: 3, deleted: 2 });
  assert.deepEqual(rows.filter((x) => x.g === 'a').map((x) => x.v), ['new0', 'new1', 'new2']);
  assert.deepEqual(rows.filter((x) => x.g === 'b').map((x) => x.v), ['other']);
});

test('a failed insert keeps the old rows and removes what it had inserted', async () => {
  const rows = start();
  await assert.rejects(replaceRows(fakeDb(rows, { insertAt: 2 }), 't', { col: 'g', val: 'a' }, fresh(150)), ReplaceRowsError);
  assert.deepEqual(rows.filter((x) => x.g === 'a').map((x) => x.v), ['old1', 'old2']);
});

test('a failed delete raises, and the group still has rows (never empty)', async () => {
  const rows = start();
  await assert.rejects(replaceRows(fakeDb(rows, { delete: true }), 't', { col: 'g', val: 'a' }, fresh(2)), ReplaceRowsError);
  assert.ok(rows.filter((x) => x.g === 'a').length >= 2);
});

test('an empty new list removes the group (as delete with no insert did)', async () => {
  const rows = start();
  await replaceRows(fakeDb(rows), 't', { col: 'g', val: 'a' }, []);
  assert.equal(rows.filter((x) => x.g === 'a').length, 0);
});
