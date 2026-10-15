// Weekly cron — recomputes mp_activity_metrics (divisions voted in, attendance and votes
// against the party, this Parliament) for every current MP.
//
// The work is done in the database by recompute_mp_activity_metrics() (see the 2026-10-15c
// migration): it counts every vote row, where reading them through the API was capped at
// 1,000 rows and recorded 2 divisions for the whole Parliament. speeches_year and
// questions_year are filled by sync-members-contributions and are not touched here.
//
// Schedule: vercel.json '0 12 * * 1' (Monday 12:00 UTC).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: Request) {
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
  const { data, error } = await supabase.rpc('recompute_mp_activity_metrics');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    ...(data as Record<string, unknown>),
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
