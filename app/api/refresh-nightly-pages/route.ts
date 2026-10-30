import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import NIGHTLY from '@/lib/nightly-refresh-pages.json';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { refreshBills, REFRESH_BATCH } from '@/lib/bill-refresh';
import { revalidateBillPages } from '@/lib/revalidate-bills';

export const dynamic = 'force-dynamic';

// Nightly page refresh (owner's approval, 30 Oct 2026, cache Stage 2b), in place of the redeploy the nightly workflow
// (.github/workflows/daily-context-update.yml) used to make. That workflow asks /api/revalidate for the same pages when
// it ends, but a request from GitHub can be refused by Vercel's bot protection, and GitHub starts scheduled runs late
// (up to about 3 hours). This cron runs at 05:15 UTC, after the workflow and the 04:45 organisation index, and refreshes
// the pages inside the site. The list is lib/nightly-refresh-pages.json; a path with [brackets] is a route pattern
// (every page of that route). Pages are rebuilt on their next visit.
// It also empties bill_refresh_queue (owner, 30 Oct 2026, cache Stage 2a part 2, migration 2026-10-30h): bills the
// nightly GitHub scripts changed but could not get the site to refresh. Each is refreshed (lib/bill-refresh.ts), then
// its row is deleted, REFRESH_BATCH at a time. A queue that cannot be read is reported, not fatal.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured; nothing refreshed' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  for (const p of NIGHTLY.paths) {
    if (p.includes('[')) revalidatePath(p, 'page');
    else revalidatePath(p);
  }
  const queue = await emptyBillQueue();
  return NextResponse.json({ ok: true, rows_written: NIGHTLY.paths.length, paths: NIGHTLY.paths, bill_queue: queue, at: new Date().toISOString() });
}

async function emptyBillQueue(): Promise<{ refreshed: number; error?: string }> {
  let refreshed = 0;
  try {
    for (let round = 0; round < 20; round++) {
      const { data, error } = await supabaseAdmin.from('bill_refresh_queue').select('bill_id').order('queued_at').limit(REFRESH_BATCH);
      if (error) throw new Error(error.message);
      const ids = ((data ?? []) as { bill_id: number }[]).map((r) => r.bill_id);
      if (!ids.length) break;
      refreshBills(ids);
      const { error: delErr } = await supabaseAdmin.from('bill_refresh_queue').delete().in('bill_id', ids);
      if (delErr) throw new Error(delErr.message);
      refreshed += ids.length;
    }
    if (refreshed) revalidateBillPages();
    return { refreshed };
  } catch (e) {
    return { refreshed, error: (e as Error).message };
  }
}

export const GET = withHeartbeat('/api/refresh-nightly-pages', GET_impl);
