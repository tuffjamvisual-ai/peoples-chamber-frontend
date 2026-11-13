import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { RateLimited, retryAfterSeconds, loadCursor, saveCursor } from '@/lib/sync-budget';
import {
  countMember, planQueue, PARLIAMENT_START, PAGE, RUN_BUDGET_MS, START_CUTOFF_MS, DB_TIMEOUT_MS, CURSOR_ROUTE,
  type Cursor, type InProgress, type Page,
} from '@/lib/mp-contributions-sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
const BATCH = 220;
const CONCURRENCY = 8;
// A local test may shorten the run (SYNC_TEST_BUDGET_MS, as in lib/sync-budget.ts); never on Vercel.
const TEST_MS = !process.env.VERCEL ? Number(process.env.SYNC_TEST_BUDGET_MS) || 0 : 0;
const DUE_DAYS = 7;
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

async function GET_impl(req: Request) {
  const started = Date.now();
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);
  const now = new Date();

  // Current MPs + their last-refresh time; MPs part way through first, then missing-from-table, then stalest.
  const { data: mps, error: mpsErr } = await supabase.from('mps').select('member_id').or('current_member.is.null,current_member.eq.true').abortSignal(db());
  const { data: have, error: haveErr } = await supabase.from('mp_contribution_totals').select('member_id, spoken_synced_at').abortSignal(db());
  if (mpsErr || haveErr) return NextResponse.json({ error: (mpsErr || haveErr)!.message }, { status: 500 });
  let cursor: Cursor | null = null;
  try { cursor = await loadCursor<Cursor>(supabase, CURSOR_ROUTE, 7 * 86_400_000); } catch { cursor = null; }
  const syncedAt = new Map((have || []).map((r) => [r.member_id as number, (r.spoken_synced_at as string | null) || '']));
  const { queue, resume } = planQueue((mps || []).map((m) => m.member_id as number), syncedAt, cursor, now, BATCH);

  const deadline = started + (TEST_MS || RUN_BUDGET_MS);
  const startCutoff = TEST_MS ? Math.round(TEST_MS * 0.75) : START_CUTOFF_MS;
  const inProgress: Record<string, InProgress> = {};
  const attempted = new Set<number>();
  let i = 0, upserted = 0, skipped = 0, writeErrors = 0, skippedForTime = 0, paused = 0, resumed = 0;
  let rateLimited: string | null = null;
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
  const overdue = Math.max(0, (mps || []).filter((m) => !fresh.has(m.member_id as number)).length - upserted);

  return NextResponse.json({
    ok: writeErrors === 0, rows_written: upserted, skipped,
    partial: overdue > 0, overdue, rate_limited: rateLimited, write_errors: writeErrors, skipped_for_time: skippedForTime,
    paused_part_way: paused, resumed, cursor_saved: cursorSaved,
    batch: queue.length, duration_ms: Date.now() - started, syncedAt: new Date().toISOString(),
  }, { status: queue.length > 0 && upserted === 0 && paused === 0 && skipped + writeErrors > 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-mp-contributions', GET_impl);
