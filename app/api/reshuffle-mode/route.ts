import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Manual "reshuffle mode" toggle. When active, sync-reshuffle-tick (a 2-hourly
// cron) fans out to the three minister syncs so the site reconciles roughly
// every 2 hours during a known reshuffle, then auto-reverts when the window
// expires. Outside the window everything stays on the daily / twice-daily
// baseline. This is deliberate: the government sources lag the news, so hourly
// polling buys nothing on ordinary days — this only spends the extra calls in
// the one window where they help.
//
//   GET /api/reshuffle-mode                -> current state
//   GET /api/reshuffle-mode?on=1&hours=48  -> activate for N hours (1..72, default 48)
//   GET /api/reshuffle-mode?on=0           -> deactivate now

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const on = searchParams.get('on');

  if (on === '1') {
    const hours = Math.min(72, Math.max(1, Number(searchParams.get('hours')) || 48));
    const expires = new Date(Date.now() + hours * 3600_000).toISOString();
    await supabase.from('sync_flags').update({ active: true, expires_at: expires, updated_at: new Date().toISOString() }).eq('key', 'reshuffle_mode');
  } else if (on === '0') {
    await supabase.from('sync_flags').update({ active: false, expires_at: null, updated_at: new Date().toISOString() }).eq('key', 'reshuffle_mode');
  }

  const { data } = await supabase.from('sync_flags').select('active, expires_at, updated_at').eq('key', 'reshuffle_mode').maybeSingle();
  const active = !!data?.active;
  const expired = active && data?.expires_at ? Date.now() >= new Date(data.expires_at).getTime() : false;
  const hoursRemaining = active && data?.expires_at && !expired
    ? Math.max(0, Math.round((new Date(data.expires_at).getTime() - Date.now()) / 3600_000))
    : 0;
  return NextResponse.json({
    reshuffle_mode: { active: active && !expired, expires_at: data?.expires_at ?? null, hours_remaining: hoursRemaining },
  });
}
