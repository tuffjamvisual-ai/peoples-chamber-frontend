import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { findLatestSnapshot, downloadCsvText, parseSnapshot, writeSnapshot, storedSnapshotDate, loadCouncils } from '@/lib/school-inspections';
import { isPoliteStop } from '@/lib/sync-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Weekly: Ofsted publishes a new "State-funded schools inspections and
// outcomes as at <date>" snapshot twice a year (as at 31 March, released
// June; as at 31 August, released November). If GOV.UK has a newer snapshot
// than the one stored, load it and remove schools that have since closed.
// Nothing is written if the headings changed or a local authority name
// doesn't match the councils table.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const [snap, stored] = await Promise.all([findLatestSnapshot(), storedSnapshotDate(supabase)]);
    if (!snap) return NextResponse.json({ error: 'no_snapshot_found' }, { status: 502 });
    if (stored && snap.date <= stored) return NextResponse.json({ status: 'up_to_date', snapshot: stored, rows_written: 0 });

    const councils = await loadCouncils(supabase);
    const r = parseSnapshot(await downloadCsvText(snap.csvUrl), snap, councils);
    if (r.unmatchedLAs.length || r.ambiguousLAs.length) {
      return NextResponse.json({ error: 'unmatched_local_authorities', unmatched: r.unmatchedLAs, ambiguous: r.ambiguousLAs, snapshot: snap.date }, { status: 500 });
    }
    if (r.rows.length < 15000) return NextResponse.json({ error: 'too_few_schools', schools: r.rows.length, snapshot: snap.date }, { status: 502 });
    const w = await writeSnapshot(supabase, r.rows, snap.date);
    return NextResponse.json({ status: 'updated', snapshot: snap.date, previous_snapshot: stored, removed: w.removed, rows_written: w.written });
  } catch (e) {
    if (isPoliteStop(e)) throw e; // a 429: stop cleanly (lib/sync-budget.ts)
    return NextResponse.json({ error: 'sync_failed', message: (e as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-school-inspections', GET_impl);
