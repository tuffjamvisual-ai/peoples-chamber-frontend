import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { DONATIONS_TAG } from '@/lib/page-reads';
import { createClient } from '@supabase/supabase-js';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, isPoliteStop, loadCursor, saveCursor } from '@/lib/sync-budget';
import { ROWS, fetchPage, mapRow, type ECResponse } from '@/lib/ec-donations';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly full sweep of the Electoral Commission donations register, for late corrections (day job 27 Oct 2026, Part 3).
// The daily sync (/api/sync-electoral-commission-donations) reads only donations reported in the last 120 days, so a
// change the Commission makes to an older record would otherwise never reach the site.
//
// A sweep reads the whole register, newest first, 50 rows a page, and upserts every row on ec_ref. It only inserts and
// updates: nothing is ever deleted. The register is about 2,000 pages, more than one run can read, so the position is
// kept in sync_cursor and each run carries on from it (lib/sync-budget.ts: no new page after 70 per cent of
// maxDuration, done by 80 per cent; a 429 stops the run cleanly). Each run starts one page back from where the last
// stopped, so a donation added at the top in between cannot push a row past the sweep.
//
// When: the cron calls this daily at 21:17 UTC (26 minutes from the nearest heavy syncs). A new sweep starts on Saturdays only; on other days a run carries on a
// sweep under way and otherwise does nothing (no outside request). So there is one sweep a week, finished over the
// next few days (about 5 runs). The response says partial: true while a sweep is under way and partial: false on the
// run that finishes it, which the freshness monitor reads (lib/sync-cycles.ts).
const ROUTE = '/api/sweep-electoral-commission-donations';
const START_DAY = 6; // Saturday (UTC)
const CURSOR_MAX_AGE_MS = 8 * 86_400_000;
const SUB_BATCH = 25;
type Sweep = { startedAt: string; start: number; total: number | null };

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);
  const startedAt = Date.now();
  const budget = new SyncBudget(maxDuration, { started: startedAt });

  let sweep: Sweep | null;
  try { sweep = await loadCursor<Sweep>(supabase, ROUTE, CURSOR_MAX_AGE_MS); }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
  const resumed = !!sweep;
  const force = new URL(req.url).searchParams.get('start') === '1'; // a hand started sweep (owner or a test)
  if (!sweep) {
    if (new Date().getUTCDay() !== START_DAY && !force) {
      // Nothing under way and not the start day: no sweep due. No partial flag, so the cycle record is left as it is.
      return NextResponse.json({ ok: true, rows: 0, swept: false, reason: 'no sweep under way; the next starts on Saturday' });
    }
    sweep = { startedAt: new Date().toISOString(), start: 0, total: null };
  }

  let start = resumed ? Math.max(0, sweep.start - ROWS) : sweep.start;
  let total = sweep.total;
  let upserted = 0;
  let pages = 0;
  let stoppedBy: string | null = null;
  let failure: { status: number; error: string } | null = null;
  let complete = false;

  outer: for (;;) {
    if (budget.stopStarting()) { stoppedBy = 'time budget'; break; }
    let data: ECResponse;
    try {
      data = await fetchPage(start, null, null, budget);
    } catch (e) {
      if (isPoliteStop(e)) { stoppedBy = (e as Error).message; break; }
      failure = { status: 502, error: `page at ${start}: ${(e as Error).message}` };
      break;
    }
    total = data.Total ?? total;
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
    if ((data.Result || []).length === 0 || start >= (data.Total ?? 0)) { complete = true; break; }
    await new Promise((r) => setTimeout(r, 150));
  }

  // /parties/[slug]/money reads political_donations under this tag (lib/page-reads.ts): refreshed after any write.
  if (upserted > 0) revalidateTag(DONATIONS_TAG, 'max');
  const cursorSaved = await saveCursor(supabase, ROUTE, complete ? null : { ...sweep, start, total });
  const body = {
    ok: !failure,
    partial: !complete,
    swept: true,
    stopped_by: stoppedBy,
    ...(failure ? { error: failure.error } : {}),
    resumed,
    pages,
    upserted,
    rows: upserted,
    sweep: { started_at: sweep.startedAt, next_page_start: complete ? null : start, register_total: total },
    cursor_saved: cursorSaved,
    elapsed_ms: Date.now() - startedAt,
  };
  return NextResponse.json(body, { status: failure ? failure.status : 200 });
}

export const GET = withHeartbeat(ROUTE, GET_impl);
