import { NextResponse } from 'next/server';
import { mpVotesPage } from '@/lib/mp-votes';

// The first page of an MP's voting record (owner, 4 Nov 2026): no longer in the page's HTML, loaded when the section is
// opened. Cached for an hour like /api/mps/[id]/expenses; a failed read throws, so an error is never cached.
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ votes: [], total: 0 }, { status: 400 });
  return NextResponse.json(await mpVotesPage(memberId, 1, ''));
}
