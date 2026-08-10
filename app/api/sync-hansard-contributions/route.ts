import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { createClient } from '@supabase/supabase-js';

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

const API = 'https://members-api.parliament.uk/api/Members';
const TIME_BUDGET_MS = 250_000;
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const { data: order, error: rpcErr } = await supabase.rpc('mp_contributions_stalest');
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  const memberIds = (order || []).map((r: any) => r.member_id as number);

  const start = Date.now();
  const now = new Date().toISOString();
  let processed = 0, rows_written = 0, withData = 0, failed = 0;
  let budgetHit = false;

  for (const id of memberIds) {
    if (Date.now() - start > TIME_BUDGET_MS) { budgetHit = true; break; }
    let items: any[];
    try {
      const j = await (await fetch(`${API}/${id}/ContributionSummary?page=1`)).json();
      items = Array.isArray(j?.items) ? j.items : [];
    } catch {
      failed++; await sleep(120); continue;
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
      const { error } = await supabase.from('mp_contributions').upsert(rows, { onConflict: 'member_id,debate_website_id' });
      if (error) { console.error(`[hansard] member ${id} upsert failed: ${error.message}`); failed++; }
      else rows_written += rows.length;
    }
    await sleep(50);
  }

  return NextResponse.json({
    ok: true,
    total_current_mps: memberIds.length,
    processed, withData, failed, rows_written,
    done: !budgetHit,
    syncedAt: now,
  });
}

export const GET = withHeartbeat('/api/sync-hansard-contributions', GET_impl);
