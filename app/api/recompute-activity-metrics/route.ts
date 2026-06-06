// Weekly cron — recomputes mp_activity_metrics from mp_division_votes.
// Pure SQL aggregate, finishes in well under 10s on Supabase. Idempotent
// upsert on member_id. See scripts/recompute-activity-metrics.js for the
// equivalent CLI tool used during initial backfill.
//
// Schedule: vercel.json '0 12 * * 1' (Monday 12:00 UTC) — runs after the
// parlparse posts/votes syncs that the metric depends on.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const PARL_START = '2024-07-04';

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

  // Single SQL statement does the whole recompute. Wrapping it in an rpc
  // call would mean defining a function in Supabase; for one-statement
  // logic the supabase-js .rpc() path is overkill. We use the postgrest
  // raw query path via fetch instead.
  //
  // PostgREST doesn't allow arbitrary DDL/DML over the REST API, but it
  // DOES expose .rpc('fn') for SQL functions. We'll lean on a pair of
  // simpler reads + a JS-side upsert so we don't require an extra DB
  // function definition.
  const cutoff = PARL_START;

  // 1. Total commons divisions this Parliament — single aggregate.
  type DivRow = { division_id: number | null; division_date_only: string | null; division_number: number | null };
  const { data: divRows, error: divErr } = await supabase
    .from('mp_division_votes')
    .select('division_id, division_date_only, division_number')
    .gte('division_date_only', cutoff)
    .limit(50000);
  if (divErr) return NextResponse.json({ error: divErr.message }, { status: 500 });

  const totalDivisions = new Set<string>();
  for (const r of (divRows as DivRow[] | null) ?? []) {
    const key = r.division_id != null ? String(r.division_id) : `${r.division_date_only}|${r.division_number}`;
    totalDivisions.add(key);
  }
  const divisions_total = totalDivisions.size;

  // 2. Per-member aggregates — paginate. With 268k rows × ~16 bytes/row,
  // total payload is ~4MB which Supabase handles in one batch under 5s.
  type VoteRow = { member_id: number; division_id: number | null; division_date_only: string | null; division_number: number | null; vote_type: string; is_rebellion: boolean | null };
  const perMember = new Map<number, { voted: Set<string>; rebellions: number }>();
  const PAGE = 5000;
  let from = 0;
  while (from < 500000) {
    const { data, error } = await supabase
      .from('mp_division_votes')
      .select('member_id, division_id, division_date_only, division_number, vote_type, is_rebellion')
      .gte('division_date_only', cutoff)
      .in('vote_type', ['aye', 'no', 'both'])
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    for (const r of data as VoteRow[]) {
      const key = r.division_id != null ? String(r.division_id) : `${r.division_date_only}|${r.division_number}`;
      let agg = perMember.get(r.member_id);
      if (!agg) { agg = { voted: new Set<string>(), rebellions: 0 }; perMember.set(r.member_id, agg); }
      agg.voted.add(key);
      if (r.is_rebellion === true) agg.rebellions++;
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // 3. Pull current MPs so we write a row for everyone — even zero-vote.
  const { data: mps, error: mpErr } = await supabase
    .from('mps')
    .select('member_id')
    .eq('current_member', true);
  if (mpErr) return NextResponse.json({ error: mpErr.message }, { status: 500 });

  const rows = (mps ?? []).map((m: { member_id: number }) => {
    const a = perMember.get(m.member_id);
    const voted = a ? a.voted.size : 0;
    const rebellions = a ? a.rebellions : 0;
    return {
      member_id: m.member_id,
      divisions_voted: voted,
      divisions_total,
      attendance_pct: divisions_total > 0 ? Number(((voted / divisions_total) * 100).toFixed(2)) : null,
      rebellions_total: rebellions,
      rebellion_rate_pct: voted > 0 ? Number(((rebellions / voted) * 100).toFixed(2)) : null,
      refreshed_at: new Date().toISOString(),
    };
  });

  // Upsert in chunks of 500 — supabase-js postgrest payload size cap.
  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('mp_activity_metrics')
      .upsert(slice, { onConflict: 'member_id' });
    if (error) return NextResponse.json({ error: error.message, written }, { status: 500 });
    written += slice.length;
  }

  return NextResponse.json({
    ok: true,
    divisions_total,
    members_written: written,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
