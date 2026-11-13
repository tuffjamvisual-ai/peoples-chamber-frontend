// MP contributions sync in batches that resume (Cowork 13 Nov 2026, COWORK-TO-T1 ENTRY 4): lib/mp-contributions-sync.ts.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/mp-contributions-sync.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countMember, planQueue, yesterday, PAGE, RESUME_MAX_DAYS, RUN_BUDGET_MS, START_CUTOFF_MS, type FetchPage, type InProgress } from '../../lib/mp-contributions-sync';

const NOW = new Date('2026-11-13T15:43:00Z');

// A fake Hansard: `n` speeches of `w` words each, in pages of PAGE. Each page read moves a fake clock on by `ms`.
function hansard(n: number, w = 3, ms = 0) {
  let t = 0;
  const seen: Array<{ skip: number; endDate: string }> = [];
  const fetchPage: FetchPage = async (_id, skip, endDate) => {
    seen.push({ skip, endDate });
    t += ms;
    const k = Math.max(0, Math.min(PAGE, n - skip));
    return { total: n, texts: Array.from({ length: k }, () => Array(w).fill('word').join(' ')) };
  };
  return { fetchPage, seen, clock: () => t };
}

test('the run budget is well under the 300 s limit, and no MP starts late', () => {
  assert.ok(RUN_BUDGET_MS <= 200_000);
  assert.ok(START_CUTOFF_MS < RUN_BUDGET_MS);
});

test('an MP read in one go gives the total and every word', async () => {
  const h = hansard(250, 4);
  const r = await countMember(1, null, h.fetchPage, { deadline: Infinity, now: NOW, clock: h.clock });
  assert.deepEqual(r, { kind: 'done', total: 250, words: 1000 });
  assert.deepEqual(h.seen.map((x) => x.skip), [0, 100, 200]);
  assert.ok(h.seen.every((x) => x.endDate === yesterday(NOW)), 'every page has the same fixed end date');
});

test('out of time part way: the position is kept, and resuming gives the same result as one long run', async () => {
  const h = hansard(1050, 2, 10_000); // each page takes 10 s of the fake clock
  const first = await countMember(7, null, h.fetchPage, { deadline: 35_000, now: NOW, clock: h.clock });
  assert.equal(first.kind, 'paused');
  const st = (first as { state: InProgress }).state;
  assert.equal(st.skip, 400); // pages start at 0, 10, 20 and 30 s; at 40 s less than 1 s is left before 35 s
  assert.equal(st.words, 800);
  assert.equal(st.total, 1050);
  const h2 = hansard(1050, 2);
  const second = await countMember(7, st, h2.fetchPage, { deadline: Infinity, now: new Date('2026-11-13T21:43:00Z'), clock: h2.clock });
  assert.deepEqual(second, { kind: 'done', total: 1050, words: 2100 });
  assert.equal(h2.seen[0].skip, 400, 'carries on from the next page, not from the start');
  assert.ok(h2.seen.every((x) => x.endDate === st.endDate), 'keeps the end date fixed when the count started');
});

test('a page that fails keeps what was read; nothing is counted twice; a first page failure saves nothing', async () => {
  let calls = 0;
  const flaky: FetchPage = async () => { calls++; if (calls === 2) throw new Error('HTTP 503'); return { total: 300, texts: Array(PAGE).fill('a b') }; };
  const r = await countMember(3, null, flaky, { deadline: Infinity, now: NOW });
  assert.equal(r.kind, 'paused');
  assert.equal((r as { state: InProgress }).state.skip, 100);
  const none = await countMember(3, null, async () => { throw new Error('HTTP 503'); }, { deadline: Infinity, now: NOW });
  assert.equal(none.kind, 'failed');
});

test('a 429 is passed up so the run stops cleanly', async () => {
  class Stop extends Error {}
  await assert.rejects(countMember(3, null, async () => { throw new Stop('429'); }, { deadline: Infinity, now: NOW, isStop: (e) => e instanceof Stop }), Stop);
});

test('an MP with no speeches is done with 0', async () => {
  const h = hansard(0);
  assert.deepEqual(await countMember(9, null, h.fetchPage, { deadline: Infinity, now: NOW }), { kind: 'done', total: 0, words: 0 });
});

test('queue: MPs part way first (oldest start first), then never counted, then stalest; old or former MPs dropped', () => {
  const at = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();
  const cursor = { inProgress: {
    '5': { skip: 100, words: 1, total: 900, endDate: '2026-11-12', startedAt: at(6) } as InProgress,
    '6': { skip: 100, words: 1, total: 900, endDate: '2026-11-12', startedAt: at(12) } as InProgress,
    '7': { skip: 100, words: 1, total: 900, endDate: '2026-11-09', startedAt: at(RESUME_MAX_DAYS * 24 + 1) } as InProgress,
    '99': { skip: 100, words: 1, total: 900, endDate: '2026-11-12', startedAt: at(1) } as InProgress,
  } };
  const synced = new Map([[1, at(10)], [2, at(50)], [5, at(100)], [6, at(100)], [7, at(5)]]);
  const { queue, resume } = planQueue([1, 2, 3, 5, 6, 7], synced, cursor, NOW, 10);
  assert.deepEqual(queue, [6, 5, 3, 2, 1, 7]);
  assert.deepEqual([...resume.keys()].sort(), [5, 6], 'a position older than the limit, or for a former MP, is dropped');
  assert.deepEqual(planQueue([1, 2, 3], new Map(), null, NOW, 2).queue, [1, 2], 'the batch limit applies');
});
