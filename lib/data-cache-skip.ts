// No saved copies for the long tail (Cowork ENTRY 487, owner approved 21 Nov 2026). On Vercel every new data cache entry
// (unstable_cache, and so tagged() and cachedQuery()) is billed as an ISR write, like a saved page. The long tail routes
// (one page per question, debate, division and so on) render on demand and are held by Vercel's CDN instead, so their
// per record reads must not be written to the data cache either. A route marks its request with skipDataCache() at the
// top of generateMetadata and of the page; reads in that request then run directly against the database.
//
// The mark lives in React's per request cache, which Next shares across generateMetadata, layouts and the page of one
// request ("React.cache is scoped to the current request only"). Outside a React render (route handlers, syncs, build)
// cache() does not keep values, so the mark is never set there and every read is cached exactly as before.
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

const mark = cache(() => ({ skip: false }));

/** Call first in generateMetadata and in the page of a long tail route. */
export function skipDataCache(): void {
  mark().skip = true;
}

/** True when this request's per record reads must not be written to the data cache. */
export function dataCacheSkipped(): boolean {
  try {
    return mark().skip;
  } catch {
    return false;
  }
}

/** unstable_cache, except that a call with arguments (a per record read) in a marked request runs directly. Calls with no
 *  arguments are shared entries (lists, registries) written once per deploy or tag change, so they stay cached. */
export function cacheUnlessSkipped<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts?: string[],
  options?: { revalidate?: number | false; tags?: string[] },
): (...args: A) => Promise<R> {
  const cached = unstable_cache(fn, keyParts, options);
  return (...args: A) => (args.length > 0 && dataCacheSkipped() ? fn(...args) : cached(...args));
}

/** For reads keyed inside a closure (`unstable_cache(() => read(id), ['x', id], opts)()`): the same call shape, but in a
 *  marked request the read runs directly. */
export function cachedOrDirect<R>(
  fn: () => Promise<R>,
  keyParts: string[],
  options?: { revalidate?: number | false; tags?: string[] },
): () => Promise<R> {
  return dataCacheSkipped() ? fn : unstable_cache(fn, keyParts, options);
}
