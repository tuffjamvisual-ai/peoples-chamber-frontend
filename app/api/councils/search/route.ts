import { NextRequest, NextResponse } from 'next/server';
import { searchCouncilNames } from '@/lib/search/lists';
import { councilsForPlaces } from '@/lib/council-places';

export const dynamic = 'force-dynamic';

// Typeahead search for the homepage's local-authority search bar.
// Matches against both the council's full name ("Adur District Council")
// and its short name ("Adur"), since users are far more likely to type
// the short form. Covers all 382 councils across all four nations —
// no GB-only restriction here, unlike the welfare explorer's search
// (PIP/DLA/Carer's Allowance devolution doesn't apply to "does this
// council exist", only to which welfare benefits a given council's page
// can show).

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Council names (SEARCH-ALL batch 2: every word in any order at word starts, a one letter typo only if nothing matches,
  // lib/search/lists.ts), and towns and villages with their council (ENTRY 308), side by side; names are listed first.
  let names: Awaited<ReturnType<typeof searchCouncilNames>>;
  let places: Awaited<ReturnType<typeof councilsForPlaces>>;
  try {
    [names, places] = await Promise.all([searchCouncilNames(q, 8), councilsForPlaces(q)]);
  } catch (e) {
    console.error('councils search error:', (e as Error).message);
    return NextResponse.json({ error: 'db', message: 'Database error' }, { status: 500 });
  }
  const data = names.matches;

  const results = data.map((r) => ({
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    typeLabel: r.type_label,
    country: r.country,
  }));

  return NextResponse.json({ results, places });
}
