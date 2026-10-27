import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { findLatestRelease, downloadXlsx, parseRelease, writeRelease, storedDataYear, loadCouncilCodes } from '@/lib/fuel-poverty';
import { isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly: DESNZ publishes sub-regional fuel poverty data once a year (May).
// If GOV.UK has a newer data year than the one stored, load it (council and
// neighbourhood tables). Nothing is written if a code doesn't match the
// councils table or the totals don't add up.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const [rel, stored] = await Promise.all([findLatestRelease(), storedDataYear(supabase)]);
    if (!rel) return NextResponse.json({ error: 'no_release_found' }, { status: 502 });
    if (stored && rel.dataYear <= stored) return NextResponse.json({ status: 'up_to_date', data_year: stored, rows_written: 0 });
    const { codes } = await loadCouncilCodes(supabase);
    const r = parseRelease(await downloadXlsx(rel.xlsxUrl), rel, codes);
    if (r.unmatchedCouncilCodes.length || r.unmatchedLsoaCouncilCodes.length) {
      return NextResponse.json({ error: 'unmatched_codes', councils: r.unmatchedCouncilCodes, neighbourhoods: r.unmatchedLsoaCouncilCodes, data_year: rel.dataYear }, { status: 500 });
    }
    const written = await writeRelease(supabase, r);
    return NextResponse.json({ status: 'updated', data_year: rel.dataYear, previous_data_year: stored, rows_written: written });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-fuel-poverty', GET_impl);
