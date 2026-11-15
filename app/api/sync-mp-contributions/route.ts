import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { applyWindow, countedThrough, windowStart, INCREMENTAL_CURSOR, type Contribution, type IncrementalCursor } from '@/lib/mp-contributions-incremental';
import { RateLimited, retryAfterSeconds, loadCursor, saveCursor } from '@/lib/sync-budget';
import {
  countMember, planQueue, yesterday, PARLIAMENT_START, PAGE, RUN_BUDGET_MS, START_CUTOFF_MS, DB_TIMEOUT_MS, CURSOR_ROUTE,
  type Cursor, type InProgress, type Page,
} from '@/lib/mp-contributions-sync';
export const dynamic = 'force-dynamic';
// T1-CRONALL (owner approved 15 Nov 2026): one run a day since 15 Nov (T1-CRONDAILY), so each run now takes every
// current MP, with an 800 s limit (Vercel Fluid compute) at the same number of requests at a time as before.
export const maxDuration = 800;

// Four times a day (03:43, 09:43, 15:43, 21:43 UTC; about 37 MPs a run, the whole list in 4 to 5 days): refresh per-MP total spoken contributions + word count for the current
// Parliament (since 2024-07-04) from the Hansard API, into mp_contribution_totals.
// Word count is computed from ContributionTextFull (Parliament publishes no word
// count). Takes current MPs never refreshed first, then the oldest
// spoken_synced_at (this sync's own time: updated_at is also set nightly by the
// written-questions sync). Each MP is saved as soon as it is counted, and no new
// MP starts after TIME_BUDGET_MS, so a run always returns inside maxDuration and
// the next carries on (until 21 Oct 2026 it saved only at the end and every run
// timed out, saving nothing). Counts/words are exact and complete per MP.
//
// 22 Oct 2026 (owner's approval): every run ends inside RUN_BUDGET_MS (235 s). The 09:40 run that day saved 38 MPs
// but was killed at 300 s (09:45:06): TIME_BUDGET_MS only stopped new MPs starting, and the MPs already being
// counted ran on past the limit, so the heartbeat was never written and the run looked like it recorded nothing.
// Now an MP still being counted at RUN_BUDGET_MS is stopped, not saved (a part count is never written), and comes
// first next run; each request's timeout is cut to the time left.
// 27 Oct 2026 (job 79): a 429 from the Hansard API stops the run cleanly (the MPs not reached come first next run),
// The run is time-limited by design (about 37 MPs of the queue), so partial: true means MPs are overdue after it: any
// current MP not refreshed for DUE_DAYS (the whole list goes round in 4 to 5 days).
// 13 Nov 2026 (Cowork, COWORK-TO-T1 ENTRY 4): the 15:43 GMT run was killed at 300 s, and runs had ended at the 235 s
// budget for 14 days. Now every run ends by RUN_BUDGET_MS (200 s), every database call has a time limit, and an MP
// still being counted when the time is up is saved part way (sync_cursor) and finished first next run, from a fixed end
// date so the pages do not move (lib/mp-contributions-sync.ts).

const API = 'https://hansard-api.parliament.uk/search/contributions/Spoken.json';
const BATCH = 700; // MPs with no stored total yet (or one paused part way): the full per-MP count, as before
const CONCURRENCY = 8;
// A local test may shorten the run (SYNC_TEST_BUDGET_MS, as in lib/sync-budget.ts); never on Vercel.
const TEST_MS = !process.env.VERCEL ? Number(process.env.SYNC_TEST_BUDGET_MS) || 0 : 0;
const DUE_DAYS = 8; // weekly since 15 Nov 2026 (ENTRY 124, 125)
const db = () => AbortSignal.timeout(DB_TIMEOUT_MS);

async function fetchPage(memberId: number, skip: number, endDate: string, deadline: number): Promise<Page> {
  const left = deadline - Date.now();
  if (left < 1_000) throw new Error('run budget reached');
  const url = `${API}?queryParameters.memberId=${memberId}&queryParameters.startDate=${PARLIAMENT_START}&queryParameters.endDate=${endDate}`
    + `&queryParameters.take=${PAGE}&queryParameters.skip=${skip}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(Math.min(30_000, left)) });
  if (res.status === 429) throw new RateLimited(url, 429, retryAfterSeconds(res.headers.get('retry-after')));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { SpokenResultCount?: number; Results?: { ContributionTextFull?: string; ContributionText?: string }[] };
  return { total: j.SpokenResultCount || 0, texts: (j.Results || []).map((r) => r.ContributionTextFull || r.ContributionText || '') };
}

// One page of every Commons spoken contribution in a date window, all MPs at once (T1-MPINCR, ENTRY 125).
async function fetchWindowPage(start: string, end: string, skip: number, deadline: number): Promise<{ total: number; items: Contribution[] }> {
  const left = deadline - Date.now();
  if (left < 1_000) throw new Error('run budget reached');
  const url = `${API}?queryParameters.house=Commons&queryParameters.startDate=${start}&queryParameters.endDate=${end}`
    + `&queryParameters.take=${PAGE}&queryParameters.skip=${skip}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(Math.min(30_000, left)) });
  if (res.status === 429) throw new RateLimited(url, 429, retryAfterSeconds(res.headers.get('retry-after')));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { TotalResultCount?: number; Results?: { MemberId?: string | number; ContributionExtId?: string; SittingDate?: string; ContributionTextFull?: string; ContributionText?: string }[] };
  const items = (j.Results || []).filter((r) => r.ContributionExtId && r.SittingDate && Number(r.MemberId) > 0).map((r) => ({
    memberId: Number(r.MemberId), extId: String(r.ContributionExtId), day: String(r.SittingDate).slice(0, 10), text: r.ContributionTextFull || r.ContributionText || '',
  }));
  return { total: Number(j.TotalResultCount) || 0, items };
}

async function GET_impl(req: Request) {
  const started = Date.now();
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);
  const now = new Date();

  // Current MPs + their last-refresh time; MPs part way through first, then missing-from-table, then stalest.
  const { data: mps, error: mpsErr } = await supabase.from('mps').select('member_id').or('current_member.is.null,current_member.eq.true').abortSignal(db());
  const { data: have, error: haveErr } = await supabase.from('mp_contribution_totals').select('member_id, spoken_synced_at, total_contributions, word_count').abortSignal(db());
  if (mpsErr || haveErr) return NextResponse.json({ error: (mpsErr || haveErr)!.message }, { status: 500 });
  let cursor: Cursor | null = null;
  try { cursor = await loadCursor<Cursor>(supabase, CURSOR_ROUTE, 7 * 86_400_000); } catch { cursor = null; }
  const syncedAt = new Map((have || []).map((r) => [r.member_id as number, (r.spoken_synced_at as string | null) || '']));
  const deadline = started + (TEST_MS || RUN_BUDGET_MS);

  // 1. The weekly top up (T1-MPINCR): MPs with a complete stored total, not paused part way, get the contributions
  //    dated since their last count, read once for all MPs. Totals are written only if the whole window was read.
  const current = new Set((mps || []).map((m) => m.member_id as number));
  const pausedIds = new Set(Object.keys(cursor?.inProgress ?? {}).map(Number));
  const stored = (have || []).filter((r) => current.has(r.member_id as number) && r.spoken_synced_at && !pausedIds.has(r.member_id as number));
  const through = new Map(stored.map((r) => [r.member_id as number, countedThrough(r.spoken_synced_at as string)]));
  const windowEnd = yesterday(now);
  const start = windowStart(through.values());
  let incr: Record<string, unknown> = { mps: 0 };
  let incrRateLimited: string | null = null;
  if (start && start <= windowEnd) {
    let prev: IncrementalCursor | null = null;
    try { prev = await loadCursor<IncrementalCursor>(supabase, INCREMENTAL_CURSOR, 30 * 86_400_000); } catch { prev = null; }
    const items: Contribution[] = [];
    let total = -1, pages = 0, complete = false, error: string | null = null;
    try {
      for (let skip = 0; total < 0 || skip < total; skip += PAGE) {
        const p = await fetchWindowPage(start, windowEnd, skip, deadline);
        total = p.total; pages++;
        items.push(...p.items);
        if (p.items.length < PAGE) break;
      }
      complete = true;
    } catch (e) {
      if (e instanceof RateLimited) incrRateLimited = e.message;
      error = (e as Error).message;
    }
    if (complete) {
      const r = applyWindow(items, through, prev ? new Set(prev.ids) : null, windowEnd);
      const at = new Date().toISOString();
      const rows = stored.map((s) => {
        const a = r.add.get(s.member_id as number) ?? { n: 0, words: 0 };
        return { member_id: s.member_id, total_contributions: (Number(s.total_contributions) || 0) + a.n, word_count: (Number(s.word_count) || 0) + a.words,
          parliament_start: PARLIAMENT_START, updated_at: at, spoken_synced_at: at };
      });
      let writeErr: string | null = null;
      for (let k = 0; k < rows.length && !writeErr; k += 200) {
        const { error: we } = await supabase.from('mp_contribution_totals').upsert(rows.slice(k, k + 200), { onConflict: 'member_id' }).abortSignal(db());
        if (we) writeErr = we.message;
      }
      // The next run's overlap: ids from the last OVERLAP_DAYS of this window. Saved only after the totals are written.
      const cursorOk = writeErr ? false : await saveCursor(supabase, INCREMENTAL_CURSOR, { through: windowEnd, ids: r.keepIds } satisfies IncrementalCursor);
      incr = { mps: rows.length, window: `${start} to ${windowEnd}`, pages, read: items.length, counted: r.counted, already_counted: r.skippedSeen,
        mps_with_new: r.add.size, write_error: writeErr, cursor_saved: cursorOk, first_weekly_run: !prev };
      if (writeErr) incr.ok = false;
    } else {
      incr = { mps: 0, window: `${start} to ${windowEnd}`, pages, read: items.length, stopped: error, note: 'window not finished: nothing written; the next run reads it again' };
    }
  }
  // 2. The full per-MP count, only for current MPs with no stored total, or paused part way through one.
  const needFull = new Map([...syncedAt].filter(([id]) => !through.has(id) || pausedIds.has(id)));
  const fullIds = (mps || []).map((m) => m.member_id as number).filter((id) => !through.has(id) || pausedIds.has(id));
  const { queue, resume } = planQueue(fullIds, needFull, cursor, now, BATCH);

  const startCutoff = TEST_MS ? Math.round(TEST_MS * 0.75) : START_CUTOFF_MS;
  const inProgress: Record<string, InProgress> = {};
  const attempted = new Set<number>();
  let i = 0, upserted = 0, skipped = 0, writeErrors = 0, skippedForTime = 0, paused = 0, resumed = 0;
  let rateLimited: string | null = incrRateLimited;
  async function worker() {
    while (i < queue.length && !rateLimited) {
      if (Date.now() - started > startCutoff) { skippedForTime = queue.length - i; i = queue.length; return; }
      const id = queue[i++];
      attempted.add(id);
      const from = resume.get(id) ?? null;
      if (from) resumed++;
      let r;
      try {
        r = await countMember(id, from, fetchPage, { deadline, now, isStop: (e) => e instanceof RateLimited });
      } catch (e) {
        if (e instanceof RateLimited) { rateLimited = e.message; if (from) inProgress[id] = from; skippedForTime += queue.length - i; i = queue.length; return; }
        skipped++; continue;
      }
      if (r.kind === 'paused') { inProgress[id] = r.state; paused++; continue; }
      if (r.kind === 'failed') { skipped++; continue; }
      // Only a complete count is saved; an MP part way through keeps its last good value until it is finished.
      const at = new Date().toISOString();
      const { error } = await supabase.from('mp_contribution_totals').upsert({
        member_id: id, total_contributions: r.total, word_count: r.words,
        parliament_start: PARLIAMENT_START, updated_at: at, spoken_synced_at: at,
      }, { onConflict: 'member_id' }).abortSignal(db());
      if (error) { writeErrors++; if (from) inProgress[id] = from; } else upserted++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  // Positions not reached this run (queue cut short by the time or a 429) are kept too.
  for (const [id, st] of resume) if (!attempted.has(id)) inProgress[id] = st;
  const cursorSaved = await saveCursor(supabase, CURSOR_ROUTE, Object.keys(inProgress).length ? { inProgress } : null);

  // Overdue after this run: current MPs never counted, or not counted for DUE_DAYS (the ones saved above are now fresh).
  const dueBefore = new Date(Date.now() - DUE_DAYS * 86_400_000).toISOString();
  const fresh = new Set((have || []).filter((r) => ((r.spoken_synced_at as string | null) || '') >= dueBefore).map((r) => r.member_id as number));
  const toppedUp = (incr.mps as number) > 0 && !incr.write_error ? (incr.mps as number) : 0;
  const overdue = Math.max(0, (mps || []).filter((m) => !fresh.has(m.member_id as number)).length - upserted - toppedUp);

  return NextResponse.json({
    ok: writeErrors === 0 && incr.ok !== false, rows_written: upserted + toppedUp, full_counts: upserted, weekly_top_up: incr, skipped,
    partial: overdue > 0, overdue, rate_limited: rateLimited, write_errors: writeErrors, skipped_for_time: skippedForTime,
    paused_part_way: paused, resumed, cursor_saved: cursorSaved,
    batch: queue.length, duration_ms: Date.now() - started, syncedAt: new Date().toISOString(),
  }, { status: queue.length > 0 && upserted === 0 && paused === 0 && skipped + writeErrors > 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-mp-contributions', GET_impl);
