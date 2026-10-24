import { readingStage, divisionBillSegment, billNameKey, billWindow } from '@/lib/bill-reading';
import { NextResponse } from 'next/server';
import { revalidateBillPages } from '@/lib/revalidate-bills';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Backfills the bill.commons_ayes / commons_noes / commons_division_id /
// commons_division_title / commons_vote_date columns by searching the
// Commons Votes API for the bill's Third Reading division. Without
// this, /bills/[id] shows "MPs' vote: not yet divided" even for Acts
// that clearly passed (Tobacco and Vapes, etc.).
//
// Targets: every bill whose commons_ayes is null/0 — same idempotent
// pattern as sync-bill-stages. Never-tried bills first, then those last
// tried more than RETRY_DAYS ago. Runs daily.
//
// Time-budgeted (21 Oct 2026): it took up to 600 bills one at a time
// with no limit, and timed out at 300 s on 3 of its last 7 runs. No new
// bill starts after TIME_BUDGET_MS, and each search has a 20 s limit;
// every bill is saved (or stamped as tried) as it goes, so the next run
// carries on.

const RUN_CAP = 600; // bills per invocation
const TIME_BUDGET_MS = 240_000;
const RETRY_DAYS = 7;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Division = {
  DivisionId: number;
  Date: string;
  Title: string;
  AyeCount: number;
  NoCount: number;
};

// Strip "Act 2026" / "(Amendment) Act 2026" trailers to derive the
// title under which the bill was divided ("Tobacco and Vapes Bill").
function billNameFromActTitle(title: string): string {
  return title
    .replace(/\s+Act\s+\d{4}\s*$/i, ' Bill')
    .replace(/\s+Act\s*$/i, ' Bill')
    .trim();
}

async function searchDivisions(searchTerm: string): Promise<Division[]> {
  // take=100 so big-ticket bills (Employment Rights, Online Safety etc.)
  // don't bury the Third Reading under 25 Lords-amendment motions.
  const url = `https://commonsvotes-api.parliament.uk/data/divisions.json/search?queryParameters.searchTerm=${encodeURIComponent(searchTerm)}&queryParameters.take=100`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Commons Votes API ${res.status}`);
  return (await res.json()) as Division[];
}

// Pick the vote on the bill itself (lib/bill-reading.ts, audit P10): a division on this bill's
// name, held while the bill was before Parliament, that IS its Third Reading (preferred) or
// Second Reading. Amendment and motion divisions, and same-named bills from other sessions,
// are never used.
function pickDivision(bill: { title: string | null; stages: unknown }, divisions: Division[]): Division | null {
  const win = billWindow(bill.stages as Parameters<typeof billWindow>[0]);
  if (!win) return null;
  const key = billNameKey(bill.title || '');
  const own = divisions.filter((d) => {
    const t = new Date(d.Date).getTime();
    return t >= win.from && t <= win.to && billNameKey(divisionBillSegment(d.Title)) === key && readingStage(d.Title) > 0;
  });
  if (!own.length) return null;
  const best = Math.max(...own.map((d) => readingStage(d.Title)));
  return own.filter((d) => readingStage(d.Title) === best).sort((a, b) => b.Date.localeCompare(a.Date))[0];
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
  if (!url || !key) {
    return NextResponse.json({ error: 'env missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  // First pass: target only never-tried rows. Once tried_at is non-null
  // for every bill, switch to retrying the oldest. PostgREST's
  // order-with-nullsFirst is unreliable so we filter explicitly.
  let { data: rows, error: selErr } = await supabase
    .from('bill')
    .select('id, parliament_id, title, stages')
    .or('commons_ayes.is.null,commons_ayes.eq.0')
    .not('parliament_id', 'is', null)
    // Hidden bills (bill.hidden_reason) have no page and are not refreshed (24 Oct 2026).
    .is('hidden_reason', null)
    .is('commons_vote_tried_at', null)
    .limit(RUN_CAP);
  if (!selErr && (!rows || rows.length === 0)) {
    // Pass-1 finished. Retry oldest tried_at rows in case the API now
    // has divisions that weren't there before.
    ({ data: rows, error: selErr } = await supabase
      .from('bill')
      .select('id, parliament_id, title, stages')
      .or('commons_ayes.is.null,commons_ayes.eq.0')
      .not('parliament_id', 'is', null)
      .is('hidden_reason', null)
      .lt('commons_vote_tried_at', new Date(Date.now() - RETRY_DAYS * 86_400_000).toISOString())
      .order('commons_vote_tried_at', { ascending: true })
      .limit(RUN_CAP));
  }
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = rows || [];
  let updated = 0;
  let noMatch = 0;
  let fail = 0;
  const failures: Array<{ id: number; detail: string }> = [];
  let skippedForTime = 0;

  for (const [i, bill] of targets.entries()) {
    if (Date.now() - started > TIME_BUDGET_MS) { skippedForTime = targets.length - i; break; }
    try {
      const billName = billNameFromActTitle(bill.title || '');
      if (!billName) continue;
      const divisions = await searchDivisions(billName);
      const chosen = pickDivision(bill, divisions);
      // Always stamp tried_at so the SELECT advances to the next batch
      // next run, whether or not we got a match.
      const now = new Date().toISOString();
      if (!chosen) {
        await supabase.from('bill').update({ commons_vote_tried_at: now }).eq('id', bill.id);
        noMatch++;
        continue;
      }
      const { error } = await supabase
        .from('bill')
        .update({
          commons_ayes: chosen.AyeCount,
          commons_noes: chosen.NoCount,
          commons_division_id: chosen.DivisionId,
          commons_division_title: chosen.Title,
          commons_vote_date: chosen.Date,
          commons_vote_tried_at: now,
        })
        .eq('id', bill.id);
      if (error) throw error;
      updated++;
    } catch (err) {
      fail++;
      if (failures.length < 20) failures.push({ id: bill.id, detail: (err as Error).message });
    }
    await sleep(120);
  }

  // Show the new Commons votes on /bills and the session archive straight away (lib/revalidate-bills.ts).
  if (updated > 0) revalidateBillPages();

  return NextResponse.json({
    targeted: targets.length,
    rows_written: updated + noMatch,
    updated,
    noMatch,
    fail,
    failures,
    skipped_for_time: skippedForTime,
    duration_ms: Date.now() - started,
    syncedAt: new Date().toISOString(),
  }, { status: targets.length > 0 && updated + noMatch === 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-bill-commons-votes', GET_impl);
