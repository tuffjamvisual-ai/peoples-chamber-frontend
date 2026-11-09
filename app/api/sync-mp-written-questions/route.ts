import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { readAll } from '@/lib/read-all';
import { isDryRun, sameValue } from '@/lib/mp-refresh';
import { countByMember, WQ_COUNT_FROM, type ArchiveQuestion } from '@/lib/mp-written-question-counts';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: each current MP's written question figures in mp_contribution_totals (written_questions, the number of Commons
// written questions tabled since 4 July 2024, and wq_top_departments, the five most asked departments), read by
// /transparency/mp-activity and the topic pages.
//
// JF2d (9 Nov 2026, jobs audit JA1 item 11): counted from parliament_written_questions, the Parliament archive that
// /api/sync-parliament-archive keeps current every 10 minutes and that MP pages already use (lib/mp-written-questions.ts),
// instead of one or more Questions and Statements API requests per MP (about 650 a day). One full recount each run
// (about 173 pages of 1,000 rows from our own database), so a question published late for a day already counted is
// still counted, which the old per MP date cursor missed. Only MPs whose figures changed are written. This route no
// longer fills mp_questions (full text); nothing on the site reads it (scripts/sync-mp-questions.js can still fill it).
// ?dry=1 outside production reads and counts but writes nothing.

type Stored = { member_id: number; written_questions: number | null; wq_top_departments: { dept: string; count: number }[] | null };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const dry = isDryRun(req);
  const today = new Date().toISOString().slice(0, 10);

  const { data: mps, error: mpErr } = await supabase
    .from('mps')
    .select('member_id')
    .or('current_member.is.null,current_member.eq.true');
  if (mpErr) return NextResponse.json({ error: `mps: ${mpErr.message}` }, { status: 500 });
  const ids = (mps ?? []).map((m) => m.member_id as number);

  const { data: storedRows, error: stErr } = await supabase
    .from('mp_contribution_totals')
    .select('member_id, written_questions, wq_top_departments')
    .in('member_id', ids);
  if (stErr) return NextResponse.json({ error: `mp_contribution_totals: ${stErr.message}` }, { status: 500 });
  const stored = new Map((storedRows as Stored[] | null ?? []).map((r) => [r.member_id, r]));

  const t0 = Date.now();
  const rows = await readAll<ArchiveQuestion & { id: number }>(() => supabase.from('parliament_written_questions'), {
    columns: 'id, asking_member_id, answering_body, date_tabled',
    filter: (q) => q.eq('house', 'Commons').gte('date_tabled', WQ_COUNT_FROM),
    orderBy: 'id',
    concurrency: 4,
    label: 'parliament_written_questions',
  });
  const readMs = Date.now() - t0;
  const figures = countByMember(rows, ids);

  const changed = ids
    .map((id) => ({ id, now: figures.get(id)!, was: stored.get(id) }))
    .filter(({ now, was }) => !was || was.written_questions !== now.written_questions || !sameValue(was.wq_top_departments ?? [], now.wq_top_departments));

  let upserted = 0;
  if (!dry) {
    for (let k = 0; k < changed.length; k += 100) {
      const batch = changed.slice(k, k + 100).map(({ id, now }) => ({
        member_id: id,
        written_questions: now.written_questions,
        wq_top_departments: now.wq_top_departments,
        wq_last_synced_date: today,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('mp_contribution_totals').upsert(batch, { onConflict: 'member_id' });
      if (error) return NextResponse.json({ error: `mp_contribution_totals upsert: ${error.message}`, refreshed: upserted }, { status: 500 });
      upserted += batch.length;
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run: dry,
    refreshed: upserted,
    figures_changed: changed.length,
    mps: ids.length,
    archive_rows_read: rows.length,
    archive_read_ms: readMs,
    parliament_api_requests: 0,
    ...(dry ? { sample_changes: changed.slice(0, 20).map(({ id, now, was }) => ({ member_id: id, was: was?.written_questions ?? null, now: now.written_questions })) } : {}),
    syncedAt: new Date().toISOString(),
  });
}

export const GET = withHeartbeat('/api/sync-mp-written-questions', GET_impl);
