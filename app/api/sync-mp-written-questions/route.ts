import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: fetch written questions from the Questions & Statements API into
// mp_questions (full text) and update counts/departments/cursor in
// mp_contribution_totals. Uses per-MP incremental cursor (wq_last_synced_date)
// so each run only fetches questions tabled since the last successful run.
// Cursor advances to max(date_tabled) + 1 day derived from actual API data,
// eliminating inclusive-boundary double-count risk. On zero-result runs the
// cursor holds steady at its current value.

const API = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
const START = '2024-07-04';
const CONCURRENCY = 8;

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'opengovt/1.0', Accept: 'application/json' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

type WQResult = {
  member_id: number;
  total: number;
  top: { dept: string; count: number }[];
  ok: boolean;
  isFirstRun: boolean;
  maxDateTabled: string | null;
};

async function memberWQ(id: number, sinceDate: string): Promise<WQResult> {
  const depts = new Map<string, number>();
  let skip = 0;
  let total: number | null = null;
  let fetched = 0;
  let guard = 0;
  let ok = true;
  let maxDateTabled: string | null = null;
  const isFirstRun = sinceDate === START;

  while (guard++ < 400) {
    let j: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        j = await fetchJson(
          `${API}?house=Commons&askingMemberId=${id}&tabledWhenFrom=${sinceDate}&take=100&skip=${skip}`,
        );
        break;
      } catch {
        if (attempt === 2) ok = false;
        else await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
      }
    }
    if (!ok || !j) break;

    if (total === null) total = (j.totalResults as number) ?? 0;
    const R = (j.results as { value: Record<string, unknown> }[]) ?? [];
    if (R.length === 0) break;

    // Interleaved per-page upsert — hides write latency inside fetch concurrency
    const rows = R.map((row) => {
      const v = row.value;
      const dt = typeof v.dateTabled === 'string' ? v.dateTabled.slice(0, 10) : null;
      const da = typeof v.dateAnswered === 'string' ? v.dateAnswered.slice(0, 10) : null;
      const dept = typeof v.answeringBodyName === 'string' ? v.answeringBodyName.trim() || null : null;

      if (dt && (!maxDateTabled || dt > maxDateTabled)) maxDateTabled = dt;
      if (dept) depts.set(dept, (depts.get(dept) ?? 0) + 1);

      const answers = Array.isArray(v.answers) ? (v.answers as Record<string, unknown>[]) : [];
      return {
        pq_id: v.id as number,
        member_id: id,
        question_text: (v.questionText as string | null) ?? null,
        answer_text: (answers[0]?.answerText as string | null) ?? null,
        department: dept,
        date_tabled: dt,
        date_answered: da,
        heading: (v.heading as string | null) ?? null,
        uin: (v.uin as string | null) ?? null,
        is_withdrawn: (v.isWithdrawn as boolean) ?? false,
      };
    });

    await supabase.from('mp_questions').upsert(rows, { onConflict: 'pq_id' });

    fetched += R.length;
    skip += R.length;
    if (fetched >= (total ?? 0) || R.length < 100) break;
  }

  if (total === null) ok = false;
  const top = [...depts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dept, count]) => ({ dept, count }));

  return { member_id: id, total: total ?? 0, top, ok, isFirstRun, maxDateTabled };
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: mps } = await supabase
    .from('mps')
    .select('member_id')
    .or('current_member.is.null,current_member.eq.true');
  const queue = (mps ?? []).map((m) => m.member_id as number);

  // Load existing cursor data for all MPs in one query
  const { data: cursorRows } = await supabase
    .from('mp_contribution_totals')
    .select('member_id, wq_last_synced_date, written_questions, wq_top_departments')
    .in('member_id', queue);

  type CursorEntry = {
    sinceDate: string;
    existingCount: number;
    existingDepts: { dept: string; count: number }[];
  };
  const cursorMap = new Map<number, CursorEntry>();
  for (const row of cursorRows ?? []) {
    const mid = row.member_id as number;
    cursorMap.set(mid, {
      sinceDate: (row.wq_last_synced_date as string | null) ?? START,
      existingCount: (row.written_questions as number | null) ?? 0,
      existingDepts: (row.wq_top_departments as { dept: string; count: number }[] | null) ?? [],
    });
  }

  const results: WQResult[] = [];
  let qi = 0;
  async function worker() {
    while (qi < queue.length) {
      const id = queue[qi++];
      const sinceDate = cursorMap.get(id)?.sinceDate ?? START;
      try {
        results.push(await memberWQ(id, sinceDate));
      } catch { /* memberWQ handles retries; skip on unexpected throw */ }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const good = results.filter((r) => r.ok);
  let upserted = 0;

  for (let k = 0; k < good.length; k += 100) {
    const batch = good.slice(k, k + 100).map((r) => {
      const existing = cursorMap.get(r.member_id);
      const existingCount = existing?.existingCount ?? 0;
      const existingDepts = existing?.existingDepts ?? [];

      let newCount: number;
      let newDepts: { dept: string; count: number }[];

      if (r.isFirstRun) {
        newCount = r.total;
        newDepts = r.top;
      } else {
        newCount = existingCount + r.total;
        const deptMap = new Map<string, number>(existingDepts.map((d) => [d.dept, d.count]));
        for (const { dept, count } of r.top) {
          deptMap.set(dept, (deptMap.get(dept) ?? 0) + count);
        }
        newDepts = [...deptMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([dept, count]) => ({ dept, count }));
      }

      let nextCursor: string;
      if (r.maxDateTabled) {
        const d = new Date(r.maxDateTabled + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + 1);
        nextCursor = d.toISOString().slice(0, 10);
      } else {
        // Zero-result run — hold cursor steady, don't advance past unfetched dates
        nextCursor = cursorMap.get(r.member_id)?.sinceDate ?? today;
      }

      return {
        member_id: r.member_id,
        written_questions: newCount,
        wq_top_departments: newDepts,
        wq_last_synced_date: nextCursor,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('mp_contribution_totals')
      .upsert(batch, { onConflict: 'member_id' });
    if (!error) upserted += batch.length;
  }

  const skipped = results.length - good.length;
  return NextResponse.json({
    ok: true,
    refreshed: upserted,
    skipped,
    total: queue.length,
    syncedAt: new Date().toISOString(),
  });
}
