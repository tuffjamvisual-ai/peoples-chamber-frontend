import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, isPoliteStop } from '@/lib/sync-budget';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';
import { EDM_API, EDM_PARLIAMENT_START, fetchEdmJson, listEdmsResumable, buildEdmRows, writeEdm, type EdmListEntry, type EdmListPages } from '@/lib/edms';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: keep early_day_motions / early_day_motion_signatures current
// (initial load is done once by scripts/import-edms.ts). Motions keep
// gathering signatures for the whole session, so each run:
//   1. Reads the full motion list (cheap: ~41 requests at 100 per page),
//      including each motion's SponsorsCount.
//   2. Re-fetches motions that are new, or whose SponsorsCount differs
//      from the value stored at their last fetch.
//   3. Also re-fetches the ROLLING_REFRESH motions checked least recently,
//      so changes that don't alter the count (a withdrawn signature, a
//      motion withdrawn) are still picked up within about two weeks.
// Time-budgeted so the route always returns (and records its heartbeat)
// inside maxDuration; leftovers are picked up next run.
//
// The list is read LIST_CONCURRENCY pages at a time. Read one at a time it took
// 104 to 216 s of the 240 s budget (12 to 20 Oct 2026), and on 18 and 21 Oct
// over 240 s, so no motion was fetched and the run returned 502 with 0 rows.
//
// 22 Oct 2026 (owner's approval): the list read can stop and carry on. Each page is tried up to 3 times (1 s and 4 s
// apart); the list stops starting pages at LIST_BUDGET_MS, and the pages read are saved in sync_cursor, so the next
// run reads only the rest (and page 0 and the last page again, which change). Motions found so far are fetched with
// the time left, and the run returns 200 when anything was saved. On 22 Oct the full run took 236 s of its 240 s.
//
// A second cron, 10 minutes later, calls this with ?retry=1: it runs again only
// if the last run, within the past hour, ended with a 5xx (Parliament's API
// failing, or nothing written); otherwise it returns without recording a run.
//
// 27 Oct 2026 (job 79): it failed twice in the 14 days to 26 Oct (502 on 18 and 21 Oct, both before the 22 Oct
// change). A motion fetch could still run 30 s a try, four tries, past the 240 s mark. Now (lib/sync-budget.ts) every
// try's timeout is cut to the time left, no motion starts after 70 per cent of maxDuration, the run ends by 80 per
// cent, a 429 stops it cleanly, and the response says partial: true while the list or the motions were left part done.
//
// 28 Oct 2026 (owner): a motion that fails FLAG_AFTER_RUNS runs in a row (lib/sync-item-failures.ts) goes to the back
// of the queue; the run carries on with the others, does not fail because of it, returns 200 with partial: true, and
// the freshness email names the motion and its error.

const CONCURRENCY = 3;
const LIST_CONCURRENCY = 3;
const DELAY_MS = 250;
const ROLLING_REFRESH = 300;
const LIST_BUDGET_MS = 150_000;
const ROUTE = '/api/sync-edms';
const CURSOR_MAX_AGE_MS = 36 * 3_600_000; // pages saved longer ago are read again

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const budget = new SyncBudget(maxDuration, { started });

  // Pages saved by an earlier run that stopped part way.
  let saved: EdmListPages | null = null;
  {
    const { data: cur } = await supabase.from('sync_cursor').select('cursor, updated_at').eq('route', ROUTE).maybeSingle();
    if (cur && Date.now() - new Date(cur.updated_at as string).getTime() < CURSOR_MAX_AGE_MS) saved = cur.cursor as EdmListPages;
  }
  const listed = await listEdmsResumable(EDM_PARLIAMENT_START, saved, Math.min(started + LIST_BUDGET_MS, budget.deadline), DELAY_MS, LIST_CONCURRENCY, budget);
  const byId = new Map<number, EdmListEntry>();
  for (const entries of Object.values(listed.state.pages)) for (const e of entries) byId.set(e.id, e);
  const list = [...byId.values()];
  // Keep the pages for the next run while the list is incomplete; once complete (or out of step), start afresh.
  let cursorError: string | null = null;
  if (!listed.complete && list.length > 0) {
    const { error } = await supabase.from('sync_cursor').upsert({ route: ROUTE, cursor: listed.state, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (error) cursorError = error.message;
  } else if (saved) {
    await supabase.from('sync_cursor').delete().eq('route', ROUTE);
  }
  if (list.length === 0) {
    if (listed.stoppedBy) return NextResponse.json({ ok: true, partial: true, stopped_by: listed.stoppedBy, rows_written: 0 });
    return NextResponse.json({ error: 'list_fetch_failed', message: listed.lastError ?? 'no page of the motion list could be read', pages_failed: listed.pagesFailed }, { status: 502 });
  }

  // Stored state (paged: PostgREST returns at most 1,000 rows per call).
  const stored = new Map<number, { count: number | null; syncedAt: string }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('early_day_motions')
      .select('id, source_sponsors_count, synced_at')
      .order('id')
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    for (const r of data ?? []) stored.set(r.id as number, { count: r.source_sponsors_count as number | null, syncedAt: r.synced_at as string });
    if (!data || data.length < 1000) break;
  }

  const listCount = new Map(list.map((e) => [e.id, e.sponsorsCount]));
  const changed = list.filter((e) => {
    const s = stored.get(e.id);
    return !s || s.count !== e.sponsorsCount;
  });
  const changedIds = new Set(changed.map((e) => e.id));
  const rolling = [...stored.entries()]
    .filter(([id]) => listCount.has(id) && !changedIds.has(id))
    .sort((a, b) => a[1].syncedAt.localeCompare(b[1].syncedAt))
    .slice(0, ROLLING_REFRESH)
    .map(([id]) => ({ id, sponsorsCount: listCount.get(id) ?? null }));

  const failing = await ItemFailures.load(supabase, ROUTE);
  const all = [...changed, ...rolling];
  const queue = [...all.filter((e) => !failing.isFlagged(e.id)), ...all.filter((e) => failing.isFlagged(e.id))];
  const total = queue.length;
  let processed = 0;
  let signatureRows = 0;
  let skippedForTime = 0;
  let stoppedBy: string | null = listed.stoppedBy;
  const failures: { id: number; error: string }[] = [];
  // Motions that failed FLAG_AFTER_RUNS runs in a row: reported, not counted as failures of the run.
  const flaggedFailures: { id: number; error: string }[] = [];

  async function worker() {
    while (queue.length > 0) {
      if (stoppedBy || budget.stopStarting()) {
        stoppedBy ??= 'time budget';
        skippedForTime += queue.length;
        queue.length = 0;
        return;
      }
      const entry = queue.shift()!;
      try {
        const json = await fetchEdmJson(`${EDM_API}/EarlyDayMotion/${entry.id}`, 4, budget);
        const built = buildEdmRows(json, entry.sponsorsCount);
        await writeEdm(supabase, built);
        signatureRows += built.signatures.length;
        processed++;
        failing.succeeded(entry.id);
      } catch (e) {
        // Out of time or asked to stop: this motion is left (it is still due next run).
        if (isPoliteStop(e)) { stoppedBy ??= (e as Error).message; skippedForTime += 1 + queue.length; queue.length = 0; return; }
        const error = (e as Error).message;
        if (failing.failed(entry.id, `motion ${entry.id}`, error)) flaggedFailures.push({ id: entry.id, error });
        else failures.push({ id: entry.id, error });
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const failuresSaved = await failing.save();

  const body = {
    ok: failures.length === 0 && listed.complete,
    list_complete: listed.complete,
    list_total: listed.state.total,
    list_pages_read: listed.pagesRead,
    list_pages_failed: listed.pagesFailed,
    list_pages_from_last_run: saved ? Object.keys(saved.pages ?? {}).length : 0,
    ...(listed.lastError ? { list_last_error: listed.lastError } : {}),
    ...(cursorError ? { cursor_error: cursorError } : {}),
    motions_listed: list.length,
    new_or_changed: changed.length,
    rolling_refresh: rolling.length,
    total_queued: total,
    rows_written: processed,
    signature_rows: signatureRows,
    skipped_for_time: skippedForTime,
    partial: skippedForTime > 0 || !listed.complete || flaggedFailures.length > 0,
    stopped_by: stoppedBy,
    failures: failures.slice(0, 20),
    failure_count: failures.length,
    flagged_failed: flaggedFailures.length,
    flagged_failures: flaggedFailures.slice(0, 20),
    flagged_after_runs: FLAG_AFTER_RUNS,
    failing_items: failing.summary(),
    failures_saved: failuresSaved,
    duration_ms: Date.now() - started,
  };
  // 200 when anything was saved, or when there was nothing to do and the list was read in full.
  // A run stopped by the budget or a rate limit with nothing failed is a clean partial run (job 79).
  // Only flagged motions failed: a partial run, not a failed one (28 Oct 2026).
  const onlyFlagged = flaggedFailures.length > 0 && failures.length === 0 && listed.pagesFailed === 0;
  const status = processed > 0 || (total === 0 && listed.complete) || (stoppedBy && failures.length === 0 && listed.pagesFailed === 0) || onlyFlagged ? 200 : 502;
  return NextResponse.json(body, { status });
}

const run = withHeartbeat(ROUTE, GET_impl);

export async function GET(req: Request): Promise<Response> {
  if (new URL(req.url).searchParams.get('retry') !== '1') return run(req);
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase.from('sync_heartbeat').select('last_ran_at, last_status').eq('route', ROUTE).maybeSingle();
  if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
  const recent = data && Date.now() - new Date(data.last_ran_at as string).getTime() < 60 * 60_000;
  if (!recent || (data.last_status as number) < 500) {
    return NextResponse.json({ retry: false, reason: 'last run did not fail with a 5xx in the past hour', last_status: data?.last_status ?? null });
  }
  return run(req);
}
