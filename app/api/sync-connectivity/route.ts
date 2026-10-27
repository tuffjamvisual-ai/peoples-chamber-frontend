import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { findLatestRelease, download, parseRelease, writeRelease, storedMonth, loadCouncilCodes } from '@/lib/connectivity';
import { isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly: Ofcom publishes Connected Nations data several times a year. If
// Ofcom's pages link to a newer data month than the one stored, load it
// (fixed broadband, full-fibre take-up, mobile coverage). If no download
// links can be found at all, the run fails so the freshness monitor flags
// it rather than silently doing nothing.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const [rel, stored] = await Promise.all([findLatestRelease(), storedMonth(supabase)]);
    if (stored && rel.month <= stored) return NextResponse.json({ status: 'up_to_date', data_month: stored, rows_written: 0 });
    const { codes } = await loadCouncilCodes(supabase);
    const fixedZip = await download(rel.fixedUrl);
    const mobileZip = rel.mobileUrl ? await download(rel.mobileUrl) : null;
    const r = parseRelease(rel, fixedZip, mobileZip, codes);
    if (r.unmatched.length) return NextResponse.json({ error: 'unmatched_codes', codes: r.unmatched, data_month: rel.month }, { status: 500 });
    const written = await writeRelease(supabase, r);
    return NextResponse.json({ status: 'updated', data_month: rel.month, previous_month: stored, rows_written: written });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-connectivity', GET_impl);
