import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { refreshStore } from '@/lib/refresh-stores';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

// Daily at 04:45 UTC, after the donations (01:13) and contracts (01:53) syncs and the contractor refresh (03:27):
// rebuilds the organisation summary behind /organisations (organisation_index and organisation_contracts, migration
// 2026-10-27c; report 71). refresh_organisation_index() has its own 120 s limit. A failure returns 500, so the
// heartbeat and the freshness monitor show it.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const r = await refreshStore(supabaseAdmin, 'refresh_organisation_index');
  if (r.ok && !(typeof r.result === 'number' && r.result > 0)) {
    return NextResponse.json({ ok: false, error: `refresh returned ${String(r.result)} rows`, ms: r.ms }, { status: 500 });
  }
  return NextResponse.json({ ok: r.ok, rows: typeof r.result === 'number' ? r.result : null, ms: r.ms, ...(r.error ? { error: r.error } : {}) },
    { status: r.ok ? 200 : 500 });
}

export const GET = withHeartbeat('/api/refresh-organisation-index', GET_impl);
