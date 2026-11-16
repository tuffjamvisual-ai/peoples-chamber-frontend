// MP pages refreshed only when their data changes (cache Stage 2a, part 3, owner, 30 Oct 2026). /mps/[id] and
// /mps/[id]/reports keep for a week, so each sync that changes an MP's data refreshes that MP's page, and only that
// MP's: at most REFRESH_BATCH paths at a time. When nearly every MP changed at once (a new Commons division changes
// every voter's counts) the route pattern is sent once instead (refreshAllMps).
import { voteCountsChanged } from '@/lib/mp-page-cache';
import { allMpVotesChanged, mpDataChanged } from '@/lib/mp-cache';
import { freshnessChanged } from '@/lib/data-freshness';
import { indexNowAfter } from '@/lib/indexnow';
import { revalidatePath } from '@/lib/refresh-count';

export const REFRESH_BATCH = 300;

export type MpRefresh = { mps: number; all?: boolean };

// The given MPs' pages; `reports` also refreshes /mps/<id>/reports (the reports list changes only with articles).
export function refreshMps(memberIds: Iterable<number>, reports = false): MpRefresh {
  const ids = [...new Set(memberIds)].filter((n) => Number.isInteger(n) && n > 0);
  for (let i = 0; i < ids.length; i += REFRESH_BATCH) {
    for (const id of ids.slice(i, i + REFRESH_BATCH)) {
      revalidatePath(`/mps/${id}`);
      if (reports) revalidatePath(`/mps/${id}/reports`);
    }
  }
  // The shared "last updated" dates and vote counts these pages read (W1) are expired with them.
  if (ids.length) { freshnessChanged(); voteCountsChanged(); mpDataChanged(ids); }
  indexNowAfter(ids.flatMap((id) => (reports ? [`/mps/${id}`, `/mps/${id}/reports`] : [`/mps/${id}`])), 'mp-refresh');
  return { mps: ids.length };
}

// Every MP page, after a change that touches nearly every MP at once: a new Commons division (every voter's counts) or
// a recompute of the activity figures. F03 (ENTRY 134, owner approved 15 Nov 2026): only the reads that change are
// expired (the votes, vote counts and activity figures, and the "last updated" dates); every page that used them is
// rebuilt from the data cache with only those re-read. It used to expire the route pattern and every read of every MP
// page (mp-pages), about 43 reads a page, 650 pages (pg_stat_statements: about 23,100 calls of each MP-page read in 91 hours).
export function refreshAllMps(): MpRefresh {
  freshnessChanged();
  voteCountsChanged();
  allMpVotesChanged();
  return { mps: 0, all: true };
}

// Local tests only: ?dry=1 is honoured off Vercel production; the sync then reads and compares but writes nothing.
export const isDryRun = (req: Request) => process.env.VERCEL_ENV !== 'production' && new URL(req.url).searchParams.get('dry') === '1';

// Stored rows compared by value: keys in a fixed order, and a null field the same as an absent one.
export function sameValue(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(canon)
      : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] != null).map((k) => [k, canon((v as Record<string, unknown>)[k])]))
      : v ?? null;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}
