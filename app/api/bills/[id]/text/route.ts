// One part of a large bill's text, for /bills/[id]/full when the whole text would make the page over 2 MB (owner,
// 27 Oct 2026). GET ?g=<group number> returns { html } from the same cleaned copy the page uses (lib/bill-text.ts,
// kept 24 hours), so this never fetches from Parliament more than the page does.
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getBillPublications, getBillText, latestText } from '@/lib/bill-text';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const billId = Number(id);
  const g = Number(req.nextUrl.searchParams.get('g'));
  if (!Number.isSafeInteger(billId) || !Number.isSafeInteger(g) || g < 0) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const { data: bill, error } = await supabase.from('bill').select('parliament_id, hidden_reason, last_update').eq('id', billId).maybeSingle();
  if (error) return NextResponse.json({ error: 'bill lookup failed' }, { status: 500 });
  if (!bill || bill.parliament_id == null || bill.hidden_reason) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const settled = !!bill.last_update && Date.now() - Date.parse(bill.last_update) > 90 * 86400_000;
  try {
    const latest = latestText(await getBillPublications(bill.parliament_id, settled));
    const text = latest?.html ? await getBillText(latest.html.url) : null;
    const group = text?.groups[g];
    if (!group) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ html: group.html }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (e) {
    console.error(`[bill text] ${billId} part ${g}: ${(e as Error).message}`);
    return NextResponse.json({ error: 'Parliament could not be reached' }, { status: 502 });
  }
}
