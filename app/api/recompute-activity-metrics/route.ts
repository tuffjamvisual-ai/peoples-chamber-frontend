// Weekly cron — recomputes mp_activity_metrics (divisions voted in, attendance and votes
// against the party, this Parliament) for every current MP.
//
// The work is done in the database by recompute_mp_activity_metrics() (see the 2026-10-15c
// migration): it counts every vote row, where reading them through the API was capped at
// 1,000 rows and recorded 2 divisions for the whole Parliament. speeches_year and
// questions_year are filled by sync-members-contributions and are not touched here.
//
// Schedule: vercel.json '35 12 * * 1' (Monday 12:35 UTC, when no other job runs; owner's approval, 21 Oct 2026).
// The function takes about 0.5 s on a quiet database but 11 s while other jobs were writing, over the 8 s limit on
// API calls, so the 19 Oct run failed with HTTP 500 at 12:00, when sync-committee-memberships also starts. A call
// cancelled by a timeout or lock wait is tried once more after 20 s.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const startedAt = Date.now();
  let { data, error } = await supabase.rpc('recompute_mp_activity_metrics');
  let retried = false;
  if (error && /statement timeout|lock timeout|canceling statement/i.test(error.message)) {
    retried = true;
    await new Promise((r) => setTimeout(r, 20_000));
    ({ data, error } = await supabase.rpc('recompute_mp_activity_metrics'));
  }
  if (error) return NextResponse.json({ ok: false, error: error.message, retried }, { status: 500 });

  return NextResponse.json({
    ok: true,
    ...(data as Record<string, unknown>),
    rows_written: (data as { members_written?: number } | null)?.members_written ?? null,
    retried,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}

export const GET = withHeartbeat('/api/recompute-activity-metrics', GET_impl);
