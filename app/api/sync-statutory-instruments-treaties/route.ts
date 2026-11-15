import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { runSiTreatiesSync } from '@/lib/si-treaties-sync';
import { refreshTables, DIVISION_TABLES, SI_TABLES } from '@/lib/source-tags';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Statutory instruments and treaties from UK Parliament's free APIs (report 81), once a day. The work is in
// lib/si-treaties-sync.ts: only what can have changed since the last run, 20 s per request, at least 1 s between
// requests, a 240 s budget with a saved position the next run carries on from. The first full load is the one off
// local script scripts/load-statutory-instruments-treaties.ts, not this route.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing' }, { status: 500 });
  }

  try {
    const { status, body } = await runSiTreatiesSync({ supabase: createClient(url, key) });
    // A16 (owner rule 15 Nov 2026, ENTRY 129): pages that read these tables are rebuilt only now, after a real change.
    const b = body as { siWritten?: number; flagsWritten?: number; treatiesWritten?: number; siTimelines?: number; treatyTimelines?: number };
    if ((b.siWritten ?? 0) + (b.flagsWritten ?? 0) + (b.treatiesWritten ?? 0) + (b.siTimelines ?? 0) + (b.treatyTimelines ?? 0) > 0) refreshTables(...SI_TABLES);
    return NextResponse.json(body, { status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-statutory-instruments-treaties', GET_impl);
