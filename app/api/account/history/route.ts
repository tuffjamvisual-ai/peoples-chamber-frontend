import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Returns a logged-in user's voting history: the bills and polls they have
// voted on, with the title/question and their choice. Two-step fetch (no
// reliance on FK joins) so it works regardless of relationship config.
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Bill votes
  const { data: bv } = await supabase
    .from('vote')
    .select('bill_id, choice, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  const billIds = [...new Set((bv || []).map((r) => r.bill_id))];
  const billTitles: Record<number, string> = {};
  if (billIds.length) {
    const { data: bills } = await supabase.from('bill').select('id, title').in('id', billIds);
    (bills || []).forEach((b: { id: number; title: string }) => { billTitles[b.id] = b.title; });
  }
  const bills = (bv || []).map((r) => ({
    id: r.bill_id, title: billTitles[r.bill_id] || `Bill #${r.bill_id}`, choice: r.choice, created_at: r.created_at,
  }));

  // Poll votes
  const { data: pv } = await supabase
    .from('poll_vote')
    .select('poll_id, choice, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  const pollIds = [...new Set((pv || []).map((r) => r.poll_id))];
  const pollQ: Record<number, { question: string; tag: string | null }> = {};
  if (pollIds.length) {
    const { data: polls } = await supabase.from('polls').select('id, question, constituency').in('id', pollIds);
    (polls || []).forEach((p: { id: number; question: string; constituency: string | null }) => {
      pollQ[p.id] = { question: p.question, tag: p.constituency };
    });
  }
  const polls = (pv || []).map((r) => ({
    id: r.poll_id, question: pollQ[r.poll_id]?.question || `Poll #${r.poll_id}`, tag: pollQ[r.poll_id]?.tag || null,
    choice: r.choice, created_at: r.created_at,
  }));

  return NextResponse.json({ bills, polls, counts: { bills: bills.length, polls: polls.length } });
}
