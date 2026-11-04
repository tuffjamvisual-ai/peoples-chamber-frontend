import { NextResponse } from 'next/server';
import { mpVotesPage, VOTES_PER_PAGE } from '@/lib/mp-votes';

// Client-fetched voting-record pagination + search for MP profiles.
// Keeping paging/search OFF the page's searchParams lets /mps/[id] render
// statically (ISR) instead of dynamically on every request. Page 1 (no
// query) comes from /api/mps/[id]/votes/first; page 2+ and searches come
// from here on demand.
export const revalidate = 3600;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) {
    return NextResponse.json({ votes: [], total: 0, page: 1, perPage: VOTES_PER_PAGE }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);

  try {
    return NextResponse.json(await mpVotesPage(memberId, page, q));
  } catch (e) {
    console.error('/api/mps/[id]/votes:', e instanceof Error ? e.message : e);
    return NextResponse.json({ votes: [], total: 0, page, perPage: VOTES_PER_PAGE });
  }
}
