import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { COUNCIL_LEAGUE_TAG } from '@/lib/council-league';

// Called by scripts/score-areas.js and the council finance and ratings imports after they write, so the
// cached council league data (lib/council-league.ts) and the council pages are rebuilt on the next visit. Needs
// CRON_SECRET; refuses if it is not set.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  revalidateTag(COUNCIL_LEAGUE_TAG, 'max');
  // The council pages too (owner, 30 Oct 2026, cache Stage 2a part 4): they keep for a week, and the hand loaders that
  // call this (scripts/lib/refresh-site.js) write data every council page shows.
  const paths = ['/councils/[slug]', '/councils/[slug]/schools', '/councils/[slug]/sewage'];
  for (const p of paths) revalidatePath(p, 'page');
  return NextResponse.json({ revalidated: [COUNCIL_LEAGUE_TAG, ...paths], at: new Date().toISOString() });
}
