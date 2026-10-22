import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { refreshStore } from '@/lib/refresh-stores';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

// Daily, 30 minutes after the contracts sync (owner's approval, 22 Oct 2026): brings the stored contractor totals
// (contractor_donor_matches_stored, migration 2026-10-21l) up to date with the contracts it wrote. This used to run
// inside the sync, where it hit the API's 8 s limit (22 Oct 03:00) and made a run that had saved its contracts
// report as failed. refresh_contractor_donor_matches() now has its own 120 s limit (migration 2026-10-22h), and this
// step has its own heartbeat.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const r = await refreshStore(supabaseAdmin, 'refresh_contractor_donor_matches');
  return NextResponse.json({ ok: r.ok, rows: typeof r.result === 'number' ? r.result : null, ms: r.ms, ...(r.error ? { error: r.error } : {}) },
    { status: r.ok ? 200 : 500 });
}

export const GET = withHeartbeat('/api/refresh-contractor-matches', GET_impl);
