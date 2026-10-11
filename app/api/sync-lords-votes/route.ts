import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import {
  LORDS_VOTES_API,
  LORDS_PARLIAMENT_START,
  fetchLordsJson,
  listLordsDivisionIds,
  loadBillMatcher,
  buildLordsDivisionRows,
  writeLordsDivision,
  type BillMatcher,
} from '@/lib/lords-votes';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: keep lords_divisions / lords_division_votes current (initial load
// is done once by scripts/import-lords-votes.ts). Each run re-fetches every
// division dated from 14 days before the newest one already stored, so:
//   - new divisions are added,
//   - recent records Parliament has corrected are refreshed,
//   - and if the sync was down for a while it catches up from where it
//     stopped rather than leaving a gap.
// Bill links are re-resolved on each refresh, so a bill added to the bill
// table after its Lords votes were first stored gets linked automatically.
// Time-budgeted so the route always returns (and records its heartbeat)
// inside maxDuration; leftovers are picked up next run.

const CONCURRENCY = 3;
const DELAY_MS = 250;
const TIME_BUDGET_MS = 240_000;
const LOOKBACK_DAYS = 14;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  const { data: latest, error: latestErr } = await supabase
    .from('lords_divisions')
    .select('division_date')
    .order('division_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) return NextResponse.json({ error: 'db', message: latestErr.message }, { status: 500 });

  const anchor = latest?.division_date ? new Date(`${latest.division_date}T00:00:00Z`) : new Date(`${LORDS_PARLIAMENT_START}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - LOOKBACK_DAYS);
  const startDate = anchor.toISOString().slice(0, 10) < LORDS_PARLIAMENT_START ? LORDS_PARLIAMENT_START : anchor.toISOString().slice(0, 10);

  let setup: [number[], BillMatcher];
  try {
    setup = await Promise.all([listLordsDivisionIds(startDate, DELAY_MS), loadBillMatcher(supabase)]);
  } catch (e) {
    return NextResponse.json({ error: 'setup_failed', message: (e as Error).message }, { status: 502 });
  }
  const [ids, matcher] = setup;

  const queue = [...ids];
  const total = queue.length;
  let processed = 0;
  let voteRows = 0;
  let skippedForTime = 0;
  const failures: { id: number; error: string }[] = [];

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        skippedForTime += queue.length;
        queue.length = 0;
        return;
      }
      const id = queue.shift() as number;
      try {
        const json = await fetchLordsJson(`${LORDS_VOTES_API}/${id}`);
        const built = await buildLordsDivisionRows(json, matcher);
        await writeLordsDivision(supabase, built);
        voteRows += built.votes.length;
        processed++;
      } catch (e) {
        failures.push({ id, error: (e as Error).message });
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const body = {
    ok: failures.length === 0,
    start_date: startDate,
    total_queued: total,
    rows_written: processed,
    vote_rows: voteRows,
    skipped_for_time: skippedForTime,
    failures: failures.slice(0, 20),
    failure_count: failures.length,
    duration_ms: Date.now() - started,
  };
  const status = total > 0 && processed === 0 ? 502 : 200;
  return NextResponse.json(body, { status });
}

export const GET = withHeartbeat('/api/sync-lords-votes', GET_impl);
