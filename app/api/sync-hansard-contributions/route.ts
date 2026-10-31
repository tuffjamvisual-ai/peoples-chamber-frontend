import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';
import { SyncBudget, politeFetch, isPoliteStop } from '@/lib/sync-budget';
import { refreshMps, isDryRun, sameValue } from '@/lib/mp-refresh';
import { noteChanged } from '@/lib/refresh-count';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily sync of recent Hansard chamber contributions per MP from the Parliament
// Members API (ContributionSummary), into mp_contributions — the "In the House"
// tab on /mps/[id]. Automates scripts/sync-mp-contributions.js, which upserted
// the same shape but only ever ran by hand (hence stale since 12 June).
//
// NOT to be confused with /api/sync-mp-contributions, which writes the separate
// mp_contribution_totals (activity aggregates).
//
// Upserts on the existing UNIQUE (member_id, debate_website_id) — no dedup
// problem. MPs are processed stalest-first (RPC mp_contributions_stalest) within
// a time budget, upserting per MP so progress persists if the budget is hit; the
// remainder is picked up next run.
//
// 27 Oct 2026 (job 79): it ran to 265 s of 300 s, with no timeout on its requests. Now (lib/sync-budget.ts) each
// request has a timeout cut to the time left, no MP starts after 70 per cent of maxDuration, the run ends by 80 per
// cent, a 429 stops it cleanly, the response says partial: true while MPs were left, and a run in which every request
// failed returns 502 instead of ok.
//
// 31 Oct 2026 (owner; freshness alert "stopped part way on every run since 2026-10-28"): one MP at a time, each
// Members API request taking about 2.8 s (median of 10), a run got through only about 40 to 60 of 650 MPs before the
// 70 per cent cut-off, so a full pass took over two weeks against the 3 days lib/sync-cycles.ts expects. MPs are now
// synced 4 at a time (CONCURRENCY): four workers take the next MP from the same stalest-first list, every request
// still goes through politeFetch with the run's budget, a 429 still stops the run cleanly (no worker starts another MP;
// requests in flight finish and are saved), and each MP's change comparison and upsert are unchanged. The response
// adds concurrency and duration_s. The schedule stays once a day: Vercel Pro includes no function time (usage is
// billed on demand against the monthly credit), so more runs were left for the owner to decide.

const API = 'https://members-api.parliament.uk/api/Members';
// MPs synced at once (owner, 31 Oct 2026): at most this many requests to the Members API in flight.
const CONCURRENCY = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const n = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? Math.round(x) : 0; };

/* eslint-disable @typescript-eslint/no-explicit-any */
async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);
  // MP pages keep for a week (owner, 30 Oct 2026, cache Stage 2a part 3): each MP's rows are compared with the stored
  // ones and only MPs whose rows changed are refreshed. Rows are still written each run (updated_at orders the MPs
  // stalest first). ?dry=1 (local tests only) reads and compares but writes nothing.
  const dry = isDryRun(req);
  const changedMps = new Set<number>();

  const { data: order, error: rpcErr } = await supabase.rpc('mp_contributions_stalest');
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  const memberIds = (order || []).map((r: any) => r.member_id as number);

  const budget = new SyncBudget(maxDuration);
  const now = new Date().toISOString();
  let processed = 0, rows_written = 0, withData = 0, failed = 0, dbFailed = 0;
  let stoppedBy: string | null = null;
  let fetchFailed = 0; // MPs whose request failed (they were reached, unlike MPs never started)
  let next = 0;        // index of the next MP to start, shared by the workers

  // CONCURRENCY workers take MPs in turn from the same stalest-first list, so at most CONCURRENCY requests are in flight.
  // The first worker to see the budget end, or a polite stop (429 or the run's time), stops every worker from starting
  // another MP; requests already in flight finish and are saved.
  async function worker() {
    for (;;) {
      if (stoppedBy || next >= memberIds.length) return;
      if (budget.stopStarting()) { stoppedBy = 'time budget'; return; }
      await syncMp(memberIds[next++]);
    }
  }

  async function syncMp(id: number) {
    let items: any[];
    try {
      const res = await politeFetch(`${API}/${id}/ContributionSummary?page=1`, {}, { budget });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      items = Array.isArray(j?.items) ? j.items : [];
    } catch (e) {
      if (isPoliteStop(e)) { stoppedBy = stoppedBy ?? (e as Error).message; return; }
      failed++; fetchFailed++; await sleep(120); return;
    }
    processed++;
    if (items.length) withData++;

    const rows = items.slice(0, 20).map((it: any) => {
      const v = it.value || {};
      const hansard = (it.links || []).find((l: any) => /hansard/i.test(l.href || ''))?.href || null;
      return {
        member_id: id,
        debate_website_id: v.debateWebsiteId ?? null,
        debate_id: v.debateId ?? null,
        debate_title: (v.debateTitle || '').trim(),
        sitting_date: v.sittingDate ? v.sittingDate.slice(0, 10) : null,
        section: v.section ?? null,
        house: v.house ?? null,
        speech_count: n(v.speechCount),
        question_count: n(v.questionCount),
        intervention_count: n(v.interventionCount),
        answer_count: n(v.answerCount),
        statement_count: n(v.statementsCount),
        total_contributions: n(v.totalContributions),
        hansard_url: hansard,
        updated_at: now,
      };
    // debate_website_id is the conflict key — a null one can't be deduped, so drop it.
    }).filter((r) => r.debate_website_id != null);

    if (rows.length) {
      const { data: old } = await supabase.from('mp_contributions').select('*').eq('member_id', id).in('debate_website_id', rows.map((r) => r.debate_website_id));
      const oldBy = new Map(((old ?? []) as Record<string, unknown>[]).map((r) => [String(r.debate_website_id), r]));
      // The columns the MP page shows (a re-issued debate_id alone changes nothing on the page).
      const SHOWN = ['debate_title', 'sitting_date', 'section', 'house', 'speech_count', 'question_count', 'intervention_count', 'answer_count', 'statement_count', 'total_contributions', 'hansard_url'];
      const strip = (r: Record<string, unknown>) => Object.fromEntries(SHOWN.map((k) => [k, k === 'sitting_date' && typeof r[k] === 'string' ? (r[k] as string).slice(0, 10) : r[k]]));
      if (rows.some((r) => { const o = oldBy.get(String(r.debate_website_id)); return !o || !sameValue(strip(o), strip(r)); })) changedMps.add(id);
    }
    if (rows.length && !dry) {
      const { error } = await supabase.from('mp_contributions').upsert(rows, { onConflict: 'member_id,debate_website_id' });
      if (error) { console.error(`[hansard] member ${id} upsert failed: ${error.message}`); failed++; dbFailed++; }
      else rows_written += rows.length;
    }
    await sleep(50);
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, memberIds.length) }, () => worker()));
  // MPs never started, or whose request was cut short by a polite stop: the next run takes them first (stalest first).
  const notReached = stoppedBy ? memberIds.length - processed - fetchFailed : 0;

  noteChanged(dry ? 0 : changedMps.size);
  const mpRefresh = !dry && changedMps.size ? refreshMps(changedMps) : null;
  const body = {
    ok: failed === 0,
    mps_changed: changedMps.size,
    mp_refresh: mpRefresh,
    ...(dry ? { dry_run: true } : {}),
    total_current_mps: memberIds.length,
    processed, withData, failed, rows_written,
    partial: stoppedBy !== null,
    stopped_by: stoppedBy,
    not_reached: notReached,
    concurrency: CONCURRENCY,
    duration_s: Math.round(budget.spent() / 100) / 10,
    syncedAt: now,
  };
  // A real failure fails the run: every database write failed, or every request did.
  if (dbFailed > 0 && rows_written === 0) return NextResponse.json(body, { status: 500 });
  if (memberIds.length > 0 && processed === 0 && !stoppedBy) return NextResponse.json(body, { status: 502 });
  return NextResponse.json(body);
}

export const GET = withHeartbeat('/api/sync-hansard-contributions', GET_impl);
