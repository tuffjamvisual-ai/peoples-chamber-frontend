import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';
import { revalidateBillPages } from '@/lib/revalidate-bills';
import { refreshBills, sponsorOf, sameJson } from '@/lib/bill-refresh';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, BudgetReached, politeFetch, isPoliteStop, loadCursor, saveCursor } from '@/lib/sync-budget';
import { ItemFailures, FLAG_AFTER_RUNS } from '@/lib/sync-item-failures';
import { noteChanged } from '@/lib/refresh-count';
import { REQUEST_MS, withRetries, BillNotFoundError, ApiRefused } from '@/lib/bill-sponsors-retries';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes bill.sponsors from Parliament's Bills API. Since 4 Nov 2026 (owner) a run reads only: new bills
// (sponsors_synced_at is null); bills whose lastUpdate at Parliament is newer than this sync's last finished run (the
// list sorted by date updated, newest first, stopping at the first older bill); and bills that failed last time. A full
// pass over every bill starts each Sunday (UTC) as the safety net and carries on, stalest first, until it is done.
//
// Output shape stored on bill.sponsors:
//   { items: [ { name, party, memberId, memberFrom, sortOrder, isMember, organisation } ] }
// Empty items array == fetched but Parliament returned no sponsors.
// Also stores bill_type_id (the API's billTypeId) and sponsor_departments (the distinct sponsors[].organisation.name,
// the sponsoring department of a government bill), which the topic pages match on (migration 2026-10-21m).

// 30 Oct 2026 (owner, cache Stage 2a part 2): each bill's stored sponsors, type and departments are compared before
// and after; only bills that changed are refreshed (lib/bill-refresh.ts), with the MP pages of their sponsors before
// and after, and the stored views and list pages only when something changed. ?dry=1 (local tests only, never on
// Vercel production) reads and compares but writes and refreshes nothing.
const RUN_CAP = 1500; // bills read from the queue per run; the time budget usually stops it first
// Time-budgeted (21 Oct 2026): 1,500 bills one at a time at about 1.5 s each could never finish in 300 s, so both
// weekly runs timed out. No new bill starts after TIME_BUDGET_MS; each is saved as it is read, and the stalest go
// first, so the next run carries on. About 160 bills a run: Sunday's extra runs (vercel.json) cover the whole list.
// 27 Oct 2026 (job 79): it timed out once (19 Oct) and ran to 241 s with the stores refresh still to come. The budget
// is now lib/sync-budget.ts: no bill starts after 70 per cent of maxDuration, each request's timeout is cut to the time
// left so the run ends by 80 per cent, a 429 stops it cleanly (the bill is not stamped, so it is first next run), and
// the response says partial: true while bills were left.
// 28 Oct 2026 (owner): a bill that fails FLAG_AFTER_RUNS runs in a row (lib/sync-item-failures.ts) has its
// sponsors_synced_at moved on (the back of the queue); the run carries on, returns 200 with partial: true, and the
// freshness email names the bill and its error.
// 4 Nov 2026 (owner): a full pass. The queue is its own cursor across runs: bills are read stalest first and stamped as
// each is read, so the next run carries on where this one stopped. No bill gets more than PER_BILL_MS, so one that hangs
// (bill 3032, Parliament bill 618) costs seconds, and bills that failed last time go after the rest of the queue.
// SLOW_STOP_AFTER timeouts in a row means the API itself is slow: the run stops, as for the time budget.
// 5 Nov 2026 (owner): 8 s was too short. Bill 2458 regularly takes over 10 s and bill 468 sometimes does not answer at
// all, so bills 2925, 3031 and 3032 failed run after run. Every Parliament request now has REQUEST_MS and up to three
// retries, RETRY_WAITS_MS apart, inside the run's time budget: with no time for another try, the bill counts as failed
// as before. Only a timeout, no answer or a 5xx is retried. Bills that failed last time now really do go last, after
// the weekly pass, so that their retries cannot use up the time the pass needs.
const SLOW_STOP_AFTER = 5;
const PARLIAMENT_API = 'https://bills-api.parliament.uk/api/v1/Bills';
// sync_cursor rows. SINCE: when the last finished run started. FULL: the weekly pass, open or last started.
const SINCE_CURSOR = 'bill-sponsors:since';
const FULL_CURSOR = 'bill-sponsors:full';
const CURSOR_MAX_AGE_MS = 90 * 86_400_000;
// lastUpdate has no time zone: this much overlap means a bill is read twice at worst, never missed, in summer time too.
const LAST_UPDATE_OVERLAP_MS = 2 * 60 * 60 * 1000;
const LIST_PAGE = 100;
const BILL_COLS = 'id, parliament_id, sponsors_synced_at, sponsors, bill_type_id, sponsor_departments, sponsor_member_id';
type FullPass = { startedAt?: string | null; lastStartedDay?: string; lastCompleteAt?: string };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiMember = { name?: string; party?: string; memberId?: number; memberFrom?: string };
type ApiSponsor = {
  sortOrder?: number;
  member?: ApiMember | null;
  organisation?: { name?: string } | null;
};
type ApiBill = { sponsors?: ApiSponsor[]; billTypeId?: number };

type StoredSponsor = {
  name: string;
  party: string | null;
  memberId: number | null;
  memberFrom: string | null;
  sortOrder: number;
  isMember: boolean;
  organisation: string | null;
};

type Fetched = { items: StoredSponsor[]; billTypeId: number | null; departments: string[] };

async function fetchSponsors(parliamentId: number, budget: SyncBudget): Promise<Fetched> {
  const j = await withRetries(async (timeoutMs) => {
    const res = await politeFetch(`${PARLIAMENT_API}/${parliamentId}`, {}, { budget, timeoutMs });
    if (res.status === 404) throw new BillNotFoundError(parliamentId);
    if (res.status >= 500) throw new Error(`Bills API ${res.status}`);
    if (!res.ok) throw new ApiRefused(`Bills API ${res.status}`);
    return (await res.json()) as ApiBill;
  }, budget);
  const items = (j.sponsors || [])
    .map((s, i) => {
      const m: ApiMember | null = s.member ?? null;
      const o = s.organisation ?? null;
      const name = m?.name || o?.name || '';
      return {
        name,
        party: m?.party ?? null,
        // The Bills API's field is member.memberId (owner, 30 Oct 2026): this read member.id, which does not exist, so
        // every stored memberId was null. Bills are corrected as the normal 30 day cycle reaches them.
        memberId: m?.memberId ?? null,
        memberFrom: m?.memberFrom ?? null,
        sortOrder: s.sortOrder ?? i + 1,
        isMember: !!m,
        organisation: o?.name?.trim() || null,
      };
    })
    .filter((s) => s.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const departments = [...new Set(items.map((s) => s.organisation).filter((d): d is string => !!d))];
  return { items, billTypeId: typeof j.billTypeId === 'number' ? j.billTypeId : null, departments };
}

// Parliament's ids of the bills updated since `since`: the list newest first, stopping at the first older bill.
async function billsUpdatedSince(since: number, budget: SyncBudget): Promise<{ ids: number[]; read: number }> {
  const ids: number[] = [];
  for (let skip = 0; ; skip += LIST_PAGE) {
    const j = await withRetries(async () => {
      const res = await politeFetch(`${PARLIAMENT_API}?SortOrder=DateUpdatedDescending&Skip=${skip}&Take=${LIST_PAGE}`, {}, { budget, timeoutMs: REQUEST_MS });
      if (res.status >= 500) throw new Error(`Bills API list ${res.status}`);
      if (!res.ok) throw new ApiRefused(`Bills API list ${res.status}`);
      return (await res.json()) as { items?: { billId: number; lastUpdate: string }[]; totalResults?: number };
    }, budget);
    const items = j.items ?? [];
    for (const b of items) {
      if (Date.parse(`${b.lastUpdate.replace(/Z$/, '')}Z`) < since) return { ids, read: skip + items.indexOf(b) + 1 };
      ids.push(b.billId);
    }
    if (items.length < LIST_PAGE) return { ids, read: skip + items.length };
    await sleep(120);
  }
}

// ?bills=2925,3031 (a local run by hand, never on Vercel production): reads and saves only those bills, as a normal run
// would, and leaves the run's own records alone: no heartbeat, last run time or weekly pass, as it is not a real run.
function onlyBills(req: Request): number[] | null {
  if (process.env.VERCEL_ENV === 'production') return null;
  const ids = (new URL(req.url).searchParams.get('bills') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : null;
}

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
  const only = onlyBills(req);

  const search = new URL(req.url).searchParams;
  const runStartedAt = new Date(started).toISOString();
  const today = runStartedAt.slice(0, 10);
  // ?sunday=1 tries a Sunday in a local dry run.
  const isSunday = new Date(started).getUTCDay() === 0 || (dry && search.get('sunday') === '1');

  // The last finished run; the first run under these rules uses the last good run in the heartbeat.
  let sinceIso = only ? null : (await loadCursor<{ at: string }>(supabase, SINCE_CURSOR, CURSOR_MAX_AGE_MS))?.at ?? null;
  if (!sinceIso && !only) {
    const { data: beat, error: beatErr } = await supabase.from('sync_heartbeat').select('last_ran_at, last_status').eq('route', '/api/sync-bill-sponsors').maybeSingle();
    if (beatErr) return NextResponse.json({ error: beatErr.message }, { status: 500 });
    if (beat?.last_status === 200) sinceIso = beat.last_ran_at as string;
  }

  const full = (await loadCursor<FullPass>(supabase, FULL_CURSOR, CURSOR_MAX_AGE_MS)) ?? {};
  const passStart = only ? null : full.startedAt ?? (isSunday && full.lastStartedDay !== today ? runStartedAt : null);

  const pick = () => supabase.from('bill').select(BILL_COLS).not('parliament_id', 'is', null).is('hidden_reason', null); // hidden bills have no page
  type BillRow = { id: number; parliament_id: number; sponsors_synced_at: string | null; sponsors: unknown; bill_type_id: number | null; sponsor_departments: unknown; sponsor_member_id: number | null };
  const targets: BillRow[] = [];
  const seen = new Set<number>();
  const add = (rows: unknown) => { for (const r of (rows ?? []) as BillRow[]) if (!seen.has(r.id)) { seen.add(r.id); targets.push(r); } };

  const { data: newBills, error: newErr } = await (only ? pick().in('id', only) : pick().is('sponsors_synced_at', null).limit(RUN_CAP));
  if (newErr) return NextResponse.json({ error: newErr.message }, { status: 500 });
  add(newBills);
  const newCount = targets.length;

  // Bills updated at Parliament since the last finished run. With no last run known, the weekly pass is the only cover.
  let updatedAtParliament = 0, listRead = 0;
  if (sinceIso) {
    try {
      const { ids, read } = await billsUpdatedSince(Date.parse(sinceIso) - LAST_UPDATE_OVERLAP_MS, budget);
      listRead = read;
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await pick().in('parliament_id', ids.slice(i, i + 200));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        add(data);
      }
      updatedAtParliament = targets.length - newCount;
    } catch (err) {
      return NextResponse.json({ error: `Bills API list: ${(err as Error).message}` }, { status: 502 });
    }
  }

  // Then the weekly pass, stalest first, and last the bills that failed last time.
  const failing = await ItemFailures.load(supabase, '/api/sync-bill-sponsors');
  const failingIds = only ? [] : failing.keys().map(Number).filter(Number.isFinite);
  const retryIds = new Set(failingIds);
  const beforePass = targets.length;
  let passRead = 0;
  if (passStart) {
    const { data, error } = await pick().lt('sponsors_synced_at', passStart).order('sponsors_synced_at', { ascending: true }).limit(RUN_CAP);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    passRead = data?.length ?? 0;
    add(((data ?? []) as BillRow[]).filter((r) => !retryIds.has(r.id)));
  }
  const passTargets = targets.length - beforePass;
  if (failingIds.length) {
    const { data, error } = await pick().in('id', failingIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    add(data);
  }
  let timeoutsInARow = 0;
  let ok = 0,
    fail = 0,
    notFound = 0,
    flaggedFail = 0;
  const failures: Array<{ id: number; detail: string }> = [];
  let skippedForTime = 0;
  let stoppedBy: string | null = null;
  const changed = new Set<number>();
  const changedSponsors = new Set<number>();

  for (const [i, row] of targets.entries()) {
    if (budget.stopStarting()) { stoppedBy = 'time budget'; skippedForTime = targets.length - i; break; }
    const billStarted = Date.now();
    try {
      const { items, billTypeId, departments } = await fetchSponsors(row.parliament_id, budget);
      if (!sameJson(row.sponsors, { items }) || (row.bill_type_id ?? null) !== billTypeId || !sameJson(row.sponsor_departments ?? [], departments)) {
        changed.add(row.id);
        for (const m of sponsorOf(row)) changedSponsors.add(m);
      }
      if (!dry) {
        const { error } = await supabase
          .from('bill')
          .update({
            sponsors: { items },
            bill_type_id: billTypeId,
            sponsor_departments: departments,
            sponsors_synced_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        if (error) throw error;
      }
      ok++;
      timeoutsInARow = 0;
      failing.succeeded(row.id);
      if (only) console.log(`[sync-bill-sponsors] bill ${row.id} (Parliament bill ${row.parliament_id}): ok in ${Date.now() - billStarted} ms, ${items.length} sponsor(s)`);
    } catch (err) {
      if (isPoliteStop(err)) { stoppedBy = (err as Error).message; skippedForTime = targets.length - i; break; }
      if (dry) { fail++; if (only) console.log(`[sync-bill-sponsors] bill ${row.id} (Parliament bill ${row.parliament_id}): failed in ${Date.now() - billStarted} ms: ${(err as Error).message}`); if (failures.length < 20) failures.push({ id: row.id, detail: (err as Error).message }); continue; }
      if (err instanceof BillNotFoundError) {
        // The Bills API no longer has this bill (24 Oct 2026). Its stored sponsors are kept; only sponsors_synced_at
        // moves, so it is retried after the normal 30 days instead of every run.
        const { error: touchErr } = await supabase.from('bill').update({ sponsors_synced_at: new Date().toISOString() }).eq('id', row.id);
        if (!touchErr) { notFound++; failing.succeeded(row.id); await sleep(120); continue; }
        err = touchErr;
      }
      const detail = (err as Error).message;
      if (only) console.log(`[sync-bill-sponsors] bill ${row.id} (Parliament bill ${row.parliament_id}): failed in ${Date.now() - billStarted} ms: ${detail}`);
      if (failures.length < 20) failures.push({ id: row.id, detail });
      if ((err as Error).name === 'TimeoutError' || /timeout|aborted/i.test(detail)) {
        timeoutsInARow++;
        if (timeoutsInARow >= SLOW_STOP_AFTER) { failing.failed(row.id, `bill ${row.id} (Parliament bill ${row.parliament_id})`, detail); stoppedBy = `${SLOW_STOP_AFTER} bills timed out in a row`; skippedForTime = targets.length - i - 1; fail++; break; }
      } else timeoutsInARow = 0;
      if (failing.failed(row.id, `bill ${row.id} (Parliament bill ${row.parliament_id})`, detail)) {
        // Failed FLAG_AFTER_RUNS runs in a row: to the back of the queue; it does not fail the run.
        const { error: touchErr } = await supabase.from('bill').update({ sponsors_synced_at: new Date().toISOString() }).eq('id', row.id);
        if (!touchErr) { flaggedFail++; await sleep(120); continue; }
      }
      fail++;
    }
    await sleep(120);
  }

  // Only when something changed: the stored views first (the topic bill lists read a stored copy of the bills'
  // sponsoring departments, lib/refresh-stores.ts), then the list pages, the changed bills and their sponsors' pages.
  noteChanged(dry ? 0 : changed.size);
  const storesRefresh = changed.size > 0 && !dry ? await refreshStore(supabase, 'refresh_bill_stores') : null;
  const refreshed = changed.size > 0 && !dry ? (revalidateBillPages(), refreshBills(changed, changedSponsors)) : null;
  const failuresSaved = dry ? false : await failing.save();

  // A run that got through all it had to read becomes the new starting point; a stopped one leaves it, so nothing is lost.
  const finished = !stoppedBy;
  if (!dry && finished && !only) await saveCursor(supabase, SINCE_CURSOR, { at: runStartedAt });
  // The pass is done when its queue fits in this run and the run finished; bills failing in it are retried above.
  const passOpen = !!passStart && !(finished && passRead < RUN_CAP);
  if (!dry && passStart) {
    await saveCursor(supabase, FULL_CURSOR, passOpen
      ? { ...full, startedAt: passStart, lastStartedDay: full.startedAt ? full.lastStartedDay : today }
      : { lastStartedDay: full.startedAt ? full.lastStartedDay : today, lastCompleteAt: new Date().toISOString() });
  }

  return NextResponse.json({
    targeted: targets.length,
    new_bills: newCount,
    updated_at_parliament: updatedAtParliament,
    updated_since: sinceIso,
    list_entries_read: listRead,
    retries: targets.length - beforePass - passTargets,
    full_pass: passStart ? { started_at: passStart, bills_this_run: passTargets, open: passOpen } : null,
    rows_written: ok,
    fail,
    not_found: notFound,
    failures,
    flagged_failed: flaggedFail,
    flagged_after_runs: FLAG_AFTER_RUNS,
    failing_items: failing.summary(),
    failures_saved: failuresSaved,
    skipped_for_time: skippedForTime,
    partial: skippedForTime > 0 || flaggedFail > 0 || passOpen,
    stopped_by: stoppedBy,
    stores_refresh: storesRefresh,
    changed_bills: changed.size,
    refreshed,
    // A run from a local server cannot refresh the live site: it lists what scripts/revalidate.js should refresh.
    ...(process.env.VERCEL_ENV !== 'production' ? { changed_bill_ids: [...changed], changed_member_ids: [...changedSponsors] } : {}),
    ...(dry ? { dry_run: true, would_refresh: { bills: changed.size, mps: changedSponsors.size } } : {}),
    duration_ms: Date.now() - started,
    syncedAt: new Date().toISOString(),
  }, { status: targets.length > 0 && ok === 0 && notFound < targets.length && !(stoppedBy && fail === 0) && !(flaggedFail > 0 && fail === 0) ? 502 : 200 });
}

const withBeat = withHeartbeat('/api/sync-bill-sponsors', GET_impl);
export const GET = (req: Request) => (onlyBills(req) ? GET_impl(req) : withBeat(req));
