import { NextRequest, NextResponse } from 'next/server';
import { searchContent, searchCouncils, searchPeers, VALID_SEARCH_TYPES, type SearchResult, type SearchResultType } from '@/lib/search-content';

export const dynamic = 'force-dynamic';

export type { SearchResult, SearchResultType };

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q    = (sp.get('q') ?? '').trim();
  const type = sp.get('type') ?? 'all';
  const dept = sp.get('dept') ?? null;
  const from = sp.get('from') ?? null;
  const to   = sp.get('to')   ?? null;

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }
  if (!VALID_SEARCH_TYPES.includes(type as typeof VALID_SEARCH_TYPES[number])) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_SEARCH_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  // Councils and peers are separate groups, as on /search: only with type=all and no department or date filter.
  const [results, councils, peers] = await Promise.all([
    searchContent(q, type, dept, from, to),
    type === 'all' && !dept && !from && !to ? searchCouncils(q) : Promise.resolve([]),
    type === 'all' && !dept && !from && !to ? searchPeers(q) : Promise.resolve([]),
  ]);
  return NextResponse.json({ q, type, results, councils, peers });
}
