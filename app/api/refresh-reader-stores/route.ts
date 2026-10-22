import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { refreshStore, type StoreRefresh } from '@/lib/refresh-stores';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily backstop for the stored copies reader pages read (lib/refresh-stores.ts; owner's approval, 22 Oct 2026). Each
// sync refreshes what it wrote straight away; this catches anything written another way (a script, a manual fix,
// a sync whose refresh failed). One at a time, so the database is not asked for all of them at once.

const STORES: StoreRefresh[] = ['refresh_bill_stores', 'refresh_vote_counts', 'refresh_press_release_stats'];

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const results = [];
  for (const fn of STORES) results.push(await refreshStore(supabaseAdmin, fn));
  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ ok: failed === 0, rows_written: results.length - failed, failed, results }, { status: failed ? 500 : 200 });
}

export const GET = withHeartbeat('/api/refresh-reader-stores', GET_impl);
