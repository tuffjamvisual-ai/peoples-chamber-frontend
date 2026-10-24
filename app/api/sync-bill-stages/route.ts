import { NextResponse } from 'next/server';
import { revalidateBillPages } from '@/lib/revalidate-bills';
import { createClient } from '@supabase/supabase-js';
import { refreshStore } from '@/lib/refresh-stores';
import { fetchAllBillStages, deriveCurrentStage } from '@/lib/bill-stages';
import { withHeartbeat } from '@/lib/sync-heartbeat';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Refreshes bill.stages from Parliament's Bills API, to keep the /bills/[id]
// render path purely Supabase-backed. Each run takes, in this order, the bills
// the nightly bill sync marked as changed (stages_synced_at null), then those
// not refreshed for STALE_DAYS, three at a time, and stops starting new ones
// after TIME_BUDGET_MS so it always returns (and records its heartbeat) inside
// maxDuration. Every bill is saved as soon as it is read, so the next run
// carries on where this one stopped. Runs four times a day (vercel.json).
//
// Until 21 Oct 2026 it took 600 bills one at a time (0.5 to 3 s each) with no
// time limit, so every run hit the 300 s limit, and the old nightly bill sync
// cleared stages_synced_at on all 4,060 bills each night: stages were almost
// never saved.
//
// Stages are fetched in full via lib/bill-stages.ts. The Bills API pages
// at 20 stages by default, and this route previously stored only that
// first page, truncating long bills (missing later stages and Royal Assent,
// and deriving the wrong current_stage).

const RUN_CAP = 900; // bills read from the queue per run; the time budget usually stops it first
const CONCURRENCY = 3;
const DELAY_MS = 150;
const STALE_DAYS = 7;
const TIME_BUDGET_MS = 240_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function GET_impl(req: Request) {
  const started = Date.now();
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key);

  // Changed bills (NULL stages_synced_at) first, then the oldest sync.
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: selErr } = await supabase
    .from('bill')
    .select('id, parliament_id, stages_synced_at')
    .not('parliament_id', 'is', null)
    .or(`stages_synced_at.is.null,stages_synced_at.lt.${cutoff}`)
    .order('stages_synced_at', { ascending: true, nullsFirst: true })
    .limit(RUN_CAP);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const targets = rows || [];
  const queue = [...targets];
  let ok = 0, fail = 0, skippedForTime = 0;
  const failures: Array<{ id: number; detail: string }> = [];

  async function worker() {
    while (queue.length > 0) {
      if (Date.now() - started > TIME_BUDGET_MS) { skippedForTime += queue.length; queue.length = 0; return; }
      const row = queue.shift()!;
      try {
        const stages = await fetchAllBillStages(row.parliament_id);

        // Headline current_stage + stage_date from the freshest dated stage
        // (future/scheduled sittings ignored), now from the COMPLETE list.
        const { current_stage, stage_date } = deriveCurrentStage(stages.items);

        const { error } = await supabase
          .from('bill')
          .update({
            stages,
            stages_synced_at: new Date().toISOString(),
            current_stage,
            stage_date,
          })
          .eq('id', row.id);
        if (error) throw error;
        ok++;
      } catch (err) {
        fail++;
        if (failures.length < 20) failures.push({ id: row.id, detail: (err as Error).message });
      }
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Show the new stages on /bills and the session archive straight away (lib/revalidate-bills.ts).
  if (ok > 0) revalidateBillPages();
  // The session pages and topic bill lists read stored copies of the bills (lib/refresh-stores.ts).
  const storesRefresh = ok > 0 ? await refreshStore(supabase, 'refresh_bill_stores') : null;

  const { count: remaining } = await supabase.from('bill').select('id', { count: 'exact', head: true })
    .not('parliament_id', 'is', null).or(`stages_synced_at.is.null,stages_synced_at.lt.${cutoff}`);
  if (fail > 0) console.error(JSON.stringify({ route: '/api/sync-bill-stages', targeted: targets.length, ok, fail, skipped_for_time: skippedForTime, first_failures: failures.slice(0, 5) }));
  return NextResponse.json({
    targeted: targets.length,
    rows_written: ok,
    fail,
    failures,
    skipped_for_time: skippedForTime,
    still_due: remaining ?? null,
    stores_refresh: storesRefresh,
    duration_ms: Date.now() - started,
    syncedAt: new Date().toISOString(),
  }, { status: targets.length > 0 && ok === 0 ? 502 : 200 });
}

export const GET = withHeartbeat('/api/sync-bill-stages', GET_impl);
