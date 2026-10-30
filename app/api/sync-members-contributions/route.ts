// Cron: tops up mp_activity_metrics.speeches_year + questions_year
// from members-api.parliament.uk for the next N MPs after the saved cursor (sync_cursor), unfilled rows first.
//
// Why N per run instead of all 650:
//   members-api ~100-200ms per call × 2 calls × 650 MPs = 200-260s
//   even with high concurrency. That's close to the 300s function cap
//   AND has zero margin if the upstream slows. We refresh the next 150
//   rows per run — at 4 runs per day (every 6h) the full table
//   cycles every ~4 days, well inside the weekly meaningful-change
//   window for activity metrics.
//
// Schedule: '23 */6 * * *' since 27 Oct 2026 (every 6 hours, off the hour so it doesn't collide
// with the other crons on the hour).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { RateLimited, retryAfterSeconds } from '@/lib/sync-budget';
import { refreshMps, isDryRun } from '@/lib/mp-refresh';
export const dynamic = 'force-dynamic';
export const maxDuration = 270;

const BATCH = 150;
const CONCURRENCY = 12;
const ROUTE = '/api/sync-members-contributions';
// Hard deadline (owner's approval, 23 Oct 2026; the 06:15 and 12:15 runs that day hit the 270 s limit, and every run
// re-read the same lowest-count MPs): one deadline is set when the run starts, and the run returns before it. Every
// request is aborted at the earlier of its own 20 s timeout and the deadline, less FINAL_SAVE_MS kept for the closing
// save; no request or mid-run save starts with less than RESERVE_MS left; and the rows fetched and the progress cursor
// are always saved before the run returns, so it ends well inside maxDuration and the next run carries on from there.
// 27 Oct 2026 (job 79): the run now ends by 80 per cent of maxDuration (216 s of 270 s; was 235 s), a 429 from either
// API stops it cleanly like the deadline (the MPs not reached are first next run), and the response says partial.
const DEADLINE_MS = 216_000;
const RESERVE_MS = 15_000;
const FINAL_SAVE_MS = 5_000;
const REQUEST_TIMEOUT_MS = 20_000;
const DB_TIMEOUT_MS = 10_000;
const SAVE_EVERY = 25;
const TWELVE_MONTHS_AGO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
})();

// For local tests only: a shorter deadline (MEMBERS_CONTRIB_DEADLINE_MS). Never honoured on Vercel production.
function deadlineMs(): number {
  const override = Number(process.env.MEMBERS_CONTRIB_DEADLINE_MS);
  if (process.env.VERCEL_ENV !== 'production' && Number.isFinite(override) && override > 0) return override;
  return DEADLINE_MS;
}

class RequestTimeout extends Error {}
class DeadlineReached extends Error {}

async function fetchJson(url: string, deadline: number) {
  const left = deadline - Date.now();
  if (left < RESERVE_MS) throw new DeadlineReached('deadline');
  const ctrl = new AbortController();
  const untilStop = left - FINAL_SAVE_MS; // requests end by the deadline less the time kept for the closing save
  const byDeadline = untilStop < REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => ctrl.abort(), Math.min(REQUEST_TIMEOUT_MS, untilStop));
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' }, signal: ctrl.signal });
    if (res.status === 429) throw new RateLimited(url, 429, retryAfterSeconds(res.headers.get('retry-after')));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof RateLimited) throw e;
    if (ctrl.signal.aborted) throw byDeadline ? new DeadlineReached('deadline') : new RequestTimeout('request timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Database calls get their own timeout, so a stalled save cannot hold the run past the limit.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DB_TIMEOUT_MS);
  init?.signal?.addEventListener('abort', () => ctrl.abort());
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// Members API ContributionSummary and WrittenQuestions both silently
// ignore `skip`/`take`, returning the same first 20 items regardless,
// so manual pagination over them is impossible. The previous loop
// counted those 20 items many times over. Switched to:
//   speeches_year — Hansard search/contributions/Spoken.json with
//     startDate filter; SpokenResultCount is the accurate 12-month
//     spoken-contribution count.
//   questions_year — Members API WrittenQuestions totalResults,
//     which is the CAREER TOTAL (no working 12-month filter exists).
const cutoffIso = TWELVE_MONTHS_AGO.toISOString().slice(0, 10);

async function speechesAndQuestions(memberId: number, deadline: number): Promise<{ speeches: number; questions: number }> {
  const [spokenJson, wqJson] = await Promise.all([
    fetchJson(`https://hansard-api.parliament.uk/search/contributions/Spoken.json?queryParameters.memberId=${memberId}&queryParameters.startDate=${cutoffIso}`, deadline),
    fetchJson(`https://members-api.parliament.uk/api/Members/${memberId}/WrittenQuestions?take=1`, deadline),
  ]);
  return {
    speeches: Number(spokenJson.SpokenResultCount) || 0,
    questions: Number(wqJson.totalResults) || 0,
  };
}

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key, { global: { fetch: fetchWithTimeout } });

  const startedAt = Date.now();
  const deadline = startedAt + deadlineMs();
  const done = (extra: Record<string, unknown>) => {
    // Run time and counts only; no MP data.
    console.log(`[sync-members-contributions] ${Date.now() - startedAt} ms, ${String(extra.processed ?? 0)} rows saved`);
    return extra;
  };

  // Which MPs: any row never filled (speeches_year IS NULL) first, then the next MPs by member_id after the saved
  // cursor, wrapping round to the start, so every run moves on through all of them. (The old order, speeches_year
  // then refreshed_at, picked the same lowest-count MPs every run.)
  const { data: cur, error: cErr } = await supabase.from('sync_cursor').select('cursor').eq('route', ROUTE).maybeSingle();
  if (cErr) return NextResponse.json(done({ ok: false, error: `cursor read: ${cErr.message}`, processed: 0 }), { status: 500 });
  const after = Number((cur?.cursor as { after?: number } | null)?.after) || 0;

  const { data: unfilled, error: uErr } = await supabase
    .from('mp_activity_metrics').select('member_id').is('speeches_year', null).order('member_id').limit(BATCH);
  if (uErr) return NextResponse.json(done({ ok: false, error: uErr.message, processed: 0 }), { status: 500 });
  const priority = (unfilled ?? []).map((r) => r.member_id as number);
  const pick = async (gt: number, n: number) => {
    if (n <= 0) return [] as number[];
    const { data, error } = await supabase
      .from('mp_activity_metrics').select('member_id').not('speeches_year', 'is', null).gt('member_id', gt).order('member_id').limit(n);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.member_id as number);
  };
  let sequence: number[];
  try {
    const first = await pick(after, BATCH - priority.length);
    // Wrap round: start again from the lowest member_id, without repeating any picked above.
    const rest = await pick(0, BATCH - priority.length - first.length);
    sequence = [...first, ...rest.filter((id) => !first.includes(id) && id <= after)];
  } catch (e) {
    return NextResponse.json(done({ ok: false, error: (e as Error).message, processed: 0 }), { status: 500 });
  }
  const targets = [...priority, ...sequence];
  // Unchanged rows are not rewritten (owner, 30 Oct 2026, cache Stage 2a part 3): only an MP whose counts changed is
  // saved, and only their page is refreshed (MP pages keep for a week). ?dry=1 (local tests only) writes nothing.
  const dry = isDryRun(req);
  const storedCounts = new Map<number, { s: number | null; q: number | null }>();
  for (let i = 0; i < targets.length; i += 200) {
    const { data: sc, error: scErr } = await supabase.from('mp_activity_metrics').select('member_id, speeches_year, questions_year').in('member_id', targets.slice(i, i + 200));
    if (scErr) return NextResponse.json(done({ ok: false, error: `stored counts: ${scErr.message}`, processed: 0 }), { status: 500 });
    for (const r of sc ?? []) storedCounts.set(r.member_id as number, { s: r.speeches_year as number | null, q: r.questions_year as number | null });
  }
  const changedMps = new Set<number>();
  let unchanged = 0;
  if (targets.length === 0) return NextResponse.json(done({ ok: true, processed: 0, note: 'no rows in mp_activity_metrics' }));

  type State = 'pending' | 'fetched' | 'saved' | 'failed' | 'stopped';
  const state = new Map<number, State>(targets.map((id) => [id, 'pending']));
  const queue = [...targets];
  let pending: { member_id: number; speeches_year: number; questions_year: number; refreshed_at: string }[] = [];
  let processed = 0; // rows saved
  let failures = 0;
  let requestTimeouts = 0;
  let stoppedAtDeadline = false;
  let rateLimited: string | null = null;
  let saveError: string | null = null;
  let lastSave: Promise<void> = Promise.resolve();

  // Saves are chained, so two workers never upsert at once and every row is written exactly once.
  function save(): Promise<void> {
    const rows = pending;
    pending = [];
    if (!rows.length) return lastSave;
    lastSave = lastSave.then(async () => {
      const { error: upErr } = await supabase.from('mp_activity_metrics').upsert(rows, { onConflict: 'member_id' });
      if (upErr) saveError = saveError ?? upErr.message;
      else { processed += rows.length; for (const r of rows) state.set(r.member_id, 'saved'); }
    });
    return lastSave;
  }

  async function worker() {
    while (queue.length > 0) {
      // No new request with less than RESERVE_MS left.
      if (deadline - Date.now() < RESERVE_MS) { stoppedAtDeadline = true; return; }
      const id = queue.shift();
      if (id === undefined) return;
      try {
        const r = await speechesAndQuestions(id, deadline);
        state.set(id, 'fetched');
        const old = storedCounts.get(id);
        if (old && old.s === r.speeches && old.q === r.questions) { state.set(id, 'saved'); unchanged++; continue; }
        changedMps.add(id);
        if (dry) { state.set(id, 'saved'); continue; }
        pending.push({ member_id: id, speeches_year: r.speeches, questions_year: r.questions, refreshed_at: new Date().toISOString() });
        // Mid-run saves only while there is time; whatever is left is saved below, before returning.
        if (pending.length >= SAVE_EVERY && deadline - Date.now() >= RESERVE_MS) await save();
      } catch (e) {
        if (e instanceof DeadlineReached) { state.set(id, 'stopped'); stoppedAtDeadline = true; return; }
        if (e instanceof RateLimited) { state.set(id, 'stopped'); rateLimited = e.message; queue.length = 0; return; }
        state.set(id, 'failed');
        failures++;
        if (e instanceof RequestTimeout) requestTimeouts++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await save();

  // The cursor moves past every MP in the sequence up to the first one not finished (not started, stopped at the
  // deadline, or not saved); an MP whose requests failed outright is passed over until the next full round.
  let newAfter = after;
  for (const id of sequence) {
    const st = state.get(id);
    if (st === 'saved' || st === 'failed') newAfter = id;
    else break;
  }
  let cursorError: string | null = null;
  const mpRefresh = !dry && changedMps.size ? refreshMps(changedMps) : null;
  if (newAfter !== after && !dry) {
    const { error } = await supabase.from('sync_cursor').upsert(
      { route: ROUTE, cursor: { after: newAfter }, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (error) cursorError = error.message;
  }

  const notStarted = [...state.values()].filter((st) => st === 'pending' || st === 'stopped').length;
  const body = done({
    requested: targets.length,
    processed,
    failures,
    request_timeouts: requestTimeouts,
    not_started: notStarted,
    timed_out: stoppedAtDeadline,
    rate_limited: rateLimited,
    // Stopped by the deadline or a rate limit with MPs not reached; they come first next run.
    partial: notStarted > 0,
    unchanged,
    mps_changed: changedMps.size,
    mp_refresh: mpRefresh,
    ...(dry ? { dry_run: true } : {}),
    cursor_from: after,
    cursor_to: newAfter,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
  // A run stopped at the deadline is still a success with its real row count (the heartbeat reads `processed`);
  // a failed save of rows or of the cursor is an error.
  if (saveError || cursorError) return NextResponse.json({ ok: false, error: saveError ?? `cursor save: ${cursorError}`, ...body }, { status: 500 });
  return NextResponse.json({ ok: true, ...body });
}

export const GET = withHeartbeat('/api/sync-members-contributions', GET_impl);
