// Daily refresh of the State of the nation figures (T1-SOTN, COWORK-TO-T1 ENTRY 105): at 07:35 UTC, after the ONS's
// 07:00 releases, the ONS figures are read again and the cached copy replaced only if they changed (lib/state-of-the-nation.ts; one request a
// second with the identifying User-Agent). A read that fails keeps the last good figures. The page and the homepage
// band are then refreshed.
import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { revalidateTag } from '@/lib/refresh-count';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SOTN_TAG, onsData, readOns } from '@/lib/state-of-the-nation';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    // A16 (ENTRY 129, 140): read the ONS now and compare with the cached copy; the pages are refreshed only when a
    // figure, its period or its release date changed. A read that fails keeps the last good figures.
    const fresh = await readOns();
    const cached = await onsData().catch(() => null);
    const changed = JSON.stringify(cached) !== JSON.stringify(fresh);
    if (changed) revalidateTag(SOTN_TAG, 'max');
    return NextResponse.json({ ok: true, series: Object.keys(fresh).length, changed, at: new Date().toISOString() });
  } catch (e) {
    // The last good figures stay up; the heartbeat records the failure.
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

export const GET = withHeartbeat('/api/refresh-state-of-the-nation', GET_impl);
