import { NextResponse } from 'next/server';
import { searchDonorNames } from '@/lib/donor-search';

// Donor name search for the /donors search box (24 Oct 2026): every donor record held, not only the top 200 the page
// lists. Name matches only (lib/donor-search.ts). Read only.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ results: [], more: false, totalNames: 0 });
  try {
    return NextResponse.json(await searchDonorNames(q), { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (e) {
    console.error('/api/donors/search', (e as Error).message);
    return NextResponse.json({ error: 'Search is unavailable right now.' }, { status: 502 });
  }
}
