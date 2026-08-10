import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: refresh per-MP total spoken contributions + word count for the current
// Parliament (since 2024-07-04) from the Hansard API, into mp_contribution_totals.
// Word count is computed from ContributionTextFull (Parliament publishes no word
// count). Processes the BATCH stalest MPs (plus any current MP missing from the
// table) per run so it fits the function time limit; cycles the full roster
// every few days. Counts/words are exact and complete per MP at each refresh.

const API = 'https://hansard-api.parliament.uk/search/contributions/Spoken.json';
const START = '2024-07-04';
const BATCH = 220;
const CONCURRENCY = 8;

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' } });
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

export async function GET(req: Request) {
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
  const { data: mps } = await supabase.from('mps').select('member_id').or('current_member.is.null,current_member.eq.true');
  const { data: have } = await supabase.from('mp_contribution_totals').select('member_id, updated_at');
  const updatedAt = new Map((have || []).map((r) => [r.member_id, r.updated_at as string]));
  const queue = (mps || [])
    .map((m) => ({ id: m.member_id as number, u: updatedAt.get(m.member_id as number) || '' }))
    .sort((a, b) => a.u.localeCompare(b.u)) // '' (missing) sorts first, then oldest
    .slice(0, BATCH)
    .map((x) => x.id);

  const results: { member_id: number; total: number; words: number; ok: boolean }[] = [];
  let i = 0;
  async function worker() {
    while (i < queue.length) {
      const id = queue[i++];
      try { results.push(await memberTotals(id)); } catch { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Only write MPs whose fetch fully succeeded; skipped ones keep their last
  // good value and are picked up next run (they sort as stalest).
  const good = results.filter((r) => r.ok);
  const skipped = results.length - good.length;
  let upserted = 0;
  for (let k = 0; k < good.length; k += 100) {
    const batch = good.slice(k, k + 100).map((r) => ({
      member_id: r.member_id, total_contributions: r.total, word_count: r.words,
      parliament_start: START, updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('mp_contribution_totals').upsert(batch, { onConflict: 'member_id' });
    if (!error) upserted += batch.length;
  }

  return NextResponse.json({ ok: true, refreshed: upserted, skipped, batch: queue.length, syncedAt: new Date().toISOString() });
}
