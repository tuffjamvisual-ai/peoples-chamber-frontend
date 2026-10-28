// Pulls Electoral Commission donations into political_donations.
// Same shape as scripts/sync-electoral-commission-donations.js but
// running inside a Vercel function so it can run on a cron.
//
// Strategy: each daily pass reads the donations reported in the last WINDOW_DAYS (below) and upserts on ec_ref; the
// full register was loaded out of band by the script. A pass that runs out of time carries on next run (job 79).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, isPoliteStop, loadCursor, saveCursor } from '@/lib/sync-budget';
import { ROWS, fetchPage, mapRow, type ECResponse } from '@/lib/ec-donations';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// 27 Oct 2026 (job 79): every run in the 14 days to 26 Oct used its whole 240 s budget (about 24,000 rows) and the
// next run started again from the first page; the date window was never applied (see fetchPage). Now a pass reads the
// donations REPORTED in the last WINDOW_DAYS (the Commission publishes in arrears, so the accepted date of a newly
// published donation is often months back; on 27 Oct the last 90 days held 39 donations by accepted date and 828 by
// reported date), in 10-day slices, newest first, with the window fixed when the pass starts; the slice and page
// reached are saved in sync_cursor, and the next run carries on from there, so each donation is read once per pass
// (about 1,000 rows, 20 pages). The run stops starting pages at 70 per cent of maxDuration and ends by 80 per cent (lib/sync-budget.ts); a
// 429 stops it cleanly; a page that cannot be read, or a failed write, fails the run (502 or 500) with its progress
// saved. The response says partial: true until the pass is complete.
const ROUTE = '/api/sync-electoral-commission-donations';
const WINDOW_DAYS = 120;
const SLICE_DAYS = 10;
const CURSOR_MAX_AGE_MS = 3 * 86_400_000;
type Pass = { passFrom: string; passTo: string; slice: number; start: number };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  const startedAt = Date.now();
  const budget = new SyncBudget(maxDuration, { started: startedAt });

  // A pass covers the 90 days to the day it started, in 10-day slices from the newest; carry on with one under way.
  let pass: Pass | null;
  try { pass = await loadCursor<Pass>(supabase, ROUTE, CURSOR_MAX_AGE_MS); }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
  const resumed = !!pass;
  if (!pass) {
    const to = new Date();
    pass = { passFrom: new Date(to.getTime() - WINDOW_DAYS * 86_400_000).toISOString(), passTo: to.toISOString(), slice: 0, start: 0 };
  }
  const passFrom = new Date(pass.passFrom);
  const passTo = new Date(pass.passTo);
  const slices = Math.ceil((WINDOW_DAYS + 1) / SLICE_DAYS); // the window's days are inclusive at both ends
  const sliceRange = (k: number) => {
    const to = new Date(passTo.getTime() - k * SLICE_DAYS * 86_400_000);
    const fromMs = Math.max(passFrom.getTime(), to.getTime() - SLICE_DAYS * 86_400_000 + 86_400_000);
    return { from: new Date(fromMs).toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  };

  let upserted = 0;
  let pages = 0;
  let stoppedBy: string | null = null;
  let failure: { status: number; error: string } | null = null;
  const SUB_BATCH = 25;

  let { slice, start } = pass;
  outer: while (slice < slices) {
    const { from, to } = sliceRange(slice);
    for (;;) {
      if (budget.stopStarting()) { stoppedBy = 'time budget'; break outer; }
      let data: ECResponse;
      try {
        data = await fetchPage(start, from, to, budget);
      } catch (e) {
        if (isPoliteStop(e)) { stoppedBy = (e as Error).message; break outer; }
        failure = { status: 502, error: `page at ${start} of ${from} to ${to}: ${(e as Error).message}` };
        break outer;
      }
      const rows = (data.Result || []).map(mapRow).filter((r): r is Record<string, unknown> => r !== null);
      for (let b = 0; b < rows.length; b += SUB_BATCH) {
        const chunk = rows.slice(b, b + SUB_BATCH);
        const { error } = await supabase.from('political_donations').upsert(chunk, { onConflict: 'ec_ref' });
        if (error) { failure = { status: 500, error: `political_donations upsert: ${error.message}` }; break outer; }
        upserted += chunk.length;
        if (b + SUB_BATCH < rows.length) await new Promise((r) => setTimeout(r, 100));
      }
      pages++;
      start += ROWS;
      if ((data.Result || []).length === 0 || start >= (data.Total ?? 0)) break; // this slice is done
      await new Promise((r) => setTimeout(r, 150));
    }
    slice++;
    start = 0;
  }

  const complete = slice >= slices;
  const cursorSaved = await saveCursor(supabase, ROUTE, complete ? null : { ...pass, slice, start });
  const body = {
    ok: !failure,
    partial: !complete,
    stopped_by: stoppedBy,
    ...(failure ? { error: failure.error } : {}),
    resumed,
    pages,
    upserted,
    pass: { reported_from: pass.passFrom.slice(0, 10), reported_to: pass.passTo.slice(0, 10), slices, slices_done: slice, next_page_start: complete ? null : start },
    cursor_saved: cursorSaved,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: failure ? failure.status : 200 });
}

export const GET = withHeartbeat('/api/sync-electoral-commission-donations', GET_impl);
