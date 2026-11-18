import { NextRequest, NextResponse } from 'next/server';
import { searchMpNames } from '@/lib/search/lists';
import { displayMpName } from '@/lib/mp-name';

export const dynamic = 'force-dynamic';

// Typeahead search for the "Find Your MP" page's name search box.
// Matches against the MP's name and their constituency name, since a
// visitor who doesn't know their MP's name by heart often does know
// their constituency. Restricted to current members only (same
// current_member convention used elsewhere for the mps table —
// current_member is null for older/legacy rows that predate the column,
// so null is treated as current, same as app/topics/[slug]/page.tsx and
// app/api/sync-mp-contributions/route.ts).

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Name, seat and party, every word in any order at word starts, a one letter typo only if nothing matches (SEARCH-ALL
  // batch 2, lib/search/lists.ts: the 650 sitting MPs held in one cache, searched in memory).
  let data: Awaited<ReturnType<typeof searchMpNames>>['matches'];
  try {
    data = (await searchMpNames(q, 8)).matches;
  } catch (e) {
    console.error('mps search error:', (e as Error).message);
    return NextResponse.json({ error: 'db', message: 'Database error' }, { status: 500 });
  }

  const results = data.map((r) => ({
    memberId: r.member_id,
    name: displayMpName(r.name),
    constituency: r.constituency,
    party: r.party,
  }));

  return NextResponse.json({ results });
}
