// The latest press releases on the front page ("Latest from Whitehall") and the department pages' press releases tab
// (owner, 30 Oct 2026). Cached for an hour under the 'press-releases-latest' tag, which /api/sync-press-releases
// refreshes (with the path /) whenever it stores a new release. Before this, the reads went through the pages' fetchCache
// 'default-cache', which keeps a fetch with no revalidate of its own for ever (INFINITE_CACHE, untagged, surviving
// deploys), so the hourly rebuild of / kept showing the list as it was first stored. Inside unstable_cache the read is
// not also kept in the fetch cache.
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

export const PRESS_RELEASES_LATEST_TAG = 'press-releases-latest';
const HOUR = 3600;

export type LatestRelease = { title: string; organisation: string | null; published_at: string | null; gov_url: string | null };

// A failed read throws inside the cache, so it is not stored; the callers decide what to show instead.
const readWhitehall = unstable_cache(async (): Promise<LatestRelease[]> => {
  // gov_url host filter: ilike '%gov.uk%' excludes committees.parliament.uk reports (which belong in their own labelled
  // block, not under "Whitehall"). removed_upstream IS NOT TRUE includes NULL rows. limit 10: a buffer so the block
  // fills to 5 even if some rows have unusable slugs.
  const { data, error } = await supabase
    .from('press_releases')
    .select('title, organisation, published_at, gov_url')
    .not('removed_upstream', 'is', true)
    .ilike('gov_url', '%gov.uk%')
    .order('published_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`press_releases latest: ${error.message}`);
  return (data ?? []) as LatestRelease[];
}, ['press-releases-latest-whitehall'], { tags: [PRESS_RELEASES_LATEST_TAG], revalidate: HOUR });

export async function loadLatestWhitehall(): Promise<LatestRelease[]> {
  try { return await readWhitehall(); } catch { return []; }
}

// The 20 newest releases under any of a department's organisation names (handles renames like BEIS to DBT).
const readDept = unstable_cache(async (orgNames: string[]): Promise<LatestRelease[]> => {
  const { data, error } = await supabase
    .from('press_releases')
    .select('title, organisation, published_at, gov_url')
    .in('organisation', orgNames)
    .not('removed_upstream', 'is', true)
    .not('gov_url', 'is', null)
    .order('published_at', { ascending: false })
    .limit(20);
  if (error && error.code !== 'PGRST116') throw new Error(`/departments/[slug] press_releases: ${error.message}`);
  return (data ?? []) as LatestRelease[];
}, ['press-releases-latest-dept'], { tags: [PRESS_RELEASES_LATEST_TAG], revalidate: HOUR });

export const loadDeptPressReleases = (orgNames: string[]) => (orgNames.length ? readDept(orgNames) : Promise.resolve([]));
