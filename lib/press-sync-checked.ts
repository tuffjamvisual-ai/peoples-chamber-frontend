// When the press releases sync last checked GOV.UK (T1-PR, 12 Nov 2026): the 'Checked GOV.UK at 09:17, 12 November' line
// under Latest from Whitehall on the front page and on /transparency/press-releases. The sync stores the time GOV.UK
// answered in sync_cursor (route CHECKED_ROUTE) before it refreshes those pages, so a page rebuilt by that refresh shows
// this run's time, not the one before (the heartbeat is written only after the run returns).
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PRESS_SYNC_CHECKED_TAG = 'press-sync-checked';
export const CHECKED_ROUTE = 'checked:/api/sync-press-releases';

const read = unstable_cache(async (): Promise<string | null> => {
  const { data, error } = await supabaseAdmin.from('sync_cursor').select('cursor').eq('route', CHECKED_ROUTE).maybeSingle();
  if (error) throw new Error(`press sync checked: ${error.message}`);
  const at = (data?.cursor as { at?: unknown } | null)?.at;
  return typeof at === 'string' ? at : null;
}, ['press-sync-checked-v1'], { tags: [PRESS_SYNC_CHECKED_TAG], revalidate: 3600 });

// No line when the time cannot be read.
export async function pressSyncCheckedAt(): Promise<string | null> {
  try { return await read(); } catch { return null; }
}
