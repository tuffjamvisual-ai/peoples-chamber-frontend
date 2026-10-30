import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import {
  collectPetitionIdsAtThreshold,
  fetchPetitionJson,
  buildPetitionRows,
  writePetitionChanges,
  PETITIONS_BASE,
} from '@/lib/petitions';
import { isPoliteStop } from '@/lib/sync-budget';
import { revalidateTag } from '@/lib/refresh-count';
import { isDryRun } from '@/lib/mp-refresh';
import { MP_PETITIONS_TAG } from '@/lib/mp-petitions';
import { noteChanged } from '@/lib/refresh-count';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: keep the petitions tables current (initial load is done once by
// scripts/import-petitions.js). Each run:
//   1. Reads the OPEN list from the most-signed down and refreshes every
//      open petition at/above the 10,000 threshold — this also picks up any
//      petition that newly crossed the threshold since the last run.
//   2. Refreshes, one final time, any petition stored as 'open' that is no
//      longer on the open list (it has closed since the last run), so its
//      final signature counts are captured. After that it is stored as
//      closed and never fetched again — closed petitions can't gain
//      signatures.
// Time-budgeted: stops starting new fetches after TIME_BUDGET_MS so the
// route always returns cleanly (and records its heartbeat) inside
// maxDuration; anything left over is picked up by the next run.

const CONCURRENCY = 3;
const DELAY_MS = 250;
const TIME_BUDGET_MS = 240_000;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  // Only changed rows are written (lib/petitions.ts writePetitionChanges; owner, 30 Oct 2026, cache Stage 2a part 3).
  // MP pages no longer show the counts (part 4): the Petitions tab reads them from /api/mps/[id]/petitions, whose tag
  // (MP_PETITIONS_TAG) is refreshed when anything changed. No MP page is refreshed. ?dry=1 (local tests only) compares
  // but writes nothing.
  const dry = isDryRun(req);
  const changedGss = new Set<string>();
  let rowsChanged = 0;

  let openIds: number[];
  try {
    openIds = await collectPetitionIdsAtThreshold('open', DELAY_MS);
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'list_fetch_failed', message: (e as Error).message }, { status: 502 });
  }

  const { data: storedOpen, error: storedErr } = await supabase
    .from('petitions')
    .select('id')
    .eq('state', 'open');
  if (storedErr) {
    return NextResponse.json({ error: 'db', message: storedErr.message }, { status: 500 });
  }
  const openSet = new Set(openIds);
  const closedSinceLastRun = (storedOpen ?? [])
    .map((r) => r.id as number)
    .filter((id) => !openSet.has(id));

  const queue = [...new Set([...closedSinceLastRun, ...openIds])];
  const total = queue.length;
  let processed = 0;
  let constituencyRows = 0;
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
        const json = await fetchPetitionJson(`${PETITIONS_BASE}/petitions/${id}.json`);
        const built = buildPetitionRows(json);
        const res = await writePetitionChanges(supabase, built, dry);
        for (const g of res.changedGss) changedGss.add(g);
        rowsChanged += res.written;
        constituencyRows += built.constRows.length;
        processed++;
      } catch (e) {
        if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
        failures.push({ id, error: (e as Error).message });
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  noteChanged(dry ? 0 : rowsChanged);
  const refreshed = !dry && rowsChanged > 0;
  if (refreshed) revalidateTag(MP_PETITIONS_TAG, 'max');
  const body = {
    ok: failures.length === 0,
    rows_changed: rowsChanged,
    constituencies_changed: changedGss.size,
    tab_refreshed: refreshed,
    ...(dry ? { dry_run: true } : {}),
    open_at_threshold: openIds.length,
    closed_since_last_run: closedSinceLastRun.length,
    total_queued: total,
    rows_written: processed,
    constituency_rows: constituencyRows,
    skipped_for_time: skippedForTime,
    failures: failures.slice(0, 20),
    failure_count: failures.length,
    duration_ms: Date.now() - started,
  };

  // Partial failures still return 200 (the data that did sync is good and
  // the failures are listed), but a run where EVERYTHING failed returns 502
  // so the freshness monitor flags it as failing.
  const status = total > 0 && processed === 0 ? 502 : 200;
  return NextResponse.json(body, { status });
}

export const GET = withHeartbeat('/api/sync-petitions', GET_impl);
