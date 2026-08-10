// Sync heartbeat. Every instrumented sync route records when it ran, its HTTP
// status and the row count it returned, via record_sync_run (upserts one row per
// route into sync_heartbeat). The freshness monitor reads this to alert on
// "the cron didn't run" — the real failure mode — rather than "the data didn't
// change", which false-alarms on quarterly sources.
//
// Wrap a route: rename the handler and export the wrapped version, e.g.
//   async function GET_impl(req: Request) { ... }
//   export const GET = withHeartbeat('/api/sync-foo', GET_impl);

import { supabaseAdmin } from '@/lib/supabase-admin';

// Response fields sync routes use for their written-row count, in priority order.
const ROW_KEYS = ['rows_written', 'rowsWritten', 'upserted', 'inserted', 'written', 'synced', 'processed', 'count', 'appgs', 'rows'];

export async function recordSyncRun(route: string, status: number, rows: number | null): Promise<void> {
  try {
    await supabaseAdmin.rpc('record_sync_run', { p_route: route, p_status: status, p_rows: rows });
  } catch {
    // A heartbeat failure must never break or fail the sync it is observing.
  }
}

export function withHeartbeat(
  route: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const res = await handler(req);
    // 401/405 are unauthorised or wrong-method probes, not real runs — skip.
    if (res.status !== 401 && res.status !== 405) {
      let rows: number | null = null;
      try {
        const body = await res.clone().json();
        for (const k of ROW_KEYS) {
          if (typeof body?.[k] === 'number') { rows = body[k]; break; }
        }
      } catch {
        // non-JSON body — record the run with an unknown row count.
      }
      await recordSyncRun(route, res.status, rows);
    }
    return res;
  };
}
