// Cron: tops up mp_activity_metrics.speeches_year + questions_year
// from members-api.parliament.uk for the N MPs least-recently-refreshed.
//
// Why N per run instead of all 650:
//   members-api ~100-200ms per call × 2 calls × 650 MPs = 200-260s
//   even with high concurrency. That's close to the 300s function cap
//   AND has zero margin if the upstream slows. We refresh the 150 most
//   stale rows per run — at 4 runs per day (every 6h) the full table
//   cycles every ~4 days, well inside the weekly meaningful-change
//   window for activity metrics.
//
// Schedule: '15 */6 * * *' (every 6 hours, +15m so it doesn't collide
// with the other crons on the hour).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 270;

const BATCH = 150;
const CONCURRENCY = 12;
// Timeouts (owner's approval, 23 Oct 2026; the 06:15 and 12:15 runs that day hit the 270 s limit): each request
// gives up after 20 s, which counts as a failure for that MP only; no new MP starts after TIME_BUDGET, so anything
// still in flight ends within 20 s of it, well inside maxDuration; and results are saved every SAVE_EVERY MPs, so a
// run cut short keeps what it did.
const REQUEST_TIMEOUT_MS = 20_000;
const SAVE_EVERY = 25;
const TWELVE_MONTHS_AGO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
})();

class RequestTimeout extends Error {}

async function fetchJson(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (e) {
    if (ctrl.signal.aborted) throw new RequestTimeout(`timed out after ${REQUEST_TIMEOUT_MS} ms: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
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

async function speechesAndQuestions(memberId: number): Promise<{ speeches: number; questions: number }> {
  const [spokenJson, wqJson] = await Promise.all([
    fetchJson(`https://hansard-api.parliament.uk/search/contributions/Spoken.json?queryParameters.memberId=${memberId}&queryParameters.startDate=${cutoffIso}`),
    fetchJson(`https://members-api.parliament.uk/api/Members/${memberId}/WrittenQuestions?take=1`),
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();
  const TIME_BUDGET = 200_000;

  // Find the N MPs whose contributions/questions are most stale.
  // We use a separate marker — speeches_year IS NULL bubbles to the top
  // (fresh-installed rows), then oldest refreshed_at next.
  // (refreshed_at is shared with the division-aggregate recompute, but
  // we don't have a separate marker for the contribution fields so we
  // accept the modest over-coverage: contribution sync runs more often
  // than weekly recompute anyway.)
  const { data: targets, error: tErr } = await supabase
    .from('mp_activity_metrics')
    .select('member_id, speeches_year, refreshed_at')
    .order('speeches_year', { ascending: true, nullsFirst: true })
    .order('refreshed_at', { ascending: true })
    .limit(BATCH);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!targets || targets.length === 0) return NextResponse.json({ ok: true, processed: 0, note: 'no rows in mp_activity_metrics' });

  const queue = [...targets];
  let pending: { member_id: number; speeches_year: number; questions_year: number; refreshed_at: string }[] = [];
  let processed = 0; // rows saved
  let failures = 0;
  let requestTimeouts = 0;
  let timedOut = false;
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
      else processed += rows.length;
    });
    return lastSave;
  }

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - startedAt > TIME_BUDGET) { timedOut = true; return; }
      const t = queue.shift();
      if (!t) return;
      try {
        const r = await speechesAndQuestions(t.member_id);
        pending.push({ member_id: t.member_id, speeches_year: r.speeches, questions_year: r.questions, refreshed_at: new Date().toISOString() });
        if (pending.length >= SAVE_EVERY) await save();
      } catch (e) {
        failures++;
        if (e instanceof RequestTimeout) requestTimeouts++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await save();

  const body = {
    requested: targets.length,
    processed,
    failures,
    request_timeouts: requestTimeouts,
    timed_out: timedOut,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  };
  // A run cut short by the budget is still a success with its real row count (the heartbeat reads `processed`);
  // only a failed save is an error.
  if (saveError) return NextResponse.json({ ok: false, error: saveError, ...body }, { status: 500 });
  return NextResponse.json({ ok: true, ...body });
}

export const GET = withHeartbeat('/api/sync-members-contributions', GET_impl);
