import { NextResponse } from 'next/server';
import { revalidateBillPages } from '@/lib/revalidate-bills';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';
import { fetchAllBillStages, deriveCurrentStage, BillNotFoundError } from '@/lib/bill-stages';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, isPoliteStop, politeFetch, loadCursor, saveCursor } from '@/lib/sync-budget';
import { refreshBills, sponsorOf, sameJson } from '@/lib/bill-refresh';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes bill.stages from Parliament's Bills API, to keep the /bills/[id]
// render path purely Supabase-backed. Each run takes, in this order, the bills
// the nightly bill sync marked as changed (stages_synced_at null), then those
// not refreshed for STALE_DAYS, three at a time, and stops starting new ones
// after TIME_BUDGET_MS so it always returns (and records its heartbeat) inside
// maxDuration. Every bill is saved as soon as it is read, so the next run
// carries on where this one stopped. Runs four times a day (vercel.json).
//
// Until 21 Oct 2026 it took 600 bills one at a time (0.5 to 3 s each) with no
// time limit, so every run hit the 300 s limit, and the old nightly bill sync
// cleared stages_synced_at on all 4,060 bills each night: stages were almost
// never saved.
//
// Stages are fetched in full via lib/bill-stages.ts. The Bills API pages
// at 20 stages by default, and this route previously stored only that
// first page, truncating long bills (missing later stages and Royal Assent,
// and deriving the wrong current_stage).
//
// 27 Oct 2026 (job 79): it still timed out on 10 of its 31 runs in the 14 days to 26 Oct (the last on 24 Oct), because
// bills already started ran on past the 240 s mark and the stores refresh came after. Now (lib/sync-budget.ts) no bill
// starts after 70 per cent of maxDuration, each request's timeout is cut to the time left so the run ends by 80 per
// cent, a 429 stops it cleanly, a bill stopped part way is not saved (it stays first in the queue), and the response
// says partial: true while bills were left.
//
// 28 Oct 2026 (owner, after report 79): a bill that fails FLAG_AFTER_RUNS runs in a row (lib/sync-item-failures.ts)
// has its stages_synced_at moved on, so it goes to the back of the queue (tried again after STALE_DAYS); the run
// carries on with the others, returns 200 with partial: true, and the freshness email names the bill and its error.
// Bill 3031 had failed this way on every run and, as the only bill due at 07:35 on 28 Oct, made that run a 502.

// 30 Oct 2026 (owner, cache Stage 2a part 2): bill pages keep for a week, so each bill's stored stages are compared
// before and after, and only bills that changed are refreshed (lib/bill-refresh.ts: /bills/<id>, /bills/<id>/full,
// bill:<id> and the sponsors' MP pages); the stored views and the list pages only when something changed. Then the
// Publications check: the bills going through Parliament now (bill_current) have their Publications count read from
// the Bills API, PUBLICATIONS_PER_RUN a run in turn, within the time budget; a bill whose count changed is refreshed
// (a new version of its text). The counts are kept in sync_cursor under PUBLICATIONS_CURSOR.
// Local tests only (never on Vercel production): ?dry=1 reads and compares but writes and refreshes nothing, and says
// how many bills it would refresh.

const RUN_CAP = 900; // bills read from the queue per run; the time budget usually stops it first
const CONCURRENCY = 3;
const DELAY_MS = 150;
const STALE_DAYS = 7;
const PUBLICATIONS_PER_RUN = 60;
const PUBLICATIONS_CURSOR = 'bill-publications-counts';
type PubCursor = { counts: Record<string, number>; next: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function GET_impl(req: Request) {
  const started = Date.now();
  const budget = new SyncBudget(maxDuration);
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);
  const dry = process.env.VERCEL_ENV !== 'production' && new URL(req.url).searchParams.get('dry') === '1';

  // Changed bills (NULL stages_synced_at) first, then the oldest sync.
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: selErr } = await supabase
    .from('bill')
    .select('id, parliament_id, stages_synced_at, stages, current_stage, stage_date, sponsor_member_id')
    .not('parliament_id', 'is', null)
    // Hidden bills (bill.hidden_reason) have no page and are not refreshed (24 Oct 2026).
    .is('hidden_reason', null)
    .or(`stages_synced_at.is.null,stages_synced_at.lt.${cutoff}`)
    .order('stages_synced_at', { ascending: true, nullsFirst: true })
    .limit(RUN_CAP);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = rows || [];
  const failing = await ItemFailures.load(supabase, '/api/sync-bill-stages');
  // Flagged bills still due go after the others.
  const queue = [...targets.filter((r) => !failing.isFlagged(r.id)), ...targets.filter((r) => failing.isFlagged(r.id))];
  let ok = 0, fail = 0, notFound = 0, skippedForTime = 0, flaggedFail = 0;
  const changed = new Set<number>();
  const changedSponsors = new Set<number>();
  const day10 = (d: unknown) => (typeof d === 'string' ? d.slice(0, 10) : null);
  let stoppedBy: string | null = null;
  const failures: Array<{ id: number; detail: string }> = [];

  async function worker() {
    while (queue.length > 0) {
      if (stoppedBy || budget.stopStarting()) { stoppedBy ??= 'time budget'; skippedForTime += queue.length; queue.length = 0; return; }
      const row = queue.shift()!;
      try {
        const stages = await fetchAllBillStages(row.parliament_id, budget);

        // Headline current_stage + stage_date from the freshest dated stage
        // (future/scheduled sittings ignored), now from the COMPLETE list.
        const { current_stage, stage_date } = deriveCurrentStage(stages.items);

        if (!sameJson(row.stages, stages) || row.current_stage !== current_stage || day10(row.stage_date) !== stage_date) {
          changed.add(row.id);
          for (const m of sponsorOf(row)) changedSponsors.add(m);
        }
        if (!dry) {
          const { error } = await supabase
            .from('bill')
            .update({
              stages,
              stages_synced_at: new Date().toISOString(),
              current_stage,
              stage_date,
            })
            .eq('id', row.id);
          if (error) throw error;
        }
        ok++;
        failing.succeeded(row.id);
      } catch (err) {
        // Out of time or asked to stop: this bill is not saved and stays first in the queue.
        if (isPoliteStop(err)) { stoppedBy ??= (err as Error).message; skippedForTime += 1 + queue.length; queue.length = 0; return; }
        if (dry) { fail++; if (failures.length < 20) failures.push({ id: row.id, detail: (err as Error).message }); continue; }
        if (err instanceof BillNotFoundError) {
          // The Bills API no longer has this bill (24 Oct 2026). Its stored stages, current_stage and stage_date are
          // kept; only stages_synced_at moves, so it is retried after the normal stale window instead of every run.
          const { error: touchErr } = await supabase.from('bill').update({ stages_synced_at: new Date().toISOString() }).eq('id', row.id);
          if (!touchErr) { notFound++; failing.succeeded(row.id); await sleep(DELAY_MS); continue; }
          err = touchErr;
        }
        const detail = (err as Error).message;
        if (failures.length < 20) failures.push({ id: row.id, detail });
        if (failing.failed(row.id, `bill ${row.id} (Parliament bill ${row.parliament_id})`, detail)) {
          // Failed FLAG_AFTER_RUNS runs in a row: to the back of the queue; it does not fail the run.
          const { error: touchErr } = await supabase.from('bill').update({ stages_synced_at: new Date().toISOString() }).eq('id', row.id);
          if (!touchErr) { flaggedFail++; await sleep(DELAY_MS); continue; }
        }
        fail++;
      }
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // The Publications check (see the top): bills going through Parliament now, in turn, while time is left.
  const publications = { checked: 0, changed: 0, stopped_by: null as string | null };
  try {
    const { data: current, error: curErr } = await supabase.from('bill_current').select('id, parliament_id, sponsor_member_id').not('parliament_id', 'is', null).order('id');
    if (curErr) throw new Error(`bill_current: ${curErr.message}`);
    const list = (current ?? []) as { id: number; parliament_id: number; sponsor_member_id: number | null }[];
    const cur = (await loadCursor<PubCursor>(supabase, PUBLICATIONS_CURSOR, 30 * 86400_000)) ?? { counts: {}, next: 0 };
    let i = 0;
    for (; i < Math.min(PUBLICATIONS_PER_RUN, list.length); i++) {
      if (budget.stopStarting()) { publications.stopped_by = 'time budget'; break; }
      const b = list[(cur.next + i) % list.length];
      const res = await politeFetch(`https://bills-api.parliament.uk/api/v1/Bills/${b.parliament_id}/Publications`, { headers: { Accept: 'application/json', 'User-Agent': 'OpenGovt/1.0 (contact@opengovt.uk)' }, cache: 'no-store' }, { budget });
      if (!res.ok) continue;
      const n = (((await res.json()) as { publications?: unknown[] }).publications ?? []).length;
      const before = cur.counts[String(b.id)];
      if (before !== undefined && before !== n) {
        publications.changed++;
        changed.add(b.id);
        for (const m of sponsorOf(b)) changedSponsors.add(m);
      }
      cur.counts[String(b.id)] = n;
      publications.checked++;
      await sleep(DELAY_MS);
    }
    cur.next = list.length ? (cur.next + i) % list.length : 0;
    if (!dry) await saveCursor(supabase, PUBLICATIONS_CURSOR, cur);
  } catch (err) {
    publications.stopped_by = isPoliteStop(err) ? (err as Error).message : `error: ${(err as Error).message}`;
  }

  // Only when something changed: the stored views first (the session pages and topic bill lists read them,
  // lib/refresh-stores.ts), then the list and session pages, and the changed bills with their sponsors' MP pages.
  const storesRefresh = changed.size > 0 && !dry ? await refreshStore(supabase, 'refresh_bill_stores') : null;
  const refreshed = changed.size > 0 && !dry ? (revalidateBillPages(), refreshBills(changed, changedSponsors)) : null;

  const { count: remaining } = await supabase.from('bill').select('id', { count: 'exact', head: true })
    .not('parliament_id', 'is', null).is('hidden_reason', null).or(`stages_synced_at.is.null,stages_synced_at.lt.${cutoff}`);
  const failuresSaved = dry ? false : await failing.save();
  if (fail > 0) console.error(JSON.stringify({ route: '/api/sync-bill-stages', targeted: targets.length, ok, fail, not_found: notFound, skipped_for_time: skippedForTime, first_failures: failures.slice(0, 5) }));
  return NextResponse.json({
    targeted: targets.length,
    rows_written: ok,
    fail,
    not_found: notFound,
    failures,
    // Bills that failed FLAG_AFTER_RUNS runs in a row and were moved to the back of the queue.
    flagged_failed: flaggedFail,
    flagged_after_runs: FLAG_AFTER_RUNS,
    failing_items: failing.summary(),
    failures_saved: failuresSaved,
    skipped_for_time: skippedForTime,
    // Bills still due after this run (changed, or not refreshed for STALE_DAYS); they come first next run.
    partial: skippedForTime > 0 || (remaining ?? 0) > 0 || flaggedFail > 0,
    stopped_by: stoppedBy,
    still_due: remaining ?? null,
    stores_refresh: storesRefresh,
    changed_bills: changed.size,
    refreshed,
    publications,
    ...(dry ? { dry_run: true, would_refresh: { bills: changed.size, mps: changedSponsors.size } } : {}),
    duration_ms: Date.now() - started,
    syncedAt: new Date().toISOString(),
  }, { status: targets.length > 0 && ok === 0 && notFound < targets.length && !(stoppedBy && fail === 0) && !(flaggedFail > 0 && fail === 0) ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-bill-stages', GET_impl);
