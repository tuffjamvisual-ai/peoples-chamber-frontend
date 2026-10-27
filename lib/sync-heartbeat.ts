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
import { isPoliteStop } from '@/lib/sync-budget';

// Response fields sync routes use for their written-row count, in priority order.
const ROW_KEYS = ['rows_written', 'rowsWritten', 'rowsInserted', 'upserted', 'inserted', 'written', 'synced', 'processed', 'count', 'appgs', 'rows'];

// The row count a sync route's JSON body reports, or null when it reports none.
export function rowCount(body: unknown): number | null {
  const b = body as Record<string, unknown> | null;
  for (const k of ROW_KEYS) {
    if (typeof b?.[k] === 'number') return b[k] as number;
  }
  return null;
}

export async function recordSyncRun(route: string, status: number, rows: number | null): Promise<void> {
  try {
    await supabaseAdmin.rpc('record_sync_run', { p_route: route, p_status: status, p_rows: rows });
  } catch {
    // A heartbeat failure must never break or fail the sync it is observing.
  }
}

// Full cycles (job 79, report 79): a run that reports `partial` (true when its budget or a rate limit stopped it before
// it got through everything due, false when it did) also updates sync_cursor under "cycle:<route>": when the sync last
// finished a full pass, and since when it has been part way through one. The freshness monitor counts partial runs as
// healthy while the last full pass is within the route's expected period (lib/sync-cycles.ts).
export type CycleState = { lastCompleteAt: string | null; partialSince: string | null; partialRuns: number };

export async function recordCycle(route: string, partial: boolean): Promise<void> {
  try {
    const key = `cycle:${route}`;
    const { data } = await supabaseAdmin.from('sync_cursor').select('cursor').eq('route', key).maybeSingle();
    const prev = (data?.cursor as CycleState | undefined) ?? { lastCompleteAt: null, partialSince: null, partialRuns: 0 };
    const now = new Date().toISOString();
    const next: CycleState = partial
      ? { lastCompleteAt: prev.lastCompleteAt, partialSince: prev.partialSince ?? now, partialRuns: prev.partialRuns + 1 }
      : { lastCompleteAt: now, partialSince: null, partialRuns: 0 };
    await supabaseAdmin.from('sync_cursor').upsert({ route: key, cursor: next, updated_at: now }, { onConflict: 'route' });
  } catch {
    // Like the heartbeat, never breaks or fails the sync it is observing.
  }
}

export function withHeartbeat(
  route: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    let res: Response;
    try {
      res = await handler(req);
    } catch (e) {
      // A source asking us to stop (429) or the run's own time budget, raised where the route had no handling of its
      // own: a clean stop, not a failure; whatever the route saved before it is kept and the next run carries on.
      if (isPoliteStop(e)) {
        const body = { ok: true, partial: true, stopped_by: (e as Error).message, syncedAt: new Date().toISOString() };
        await recordSyncRun(route, 200, null);
        await recordCycle(route, true);
        return Response.json(body, { status: 200 });
      }
      // Any other uncaught error is recorded as a failed run (it used to leave no heartbeat at all), then rethrown.
      await recordSyncRun(route, 500, null);
      throw e;
    }
    // 401/405 are unauthorised or wrong-method probes, not real runs — skip.
    if (res.status !== 401 && res.status !== 405) {
      let rows: number | null = null;
      let partial: boolean | undefined;
      try {
        const body = await res.clone().json();
        rows = rowCount(body);
        if (typeof body?.partial === 'boolean') partial = body.partial;
      } catch {
        // non-JSON body — record the run with an unknown row count.
      }
      await recordSyncRun(route, res.status, rows);
      if (partial !== undefined && res.status >= 200 && res.status < 300) await recordCycle(route, partial);
    }
    return res;
  };
}
