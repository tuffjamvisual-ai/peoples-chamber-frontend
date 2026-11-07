// Per MP caching for reads an MP page makes on every render (owner, 7 Nov 2026, W2): counts and row lists that Next's
// fetch cache does not keep (a count is a head request; a readAll starts with one). Each is kept for an hour per member
// under mpTag(memberId), which the MP page refresh after a sync (lib/mp-refresh.ts) and /api/revalidate expire at once, so a
// sync still shows new figures straight away. Extra tags join it where a sync refreshes by tag (the donations tag).
import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';

export const mpTag = (memberId: number) => `mp:${memberId}`;
// Every MP's cached reads at once, for a refresh of every MP page (/mps/[id]).
export const MP_PAGES_TAG = 'mp-pages';

export function mpCached<T>(name: string, memberId: number, read: () => Promise<T>, extraTags: string[] = []): Promise<T> {
  return unstable_cache(read, [`mp-cache-v1:${name}`, String(memberId)], { revalidate: 3600, tags: [mpTag(memberId), MP_PAGES_TAG, ...extraTags] })();
}

// A head count with the { count, error } shape of the read it replaces; a failed read is not kept.
export async function mpCachedCount(name: string, memberId: number, read: () => PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<{ count: number | null; error: { message: string } | null }> {
  try {
    const count = await mpCached(name, memberId, async () => {
      const r = await read();
      if (r.error) throw new Error(r.error.message);
      return r.count ?? 0;
    });
    return { count, error: null };
  } catch (e) {
    return { count: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

export function allMpDataChanged(): void {
  try { revalidateTag(MP_PAGES_TAG, { expire: 0 }); } catch { /* outside a request */ }
}

// Called where an MP's data has just changed (their page is refreshed at the same moment).
export function mpDataChanged(memberIds: Iterable<number>): void {
  try { for (const id of memberIds) revalidateTag(mpTag(id), { expire: 0 }); } catch { /* outside a request */ }
}
