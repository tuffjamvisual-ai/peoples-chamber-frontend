import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { runSpadRosterSync } from '@/lib/spad-roster-sync';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The Cabinet Office's named list of special advisers and their cost totals, once a week (owner, 28 Oct 2026). The
// work is in lib/spad-roster-sync.ts; ?force=1 rewrites the release even when it has not changed.

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
    const force = new URL(req.url).searchParams.get('force') === '1';
    const { status, body } = await runSpadRosterSync({ supabase: createClient(url, key), maxDurationS: maxDuration, force });
    return NextResponse.json(body, { status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export const GET = withHeartbeat('/api/sync-spad-roster', GET_impl);
