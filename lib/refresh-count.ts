// Refresh results recorded (owner, 30 Oct 2026, cache Stage 2a part 4). Pages now keep for a week and are refreshed by
// the syncs that change their data, so a refresh that fails or sends nothing leaves a page old for up to a week.
//
// withHeartbeat (lib/sync-heartbeat.ts) runs each sync inside a counter. Sync code calls revalidatePath and
// revalidateTag from this module instead of next/cache: each call is counted as one item sent, and an error is caught
// and recorded (the sync carries on). noteChanged(n) records how many rows the sync changed. After the run the counts
// go into sync_heartbeat (last_changed, last_refresh_sent, last_refresh_status, migration 2026-10-30i), and the
// freshness monitor alerts when a sync changed rows but its refresh failed or sent nothing.
import { AsyncLocalStorage } from 'node:async_hooks';
import { revalidatePath as nextRevalidatePath, revalidateTag as nextRevalidateTag } from 'next/cache';

export type RefreshCount = { changed: number; sent: number; failed: string | null; forceFail: boolean };
const store = new AsyncLocalStorage<RefreshCount>();

export function withRefreshCount<T>(req: Request, fn: () => Promise<T>): { count: RefreshCount; run: Promise<T> } {
  // Local tests only (never on Vercel production): ?fail_refresh=1 makes every refresh fail, to test the alert.
  const forceFail = process.env.VERCEL_ENV !== 'production' && new URL(req.url).searchParams.get('fail_refresh') === '1';
  const count: RefreshCount = { changed: 0, sent: 0, failed: null, forceFail };
  return { count, run: store.run(count, fn) };
}

export function noteChanged(n: number) {
  const c = store.getStore();
  if (c && n > 0) c.changed += n;
}

function counted(call: () => void) {
  const c = store.getStore();
  try {
    if (c?.forceFail) throw new Error('refresh made to fail for a test (?fail_refresh=1)');
    call();
    if (c) c.sent++;
  } catch (e) {
    if (!c) throw e;
    c.failed ??= (e as Error).message;
  }
}

export function revalidatePath(path: string, type?: 'page' | 'layout') {
  counted(() => (type ? nextRevalidatePath(path, type) : nextRevalidatePath(path)));
}

export function revalidateTag(tag: string, profile: 'max' | string = 'max') {
  counted(() => nextRevalidateTag(tag, profile));
}
