import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { EDM_API, EDM_PARLIAMENT_START, fetchEdmJson, listEdms, buildEdmRows, writeEdm, type EdmListEntry } from '@/lib/edms';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily: keep early_day_motions / early_day_motion_signatures current
// (initial load is done once by scripts/import-edms.ts). Motions keep
// gathering signatures for the whole session, so each run:
//   1. Reads the full motion list (cheap: ~41 requests at 100 per page),
//      including each motion's SponsorsCount.
//   2. Re-fetches motions that are new, or whose SponsorsCount differs
//      from the value stored at their last fetch.
//   3. Also re-fetches the ROLLING_REFRESH motions checked least recently,
//      so changes that don't alter the count (a withdrawn signature, a
//      motion withdrawn) are still picked up within about two weeks.
// Time-budgeted so the route always returns (and records its heartbeat)
// inside maxDuration; leftovers are picked up next run.
//
// The list is read LIST_CONCURRENCY pages at a time. Read one at a time it took
// 104 to 216 s of the 240 s budget (12 to 20 Oct 2026), and on 18 and 21 Oct
// over 240 s, so no motion was fetched and the run returned 502 with 0 rows.
//
// A second cron, 10 minutes later, calls this with ?retry=1: it runs again only
// if the last run, within the past hour, ended with a 5xx (Parliament's API
// failing, or nothing written); otherwise it returns without recording a run.

const CONCURRENCY = 3;
const LIST_CONCURRENCY = 3;
const DELAY_MS = 250;
const TIME_BUDGET_MS = 240_000;
const ROLLING_REFRESH = 300;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  let list: EdmListEntry[];
  try {
    list = await listEdms(EDM_PARLIAMENT_START, DELAY_MS, LIST_CONCURRENCY);
  } catch (e) {
    return NextResponse.json({ error: 'list_fetch_failed', message: (e as Error).message }, { status: 502 });
  }

  // Stored state (paged: PostgREST returns at most 1,000 rows per call).
  const stored = new Map<number, { count: number | null; syncedAt: string }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('early_day_motions')
      .select('id, source_sponsors_count, synced_at')
      .order('id')
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
    for (const r of data ?? []) stored.set(r.id as number, { count: r.source_sponsors_count as number | null, syncedAt: r.synced_at as string });
    if (!data || data.length < 1000) break;
  }

  const listCount = new Map(list.map((e) => [e.id, e.sponsorsCount]));
  const changed = list.filter((e) => {
    const s = stored.get(e.id);
    return !s || s.count !== e.sponsorsCount;
  });
  const changedIds = new Set(changed.map((e) => e.id));
  const rolling = [...stored.entries()]
    .filter(([id]) => listCount.has(id) && !changedIds.has(id))
    .sort((a, b) => a[1].syncedAt.localeCompare(b[1].syncedAt))
    .slice(0, ROLLING_REFRESH)
    .map(([id]) => ({ id, sponsorsCount: listCount.get(id) ?? null }));

  const queue = [...changed, ...rolling];
  const total = queue.length;
  let processed = 0;
  let signatureRows = 0;
  let skippedForTime = 0;
  const failures: { id: number; error: string }[] = [];

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        skippedForTime += queue.length;
        queue.length = 0;
        return;
      }
      const entry = queue.shift()!;
      try {
        const json = await fetchEdmJson(`${EDM_API}/EarlyDayMotion/${entry.id}`);
        const built = buildEdmRows(json, entry.sponsorsCount);
        await writeEdm(supabase, built);
        signatureRows += built.signatures.length;
        processed++;
      } catch (e) {
        failures.push({ id: entry.id, error: (e as Error).message });
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const body = {
    ok: failures.length === 0,
    motions_listed: list.length,
    new_or_changed: changed.length,
    rolling_refresh: rolling.length,
    total_queued: total,
    rows_written: processed,
    signature_rows: signatureRows,
    skipped_for_time: skippedForTime,
    failures: failures.slice(0, 20),
    failure_count: failures.length,
    duration_ms: Date.now() - started,
  };
  const status = total > 0 && processed === 0 ? 502 : 200;
  return NextResponse.json(body, { status });
}

const ROUTE = '/api/sync-edms';
const run = withHeartbeat(ROUTE, GET_impl);

export async function GET(req: Request): Promise<Response> {
  if (new URL(req.url).searchParams.get('retry') !== '1') return run(req);
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase.from('sync_heartbeat').select('last_ran_at, last_status').eq('route', ROUTE).maybeSingle();
  if (error) return NextResponse.json({ error: 'db', message: error.message }, { status: 500 });
  const recent = data && Date.now() - new Date(data.last_ran_at as string).getTime() < 60 * 60_000;
  if (!recent || (data.last_status as number) < 500) {
    return NextResponse.json({ retry: false, reason: 'last run did not fail with a 5xx in the past hour', last_status: data?.last_status ?? null });
  }
  return run(req);
}
