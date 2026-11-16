// MP pages refreshed only when their data changes (cache Stage 2a, part 3, owner, 30 Oct 2026). /mps/[id] and
// /mps/[id]/reports keep for a week, so each sync that changes an MP's data refreshes that MP's page, and only that
// MP's: at most REFRESH_BATCH paths at a time. A new division refreshes only its voters' vote reads, and an activity
// recompute only the changed MPs' figures (refreshMpVotes, refreshMpActivity; F03, ENTRY 134).
import { mpDataChanged, mpVotesTag, mpActivityTag } from '@/lib/mp-cache';
import { mpRefreshPlan } from '@/lib/mp-refresh-plan';
import { freshnessChanged } from '@/lib/data-freshness';
import { indexNowAfter } from '@/lib/indexnow';
import { revalidatePath, revalidateTag } from '@/lib/refresh-count';

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
  // The member's vote counts with their other reads (mpDataChanged); per member since F03, not the site-wide counts tag.
  if (ids.length) { freshnessChanged(); mpDataChanged(ids); for (const id of ids) revalidateTag(mpVotesTag(id), { expire: 0 }); }
  indexNowAfter(ids.flatMap((id) => (reports ? [`/mps/${id}`, `/mps/${id}/reports`] : [`/mps/${id}`])), 'mp-refresh');
  return { mps: ids.length };
}

// The pages of the given MPs and only one kind of their reads (F03, ENTRY 134; T2's audit/t2-prep/f03-exact.md): a new
// division refreshes its voters' vote reads (refreshMpVotes), an activity recompute the changed MPs' activity figures
// (refreshMpActivity). Every other read on those pages stays cached, no other MP page is touched, and nothing site-wide is
// expired (not the freshness dates: a non-voter's page keeps the previous "updated" date until it is next rebuilt).
// mpRefreshPlan is the pure part, tested in scripts/checks/mp-refresh-votes.test.ts.
function refreshMpsOnly(memberIds: Iterable<number>, tagFor: (id: number) => string, why: string): MpRefresh {
  const plan = mpRefreshPlan(memberIds, tagFor);
  for (const p of plan.paths) revalidatePath(p);
  for (const t of plan.tags) revalidateTag(t, { expire: 0 });
  if (plan.ids.length) indexNowAfter(plan.paths, why);
  return { mps: plan.ids.length };
}
export const refreshMpVotes = (memberIds: Iterable<number>) => refreshMpsOnly(memberIds, mpVotesTag, 'mp-votes');
export const refreshMpActivity = (memberIds: Iterable<number>) => refreshMpsOnly(memberIds, mpActivityTag, 'mp-activity');

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
