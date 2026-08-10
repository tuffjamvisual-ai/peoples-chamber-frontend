import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: per-MP count of written parliamentary questions tabled this Parliament
// (Commons), plus the answering departments each MP questions most, from the
// Questions & Statements API into mp_contribution_totals. Written questions are
// a backbench scrutiny tool; ministers/whips/Speaker table ~0 by convention,
// which the page accounts for. A failed fetch skips the MP (keeps last good
// value) rather than writing a false 0.

const API = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
const START = '2024-07-04';
const CONCURRENCY = 8;

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function memberWQ(id: number): Promise<{ member_id: number; total: number; top: { dept: string; count: number }[]; ok: boolean }> {
  const depts = new Map<string, number>();
  let skip = 0, total: number | null = null, fetched = 0, guard = 0, ok = true;
  while (guard++ < 400) {
    let j;
    try {
      j = await fetchJson(`${API}?house=Commons&askingMemberId=${id}&tabledWhenFrom=${START}&take=100&skip=${skip}`);
    } catch { ok = false; break; }
    if (total === null) total = j.totalResults || 0;
    const R = j.results || [];
    if (R.length === 0) break;
    for (const row of R) {
      const d: string = (row.value?.answeringBodyName || '').trim();
      if (d) depts.set(d, (depts.get(d) || 0) + 1);
    }
    fetched += R.length; skip += R.length;
    if (fetched >= (total || 0) || R.length < 100) break;
  }
  if (total === null) ok = false;
  const top = [...depts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([dept, count]) => ({ dept, count }));
  return { member_id: id, total: total || 0, top, ok };
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

  const { data: mps } = await supabase.from('mps').select('member_id').or('current_member.is.null,current_member.eq.true');
  const queue = (mps || []).map((m) => m.member_id as number);

  const results: { member_id: number; total: number; top: { dept: string; count: number }[]; ok: boolean }[] = [];
  let i = 0;
  async function worker() {
    while (i < queue.length) {
      const id = queue[i++];
      try { results.push(await memberWQ(id)); } catch { /* skip */ }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const good = results.filter((r) => r.ok);
  const skipped = results.length - good.length;
  let upserted = 0;
  for (let k = 0; k < good.length; k += 100) {
    const batch = good.slice(k, k + 100).map((r) => ({
      member_id: r.member_id,
      written_questions: r.total,
      wq_top_departments: r.top,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('mp_contribution_totals').upsert(batch, { onConflict: 'member_id' });
    if (!error) upserted += batch.length;
  }

  return NextResponse.json({ ok: true, refreshed: upserted, skipped, total: queue.length, syncedAt: new Date().toISOString() });
}
