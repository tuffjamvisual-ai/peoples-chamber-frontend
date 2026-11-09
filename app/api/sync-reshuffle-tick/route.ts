import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { rowCount, withHeartbeat } from '@/lib/sync-heartbeat';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Runs every 2 hours at :09 in even hours (cron; JF2b, 9 Nov 2026: moved from :05, further from its targets' own minutes;
// they run at :03 and :23 in odd hours, so they never start in the same hour; :03 to :09 are the only minutes
// cron-schedule-check leaves free for a heavy two hourly job). Cheap no-op unless "reshuffle mode" is active
// (see /api/reshuffle-mode). When active and inside its window, it fans out to
// the three minister syncs in parallel so the site reconciles ~every 2 hours
// during a reshuffle. When the window has expired it flips the flag off and
// no-ops. Off ordinary days this is 12 tiny DB reads/day and nothing else.
// `count` (the heartbeat's row count) is the changes found: the rows the three
// syncs report writing, 1 when the flag is switched off, and 0 when reshuffle
// mode is off, which is most runs.

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.opengovt.uk';
const TARGETS = ['/api/sync-member-biography', '/api/sync-govuk-data', '/api/sync-person-cache'];
// Each fan-out call is cut off by this point in the run (maxDuration 300 s less 30 s for the heartbeat and the reply),
// so a slow target is recorded as an error instead of the tick hitting its own limit and losing its heartbeat.
const FAN_OUT_DEADLINE_MS = 270_000;

async function GET_impl(req: Request) {
  const deadline = Date.now() + FAN_OUT_DEADLINE_MS;
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  const supabase = createClient(url, key);

  const { data } = await supabase.from('sync_flags').select('active, expires_at').eq('key', 'reshuffle_mode').maybeSingle();
  if (!data?.active) return NextResponse.json({ ok: true, reshuffle_mode: false, action: 'skipped', count: 0 });

  // Auto-revert once the window closes.
  if (data.expires_at && Date.now() >= new Date(data.expires_at).getTime()) {
    await supabase.from('sync_flags').update({ active: false, expires_at: null, updated_at: new Date().toISOString() }).eq('key', 'reshuffle_mode');
    return NextResponse.json({ ok: true, reshuffle_mode: true, action: 'auto-reverted', count: 1 });
  }

  // Active window: fan out to the three syncs in parallel (each is its own
  // function execution with its own budget; parallel keeps wall-time ~= slowest).
  const results = await Promise.allSettled(
    TARGETS.map((path) =>
      fetch(`${BASE}${path}`, {
        headers: { authorization: `Bearer ${expected}` },
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
      }).then(async (r) => ({
        path,
        status: r.status,
        rows: rowCount(await r.json().catch(() => null)),
      })),
    ),
  );
  const ran = results.map((r, i) => (r.status === 'fulfilled' ? r.value : { path: TARGETS[i], status: 'error', rows: null }));
  const count = ran.reduce((n, r) => n + (r.rows ?? 0), 0);
  return NextResponse.json({ ok: true, reshuffle_mode: true, action: 'ran', count, ran });
}

export const GET = withHeartbeat('/api/sync-reshuffle-tick', GET_impl);
