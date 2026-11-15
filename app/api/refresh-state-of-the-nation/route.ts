// Daily refresh of the State of the nation figures (T1-SOTN, COWORK-TO-T1 ENTRY 105): at 07:35 UTC, after the ONS's
// 07:00 releases, the cached ONS figures are marked stale and read again (lib/state-of-the-nation.ts; one request a
// second with the identifying User-Agent). A read that fails keeps the last good figures. The page and the homepage
// band are then refreshed.
import { bearerMatches } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from '@/lib/refresh-count';
import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SOTN_TAG, onsData } from '@/lib/state-of-the-nation';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function GET_impl(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (!bearerMatches(req.headers.get('authorization'), expected)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  revalidateTag(SOTN_TAG, 'max');
  try {
    const data = await onsData();
    revalidatePath('/state-of-the-nation');
    revalidatePath('/');
    return NextResponse.json({ ok: true, series: Object.keys(data).length, at: new Date().toISOString() });
  } catch (e) {
    // The last good figures stay up; the heartbeat records the failure.
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

export const GET = withHeartbeat('/api/refresh-state-of-the-nation', GET_impl);
