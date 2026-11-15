// A database read kept in the shared data cache under its source tags, with no timer (A16, owner rule 15 Nov 2026,
// COWORK-TO-T1 ENTRY 129: no page rebuilds unless its data changed). The read is done again only after a sync that
// changed rows of that source calls revalidateTag for one of the tags (lib/source-tags.ts), or after a deploy.
//   export const yearCount = (year: number) => tagged(['year-count', year], [DIVISIONS_TAG], () => yearCountRead(year));
// The key must name the read and every argument it depends on. The value must be plain JSON (no Map, Date or class).
import { unstable_cache } from 'next/cache';
import { createHash } from 'node:crypto';

// A short key for a large argument (a release with its body, a debate with its speeches): a hash of its JSON.
export const keyHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex').slice(0, 24);

export function tagged<T>(key: (string | number | boolean | null)[], tags: string[], read: () => Promise<T>): Promise<T> {
  if (!tags.length) throw new Error('tagged(): a cached read needs at least one source tag');
  return unstable_cache(read, key.map((k) => String(k)), { revalidate: false, tags })();
}

// One supabase query in the tagged cache, for reads written inline in a page. The query's own error is thrown (so an
// error is never cached); "no rows" from .single()/.maybeSingle() (PGRST116) is data: null. Returns the same shape the
// call sites already use ({ data, count, error: null }).
//   const { data: row } = await cachedQuery(['division-row', date, n], [DIVISIONS_TAG], () => supabase.from('x')...);
type QueryError = { message: string; code?: string };
export async function cachedQuery<R extends { data: unknown; error: QueryError | null; count?: number | null }>(
  key: (string | number | boolean | null)[],
  tags: string[],
  query: () => PromiseLike<R>,
): Promise<{ data: Exclude<R['data'], null> | null; count: number | null; error: QueryError | null }> {
  const r = await tagged(key, tags, async () => {
    const res = await query();
    if (res.error && res.error.code !== 'PGRST116') throw new Error(`${key[0]}: ${res.error.message}`);
    return { data: ((res.error ? null : res.data) ?? null) as Exclude<R['data'], null> | null, count: res.count ?? null };
  });
  return { ...r, error: null as QueryError | null }; // errors are thrown above; kept for the call sites' checks
}
