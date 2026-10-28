import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { RateLimited, retryAfterSeconds } from '@/lib/sync-budget';
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

const API = 'https://hansard-api.parliament.uk/search/contributions/Spoken.json';
const START = '2024-07-04';
const BATCH = 220;
const CONCURRENCY = 8;
const TIME_BUDGET_MS = 170_000; // no new MP starts after this; an MP with many speeches can take 40 s or more
const RUN_BUDGET_MS = 235_000;  // the whole run, MPs in progress included, ends by this
// A local test may shorten both (SYNC_TEST_BUDGET_MS, as in lib/sync-budget.ts); never on Vercel.
const TEST_MS = !process.env.VERCEL ? Number(process.env.SYNC_TEST_BUDGET_MS) || 0 : 0;
const DUE_DAYS = 7;

async function fetchJson(url: string, deadline: number) {
  const left = deadline - Date.now();
  if (left < 1_000) throw new Error('run budget reached');
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(Math.min(30_000, left)) });
  if (res.status === 429) throw new RateLimited(url, 429, retryAfterSeconds(res.headers.get('retry-after')));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function memberTotals(id: number, deadline: number): Promise<{ member_id: number; total: number; words: number; ok: boolean }> {
  let skip = 0, total: number | null = null, words = 0, fetched = 0, guard = 0, ok = true;
  while (guard++ < 200) {
    let j;
    try {
      j = await fetchJson(`${API}?queryParameters.memberId=${id}&queryParameters.startDate=${START}&queryParameters.take=100&queryParameters.skip=${skip}`, deadline);
    } catch (e) { if (e instanceof RateLimited) throw e; ok = false; break; }   // a failed page must NOT be recorded as a real count
    if (total === null) total = j.SpokenResultCount || 0;
    const R = j.Results || [];
    if (R.length === 0) break;
    for (const r of R) {
      const t: string = r.ContributionTextFull || r.ContributionText || '';
      words += t.split(/\s+/).filter(Boolean).length;
    }
    fetched += R.length; skip += R.length;
    if (fetched >= (total || 0) || R.length < 100) break;
  }
  // If no page ever succeeded, or a page failed mid-way (undercounted words),
  // mark not-ok so the caller skips the upsert and the MP keeps its last good
  // value, to be retried next run. Prevents transient errors writing a false 0.
  if (total === null) ok = false;
  return { member_id: id, total: total || 0, words, ok };
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

  // Current MPs + their last-refresh time; missing-from-table first, then stalest.
  const { data: mps, error: mpsErr } = await supabase.from('mps').select('member_id').or('current_member.is.null,current_member.eq.true');
  const { data: have, error: haveErr } = await supabase.from('mp_contribution_totals').select('member_id, spoken_synced_at');
  if (mpsErr || haveErr) return NextResponse.json({ error: (mpsErr || haveErr)!.message }, { status: 500 });
  const updatedAt = new Map((have || []).map((r) => [r.member_id, (r.spoken_synced_at as string | null) || '']));
  const queue = (mps || [])
    .map((m) => ({ id: m.member_id as number, u: updatedAt.get(m.member_id as number) || '' }))
    .sort((a, b) => a.u.localeCompare(b.u)) // '' (missing) sorts first, then oldest
    .slice(0, BATCH)
    .map((x) => x.id);

  const deadline = started + (TEST_MS || RUN_BUDGET_MS);
  const startCutoff = TEST_MS ? Math.round(TEST_MS * 0.7) : TIME_BUDGET_MS;
  let i = 0, upserted = 0, skipped = 0, writeErrors = 0, skippedForTime = 0, stoppedInProgress = 0;
  let rateLimited: string | null = null;
  async function worker() {
    while (i < queue.length) {
      if (Date.now() - started > startCutoff) { skippedForTime = queue.length - i; i = queue.length; return; }
      const id = queue[i++];
      let r;
      try { r = await memberTotals(id, deadline); } catch (e) {
        if (e instanceof RateLimited) { rateLimited = e.message; skippedForTime += queue.length - i; i = queue.length; return; }
        skipped++; continue;
      }
      // Only an MP whose every page was read is saved; the others keep their last good value and come first next run.
      if (!r.ok) { if (Date.now() >= deadline - 1_000) stoppedInProgress++; else skipped++; continue; }
      const now = new Date().toISOString();
      const { error } = await supabase.from('mp_contribution_totals').upsert({
        member_id: r.member_id, total_contributions: r.total, word_count: r.words,
        parliament_start: START, updated_at: now, spoken_synced_at: now,
      }, { onConflict: 'member_id' });
      if (error) writeErrors++; else upserted++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Overdue after this run: current MPs never counted, or not counted for DUE_DAYS (the ones saved above are now fresh).
  const dueBefore = new Date(Date.now() - DUE_DAYS * 86_400_000).toISOString();
  const fresh = new Set((have || []).filter((r) => ((r.spoken_synced_at as string | null) || '') >= dueBefore).map((r) => r.member_id as number));
  const overdue = Math.max(0, (mps || []).filter((m) => !fresh.has(m.member_id as number)).length - upserted);

  return NextResponse.json({
    ok: writeErrors === 0, rows_written: upserted, skipped,
    partial: overdue > 0, overdue, rate_limited: rateLimited, write_errors: writeErrors, skipped_for_time: skippedForTime, stopped_in_progress: stoppedInProgress,
    batch: queue.length, duration_ms: Date.now() - started, syncedAt: new Date().toISOString(),
  }, { status: queue.length > 0 && upserted === 0 && skipped + writeErrors > 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-mp-contributions', GET_impl);
