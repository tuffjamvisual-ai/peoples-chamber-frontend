import { NextRequest, NextResponse } from 'next/server';
import { siteSuggestions } from '@/lib/search/site-index';

export const dynamic = 'force-dynamic';

// Suggestions under Search opengovt, the homepage box and the page not found box (SEARCH-ALL batch 1, Cowork ENTRY 326):
// ?q= from the 2nd letter, at most 6, each { label, kind, href }. Searched in memory (lib/search/site-index.ts): every
// word in any order at word starts, one letter typos only if nothing matches exactly. Cached by the CDN for an hour.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').slice(0, 100);
  try {
    const { suggestions, typos } = await siteSuggestions(q);
    return NextResponse.json(
      { suggestions: suggestions.map(({ label, kind, href }) => ({ label, kind, href })), typos },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } },
    );
  } catch (e) {
    console.error('[suggest/site]', (e as Error).message);
    return NextResponse.json({ suggestions: [], typos: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
