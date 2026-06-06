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

export const dynamic = 'force-dynamic';
export const maxDuration = 270;

const BATCH = 150;
const CONCURRENCY = 12;
const TWELVE_MONTHS_AGO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
})();

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function speechesAndQuestions(memberId: number): Promise<{ speeches: number; questions: number }> {
  const [contribJson, wqJson] = await Promise.all([
    fetchJson(`https://members-api.parliament.uk/api/Members/${memberId}/ContributionSummary?skip=0&take=300`),
    fetchJson(`https://members-api.parliament.uk/api/Members/${memberId}/WrittenQuestions?skip=0&take=100`),
  ]);
  type CItem = { value?: { sittingDate?: string; speechCount?: number; interventionCount?: number; supplementaryQuestionCount?: number } };
  type WItem = { value?: { dateTabled?: string } };
  let speeches = 0;
  for (const it of (contribJson.items || []) as CItem[]) {
    const v = it.value || {};
    const sitting = v.sittingDate ? new Date(v.sittingDate) : null;
    if (!sitting || sitting < TWELVE_MONTHS_AGO) continue;
    speeches += (v.speechCount || 0) + (v.interventionCount || 0) + (v.supplementaryQuestionCount || 0);
  }
  let questions = 0;
  for (const it of (wqJson.items || []) as WItem[]) {
    const v = it.value || {};
    const tabled = v.dateTabled ? new Date(v.dateTabled) : null;
    if (!tabled || tabled < TWELVE_MONTHS_AGO) continue;
    questions++;
  }
  return { speeches, questions };
}

export async function GET(req: Request) {
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
  const TIME_BUDGET = 240_000;

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
  const results = new Map<number, { speeches: number; questions: number }>();
  let failures = 0;
  let timedOut = false;

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - startedAt > TIME_BUDGET) { timedOut = true; return; }
      const t = queue.shift();
      if (!t) return;
      try {
        const r = await speechesAndQuestions(t.member_id);
        results.set(t.member_id, r);
      } catch {
        failures++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Batched upsert via supabase-js for the rows we got.
  const refreshedAt = new Date().toISOString();
  const rows = Array.from(results.entries()).map(([member_id, r]) => ({
    member_id,
    speeches_year: r.speeches,
    questions_year: r.questions,
    refreshed_at: refreshedAt,
  }));
  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from('mp_activity_metrics')
      .upsert(rows, { onConflict: 'member_id' });
    if (upErr) return NextResponse.json({ error: upErr.message, processed: rows.length }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    requested: targets.length,
    processed: rows.length,
    failures,
    timed_out: timedOut,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: refreshedAt,
  });
}
