import { NextRequest, NextResponse } from 'next/server';
import { mpSuggestions } from '@/lib/search/site-index';

export const dynamic = 'force-dynamic';

// Suggestions under the homepage's Find your MP box (owner, 19 Nov 2026, Cowork ENTRY 374): the site search index's MPs,
// former MPs and constituencies (a constituency opens its MP), every word in any order at word starts. As /api/suggest/site.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').slice(0, 100);
  try {
    const { suggestions, typos } = await mpSuggestions(q);
    return NextResponse.json(
      { suggestions: suggestions.map(({ label, kind, href }) => ({ label, kind, href })), typos },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } },
    );
  } catch (e) {
    console.error('[suggest/mps]', (e as Error).message);
    return NextResponse.json({ suggestions: [], typos: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
