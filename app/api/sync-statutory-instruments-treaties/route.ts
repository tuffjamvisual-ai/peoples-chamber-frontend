import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { runSiTreatiesSync } from '@/lib/si-treaties-sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Statutory instruments and treaties from UK Parliament's free APIs (report 81), once a day. The work is in
// lib/si-treaties-sync.ts: only what can have changed since the last run, 20 s per request, at least 1 s between
// requests, a 240 s budget with a saved position the next run carries on from. The first full load is the one off
// local script scripts/load-statutory-instruments-treaties.ts, not this route.

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 });
  }

  try {
    const { status, body } = await runSiTreatiesSync({ supabase: createClient(url, key) });
    return NextResponse.json(body, { status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-statutory-instruments-treaties', GET_impl);
