import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { COUNCIL_LEAGUE_TAG } from '@/lib/council-league';

// Called by scripts/score-areas.js and the council finance and ratings imports after they write, so the
// cached council league data (lib/council-league.ts) is rebuilt on the next visit instead of within 6 hours. Needs
// CRON_SECRET; refuses if it is not set.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  revalidateTag(COUNCIL_LEAGUE_TAG, 'max');
  return NextResponse.json({ revalidated: [COUNCIL_LEAGUE_TAG], at: new Date().toISOString() });
}
