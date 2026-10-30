// MP pages refreshed only when their data changes (cache Stage 2a, part 3, owner, 30 Oct 2026). /mps/[id] and
// /mps/[id]/reports keep for a week, so each sync that changes an MP's data refreshes that MP's page, and only that
// MP's: at most REFRESH_BATCH paths at a time. When nearly every MP changed at once (a new Commons division changes
// every voter's counts) the route pattern is sent once instead (refreshAllMps).
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
  return { mps: ids.length };
}

// Every MP page, as one route pattern.
export function refreshAllMps(): MpRefresh {
  revalidatePath('/mps/[id]', 'page');
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
