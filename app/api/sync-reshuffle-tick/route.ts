import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Runs every 2 hours (cron). Cheap no-op unless "reshuffle mode" is active
// (see /api/reshuffle-mode). When active and inside its window, it fans out to
// the three minister syncs in parallel so the site reconciles ~every 2 hours
// during a reshuffle. When the window has expired it flips the flag off and
// no-ops. Off ordinary days this is 12 tiny DB reads/day and nothing else.

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.opengovt.uk';
const TARGETS = ['/api/sync-member-biography', '/api/sync-govuk-data', '/api/sync-person-cache'];

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

  const { data } = await supabase.from('sync_flags').select('active, expires_at').eq('key', 'reshuffle_mode').maybeSingle();
  if (!data?.active) return NextResponse.json({ ok: true, reshuffle_mode: false, action: 'skipped' });

  // Auto-revert once the window closes.
  if (data.expires_at && Date.now() >= new Date(data.expires_at).getTime()) {
    await supabase.from('sync_flags').update({ active: false, expires_at: null, updated_at: new Date().toISOString() }).eq('key', 'reshuffle_mode');
    return NextResponse.json({ ok: true, reshuffle_mode: true, action: 'auto-reverted' });
  }

  // Active window: fan out to the three syncs in parallel (each is its own
  // function execution with its own budget; parallel keeps wall-time ~= slowest).
  const results = await Promise.allSettled(
    TARGETS.map((path) => fetch(`${BASE}${path}`, { headers: { authorization: `Bearer ${expected}` } }).then((r) => ({ path, status: r.status }))),
  );
  const ran = results.map((r, i) => (r.status === 'fulfilled' ? r.value : { path: TARGETS[i], status: 'error' }));
  return NextResponse.json({ ok: true, reshuffle_mode: true, action: 'ran', ran });
}
