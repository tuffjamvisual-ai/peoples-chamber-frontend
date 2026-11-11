// T1-DF (b), 11 Nov 2026 (Cowork): one section of a page whose read fails is left out, and the failure logged, instead of
// the whole page failing (as the department pages do for PAC recommendations, dc9768b8). The page rendered without it is
// rendered again after 10 minutes: an unstable_cache entry with a shorter revalidate lowers the revalidate of the page
// being rendered (the same way as lib/pac.ts retrySoon), so the section returns once a read succeeds.
import { unstable_cache } from 'next/cache';

const RETRY_SOON = 600;

export type SoftRead<T> = { value: T; failed: boolean };

export async function failSoft<T>(label: string, read: Promise<T>, fallback: T): Promise<SoftRead<T>> {
  try {
    return { value: await read, failed: false };
  } catch (e) {
    console.error(`${label}: rendered without this section (${e instanceof Error ? e.message : String(e)}); it is rendered again in 10 minutes`);
    try {
      await unstable_cache(async () => true, ['fail-soft-retry-soon'], { revalidate: RETRY_SOON })();
    } catch {
      // Outside a request (a script or test) there is no page to shorten.
    }
    return { value: fallback, failed: true };
  }
}
