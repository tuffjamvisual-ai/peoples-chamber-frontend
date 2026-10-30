import { NextRequest, NextResponse } from 'next/server';
import { loadMpPetitions } from '@/lib/mp-petitions';

// The Petitions tab of /mps/[id] (owner, 30 Oct 2026, cache Stage 2a part 4): loaded when a reader opens the tab, so the
// MP page itself (kept for a week) holds no live signature counts. Kept for a day, and refreshed when
// /api/sync-petitions changes a count (lib/mp-petitions.ts). A failed read throws, so an error is never cached as an
// empty list. The params are read; search params are not used.
export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const answer = await loadMpPetitions(memberId);
  if (!answer) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(answer);
}
