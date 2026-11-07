import { NextResponse } from 'next/server';
import { freshnessChanged } from '@/lib/data-freshness';
import { indexNowAfter } from '@/lib/indexnow';
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
import { revalidatePath, revalidateTag } from '@/lib/refresh-count';
import { isDryRun } from '@/lib/mp-refresh';
import { MP_PETITIONS_TAG } from '@/lib/mp-petitions';
import { PETITIONS_TAG } from '@/lib/petition-tags';
import { noteChanged } from '@/lib/refresh-count';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: keep the petitions tables current, one request a second (owner, 6 Nov 2026). The source's two lists are read from
// the most signed down to the 10,000 threshold, then each petition's own JSON:
//   1. every open petition, and any listed that we do not hold, so a petition crossing 10,000 gets a row, and so a page;
//   2. any stored as open that has left the open list, for its final figures;
//   3. then closed petitions, oldest checked first, while time is left (about 110 a day, each about every 3 days). Closed
//      petitions still change: on 6 Nov 2026 seven responses, four debates and five debate dates had been missed by a sync
//      that stopped reading a petition once it closed.
// checked_at records every read, so it dates the count on the page and picks the next closed petitions. Other columns are
// written only when they change. Time-budgeted: stops starting new fetches after TIME_BUDGET_MS so the route always returns
// cleanly (and records its heartbeat) inside maxDuration. ?all=1 (local tests and backfills only) reads all of them.

const GAP_MS = 1000;
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

  const readAll = process.env.VERCEL_ENV !== 'production' && new URL(req.url).searchParams.get('all') === '1';
  const budgetMs = readAll ? 3_600_000 : TIME_BUDGET_MS;

  let openIds: number[];
  let closedIds: number[];
  try {
    openIds = await collectPetitionIdsAtThreshold('open', GAP_MS);
    await new Promise((r) => setTimeout(r, GAP_MS));
    closedIds = await collectPetitionIdsAtThreshold('closed', GAP_MS);
    await new Promise((r) => setTimeout(r, GAP_MS));
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'list_fetch_failed', message: (e as Error).message }, { status: 502 });
  }

  const { data: storedRows, error: storedErr } = await supabase
    .from('petitions')
    .select('id, state, checked_at')
    .order('checked_at', { ascending: true, nullsFirst: true })
    .order('id', { ascending: true })
    .limit(5000);
  if (storedErr) {
    return NextResponse.json({ error: 'db', message: storedErr.message }, { status: 500 });
  }
  const stored = (storedRows ?? []) as { id: number; state: string; checked_at: string | null }[];
  const held = new Set(stored.map((r) => Number(r.id)));
  const openSet = new Set(openIds);
  const closedSinceLastRun = stored.filter((r) => r.state === 'open' && !openSet.has(Number(r.id))).map((r) => Number(r.id));
  const newlyClosed = closedIds.filter((id) => !held.has(id));
  // These must be read this run; the closed rotation below takes whatever time is left.
  const must = [...new Set([...closedSinceLastRun, ...newlyClosed, ...openIds])];
  const mustSet = new Set(must);
  const rotation = stored.filter((r) => !mustSet.has(Number(r.id))).map((r) => Number(r.id));
  const queue = [...must, ...rotation];
  const total = queue.length;
  let processed = 0;
  let constituencyRows = 0;
  let skippedForTime = 0;
  const failures: { id: number; error: string }[] = [];
  const checked: number[] = [];
  const changedIds: number[] = [];

  // Saved even if a 429 stops the run, so those read are not read again first next time.
  const saveChecked = async () => {
    if (dry || !checked.length) return;
    const ids = checked.splice(0);
    const at = new Date().toISOString();
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from('petitions').update({ checked_at: at }).in('id', ids.slice(i, i + 200));
      if (error) throw new Error(`checked_at: ${error.message}`);
    }
  };

  try {
    for (const id of queue) {
      if (Date.now() - started > budgetMs) {
        skippedForTime = Math.max(0, must.length - queue.indexOf(id));
        break;
      }
      try {
        const json = await fetchPetitionJson(`${PETITIONS_BASE}/petitions/${id}.json`);
        const built = buildPetitionRows(json);
        const res = await writePetitionChanges(supabase, built, dry);
        for (const g of res.changedGss) changedGss.add(g);
        rowsChanged += res.written;
        if (res.written > 0) changedIds.push(id);
        constituencyRows += built.constRows.length;
        checked.push(id);
        processed++;
      } catch (e) {
        if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
        failures.push({ id, error: (e as Error).message });
      }
      await new Promise((r) => setTimeout(r, GAP_MS));
    }
  } finally {
    await saveChecked();
  }

  noteChanged(dry ? 0 : rowsChanged);
  // After every run that checked petitions, not only when a count changed: the tab shows the date of the last check.
  const refreshed = !dry && processed > 0;
  if (refreshed) revalidateTag(MP_PETITIONS_TAG, 'max');
  // The list after any change; only the pages of petitions that changed. MP pages keep their dated top 5 (lib/petition-pages.ts).
  if (!dry && changedIds.length) {
    revalidateTag(PETITIONS_TAG, 'max');
    for (const id of changedIds) revalidatePath(`/petitions/${id}`);
    if (changedIds.length) freshnessChanged();
    indexNowAfter([...changedIds].map((id) => `/petitions/${id}`), 'sync-petitions');
  }
  const body = {
    ok: failures.length === 0,
    rows_changed: rowsChanged,
    constituencies_changed: changedGss.size,
    tab_refreshed: refreshed,
    ...(dry ? { dry_run: true } : {}),
    open_at_threshold: openIds.length,
    closed_at_threshold: closedIds.length,
    closed_since_last_run: closedSinceLastRun.length,
    new_closed: newlyClosed.length,
    pages_refreshed: dry ? 0 : changedIds.length,
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
