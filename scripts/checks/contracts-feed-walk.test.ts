// T1-CS: the contracts sync reads the newest releases first every run, and a failed page is never the end of the feed.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/contracts-feed-walk.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkFeed, readState, windowFrom, type PageResult, type WalkState } from '../../app/api/sync-government-contracts/feed-walk';

const API = 'https://feed.test/releases';
const NOW = Date.parse('2026-11-13T01:53:00Z');

// A fake feed, newest first: pages keyed by url; a url in `fail` answers the given error.
function feed(pages: Record<string, { dates: string[]; next?: string }>, fail: Record<string, PageResult> = {}) {
  const asked: string[] = [];
  return {
    asked,
    fetchPage: async (url: string): Promise<PageResult> => {
      asked.push(url);
      if (fail[url]) return fail[url];
      const key = Object.keys(pages).find((k) => url === k || (k.startsWith('?') && url.startsWith(API + '?') && !url.includes('cursor=')));
      const p = key ? pages[key] : undefined;
      if (!p) return { error: 'HTTP 404', status: 404 };
      return { data: { releases: p.dates.map((date, i) => ({ id: `${date}-${i}`, date })), links: p.next ? { next: p.next } : {} } };
    },
  };
}

function opts(f: ReturnType<typeof feed>, seen: string[][], extra: Partial<Parameters<typeof walkFeed>[1]> = {}) {
  return {
    api: API, limit: 100, windowDays: 10, maxPages: 40, pendingMaxAgeMs: 3 * 86_400_000,
    now: () => NOW, outOfTime: () => false, fetchPage: f.fetchPage,
    handlePage: async (r: { date: string }[]) => { seen.push(r.map((x) => x.date)); },
    ...extra,
  };
}

test('a run with a saved older position reads the newest releases first, then the saved position', async () => {
  const start: WalkState = { newestRead: '2026-11-10T23:22:06Z', pending: [{ url: `${API}?cursor=old1`, savedAt: '2026-11-11T01:53:00Z' }] };
  const f = feed({
    '?window': { dates: ['2026-11-13T01:00:00Z', '2026-11-12T09:00:00Z'], next: `${API}?cursor=w2` },
    [`${API}?cursor=w2`]: { dates: ['2026-11-11T12:00:00Z', '2026-11-10T22:00:00Z'] },
    [`${API}?cursor=old1`]: { dates: ['2026-11-02T10:00:00Z'] },
  });
  const seen: string[][] = [];
  const r = await walkFeed(start, opts(f, seen));
  assert.ok(f.asked[0].includes('updatedFrom=2026-11-10T21%3A22%3A06'), `first page starts at the newest read less two hours: ${f.asked[0]}`);
  assert.deepEqual(seen[0], ['2026-11-13T01:00:00Z', '2026-11-12T09:00:00Z'], 'the newest page is handled first');
  assert.equal(f.asked[2], `${API}?cursor=old1`, 'the saved position is read after catching up');
  assert.equal(r.state.newestRead, '2026-11-13T01:00:00Z');
  assert.deepEqual(r.state.pending, []);
  assert.equal(r.partial, false);
  assert.equal(r.caughtUp, true);
});

test('a page that fails (HTTP 503) in the newest-first read is not the end of the feed: kept, partial', async () => {
  const f = feed({
    '?window': { dates: ['2026-11-13T01:00:00Z'], next: `${API}?cursor=w2` },
  }, { [`${API}?cursor=w2`]: { error: 'HTTP 503', status: 503 } });
  const seen: string[][] = [];
  const old = { url: `${API}?cursor=old1`, savedAt: '2026-11-12T01:53:00Z' };
  const r = await walkFeed({ newestRead: '2026-11-12T00:00:00Z', pending: [old] }, opts(f, seen));
  assert.equal(r.partial, true);
  assert.equal(r.caughtUp, false);
  assert.equal(r.error, 'HTTP 503');
  assert.equal(r.state.pending[0].url, `${API}?cursor=w2`, 'the failed page is the first place to resume');
  assert.deepEqual(r.state.pending[1], old, 'the older saved position is kept too');
  assert.ok(!f.asked.includes(old.url), 'older pages wait until the newest are read');
});

test('a page that throws (network error, no status) in a saved position keeps that position', async () => {
  const f = feed({
    '?window': { dates: ['2026-11-13T01:00:00Z'] },
    [`${API}?cursor=old1`]: { dates: ['2026-11-05T00:00:00Z'], next: `${API}?cursor=old2` },
  }, { [`${API}?cursor=old2`]: { error: 'fetch threw: timeout' } });
  const r = await walkFeed({ newestRead: '2026-11-12T00:00:00Z', pending: [{ url: `${API}?cursor=old1`, savedAt: '2026-11-12T01:53:00Z' }] }, opts(f, []));
  assert.equal(r.partial, true);
  assert.equal(r.caughtUp, true);
  assert.deepEqual(r.state.pending, [{ url: `${API}?cursor=old2`, savedAt: '2026-11-12T01:53:00Z' }]);
});

test('a page with no releases list (malformed answer) is a failure, not the end', async () => {
  const f = { asked: [] as string[], fetchPage: async (): Promise<PageResult> => ({ data: { message: 'oops' } }) };
  const r = await walkFeed({ newestRead: null, pending: [] }, opts(f as ReturnType<typeof feed>, []));
  assert.equal(r.partial, true);
  assert.equal(r.error, 'page had no releases list');
  assert.equal(r.state.newestRead, null, 'nothing read, so the window is read again next run');
  assert.deepEqual(r.state.pending, []);
});

test('the time budget stops the walk with its position saved; the newest read still moves on', async () => {
  let calls = 0;
  const f = feed({
    '?window': { dates: ['2026-11-13T01:00:00Z'], next: `${API}?cursor=w2` },
    [`${API}?cursor=w2`]: { dates: ['2026-11-12T01:00:00Z'] },
  });
  const r = await walkFeed({ newestRead: null, pending: [] }, opts(f, [], { outOfTime: () => calls++ >= 1 }));
  assert.equal(r.partial, true);
  assert.equal(r.state.newestRead, '2026-11-13T01:00:00Z');
  assert.equal(r.state.pending[0].url, `${API}?cursor=w2`);
});

test('an expired saved position (HTTP 400 on its first page) is dropped, not retried for ever', async () => {
  const f = feed({ '?window': { dates: ['2026-11-13T01:00:00Z'] } }, { [`${API}?cursor=gone`]: { error: 'HTTP 400', status: 400 } });
  const r = await walkFeed({ newestRead: '2026-11-12T00:00:00Z', pending: [{ url: `${API}?cursor=gone`, savedAt: '2026-11-12T01:53:00Z' }] }, opts(f, []));
  assert.deepEqual(r.state.pending, []);
  assert.equal(r.partial, false);
});

test('the old cursor shape becomes one saved position; the window is never more than windowDays back', () => {
  assert.deepEqual(readState({ next: `${API}?cursor=x` }, '2026-11-11T01:53:00Z'), { newestRead: null, pending: [{ url: `${API}?cursor=x`, savedAt: '2026-11-11T01:53:00Z' }] });
  assert.deepEqual(readState(null, null), { newestRead: null, pending: [] });
  assert.equal(windowFrom({ newestRead: '2026-10-01T00:00:00Z', pending: [] }, NOW, 10), '2026-11-03T01:53:00');
  assert.equal(windowFrom({ newestRead: null, pending: [] }, NOW, 10), '2026-11-03T01:53:00');
});
