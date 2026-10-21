import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Four times a day (03:40, 09:40, 15:40, 21:40 UTC; about 37 MPs a run, the whole list in 4 to 5 days): refresh per-MP total spoken contributions + word count for the current
// Parliament (since 2024-07-04) from the Hansard API, into mp_contribution_totals.
// Word count is computed from ContributionTextFull (Parliament publishes no word
// count). Takes current MPs never refreshed first, then the oldest
// spoken_synced_at (this sync's own time: updated_at is also set nightly by the
// written-questions sync). Each MP is saved as soon as it is counted, and no new
// MP starts after TIME_BUDGET_MS, so a run always returns inside maxDuration and
// the next carries on (until 21 Oct 2026 it saved only at the end and every run
// timed out, saving nothing). Counts/words are exact and complete per MP.

const API = 'https://hansard-api.parliament.uk/search/contributions/Spoken.json';
const START = '2024-07-04';
const BATCH = 220;
const CONCURRENCY = 8;
const TIME_BUDGET_MS = 210_000; // an MP with many speeches can take 40 s or more once started

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function memberTotals(id: number): Promise<{ member_id: number; total: number; words: number; ok: boolean }> {
  let skip = 0, total: number | null = null, words = 0, fetched = 0, guard = 0, ok = true;
  while (guard++ < 200) {
    let j;
    try {
      j = await fetchJson(`${API}?queryParameters.memberId=${id}&queryParameters.startDate=${START}&queryParameters.take=100&queryParameters.skip=${skip}`);
    } catch { ok = false; break; }   // a failed page must NOT be recorded as a real count
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

  let i = 0, upserted = 0, skipped = 0, writeErrors = 0, skippedForTime = 0;
  async function worker() {
    while (i < queue.length) {
      if (Date.now() - started > TIME_BUDGET_MS) { skippedForTime = queue.length - i; i = queue.length; return; }
      const id = queue[i++];
      let r;
      try { r = await memberTotals(id); } catch { skipped++; continue; }
      // Only an MP whose every page was read is saved; the others keep their last good value and come first next run.
      if (!r.ok) { skipped++; continue; }
      const now = new Date().toISOString();
      const { error } = await supabase.from('mp_contribution_totals').upsert({
        member_id: r.member_id, total_contributions: r.total, word_count: r.words,
        parliament_start: START, updated_at: now, spoken_synced_at: now,
      }, { onConflict: 'member_id' });
      if (error) writeErrors++; else upserted++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return NextResponse.json({
    ok: writeErrors === 0, rows_written: upserted, skipped, write_errors: writeErrors, skipped_for_time: skippedForTime,
    batch: queue.length, duration_ms: Date.now() - started, syncedAt: new Date().toISOString(),
  }, { status: queue.length > 0 && upserted === 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-mp-contributions', GET_impl);
