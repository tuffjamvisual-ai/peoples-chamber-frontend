import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { findLatestEdition, parseEdition, writeEdition, storedReleaseLabel, loadCouncilCodes } from '@/lib/road-casualties';
import { isPoliteStop } from '@/lib/sync-budget';
import { refreshCouncilRoutes } from '@/lib/council-refresh';
import { isDryRun } from '@/lib/mp-refresh';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly: DfT publishes a new RAS0403 edition once a year (usually July).
// If the newest edition on GOV.UK differs from the one stored, load it.
// Nothing is written if a council code doesn't match the councils table or
// the checks in lib/road-casualties.ts fail.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const [ed, stored] = await Promise.all([findLatestEdition(), storedReleaseLabel(supabase)]);
    if (stored === ed.label) return NextResponse.json({ status: 'up_to_date', edition: stored, rows_written: 0 });
    // A local dry run (?dry=1, never on production) stops here: a newer release was found, so the council pages would be refreshed.
    if (isDryRun(req)) return NextResponse.json({ dry_run: true, status: 'would_update', would_refresh: ['/councils/[slug]'] });
    const { codes } = await loadCouncilCodes(supabase);
    const r = parseEdition(ed, codes);
    if (r.unmatched.length) return NextResponse.json({ error: 'unmatched_codes', codes: r.unmatched, edition: ed.label }, { status: 500 });
    const written = await writeEdition(supabase, r);
    const refreshed = refreshCouncilRoutes(written);
    return NextResponse.json({ status: 'updated', edition: ed.label, previous_edition: stored, years: r.years, rows_written: written, refreshed });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-road-casualties', GET_impl);
