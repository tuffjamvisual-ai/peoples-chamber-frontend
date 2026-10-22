// Stored copies that reader pages read instead of working figures out on every view (migrations 2026-10-22h and
// 2026-10-22i; owner's approval, 22 Oct 2026). Each refresh function has its own statement timeout (the API's default
// is 8 s). A sync calls the refresh for what it just wrote, straight after writing; a failed refresh is logged and
// reported in the sync's response but never fails the sync, because its rows are saved. /api/refresh-reader-stores
// refreshes them all once a day as well, with its own heartbeat.

import type { SupabaseClient } from '@supabase/supabase-js';

export type StoreRefresh = 'refresh_bill_stores' | 'refresh_vote_counts' | 'refresh_press_release_stats' | 'refresh_contractor_donor_matches';

export type StoreRefreshResult = { fn: StoreRefresh; ok: boolean; ms: number; result?: unknown; error?: string };

export async function refreshStore(supabase: SupabaseClient, fn: StoreRefresh): Promise<StoreRefreshResult> {
  const t = Date.now();
  try {
    const { data, error } = await supabase.rpc(fn);
    if (error) {
      console.error(`[refresh-stores] ${fn} failed: ${error.message}`);
      return { fn, ok: false, ms: Date.now() - t, error: error.message };
    }
    return { fn, ok: true, ms: Date.now() - t, result: data };
  } catch (e) {
    console.error(`[refresh-stores] ${fn} threw: ${(e as Error).message}`);
    return { fn, ok: false, ms: Date.now() - t, error: (e as Error).message };
  }
}
