import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { refreshStore } from '@/lib/refresh-stores';
import { tableFingerprint } from '@/lib/table-fingerprint';
import { refreshTables } from '@/lib/source-tags';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

// Daily at 04:45 UTC, after the donations (01:13) and contracts (01:53) syncs and the contractor refresh (03:27):
// rebuilds the organisation summary behind /organisations (contract_awards, organisation_contracts and
// organisation_index, migrations 2026-10-27c and 2026-11-03h; report 71). refresh_organisation_index() refreshes all
// three CONCURRENTLY (each has a unique index), so pages keep reading the old rows while it runs (checked 3 Nov 2026:
// 25 s, page reads unaffected), and has its own 240 s limit. A failure returns 500, so the
// heartbeat and the freshness monitor show it.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // A16 (owner rule 15 Nov 2026, ENTRY 129): the rebuild replaces every row daily; the pages that read these views are
  // refreshed only if the rebuilt rows differ from before (a fingerprint of each view, refresh times left out).
  const fp = async () => Promise.all([
    tableFingerprint(supabaseAdmin, 'organisation_index', 'slug', ['refreshed_at']),
    tableFingerprint(supabaseAdmin, 'organisation_contracts', 'id'),
  ]).then((x) => x.join('|')).catch(() => null);
  const before = await fp();
  const r = await refreshStore(supabaseAdmin, 'refresh_organisation_index');
  const after = r.ok ? await fp() : null;
  const changed = r.ok && (before === null || after === null || before !== after);
  if (changed) refreshTables('organisation_index', 'organisation_contracts', 'contract_awards', 'organisation_slugs');
  if (r.ok && !(typeof r.result === 'number' && r.result > 0)) {
    return NextResponse.json({ ok: false, error: `refresh returned ${String(r.result)} rows`, ms: r.ms }, { status: 500 });
  }
  return NextResponse.json({ ok: r.ok, rows: typeof r.result === 'number' ? r.result : null, ms: r.ms, changed, ...(r.error ? { error: r.error } : {}) },
    { status: r.ok ? 200 : 500 });
}

export const GET = withHeartbeat('/api/refresh-organisation-index', GET_impl);
