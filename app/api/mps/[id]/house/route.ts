import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { questionsSummary } from '@/lib/mp-written-questions';

// An MP's recent debates and written questions (owner, 4 Nov 2026): no longer in the page's HTML, loaded when the section
// is opened. Cached for an hour like /api/mps/[id]/expenses; a failed read of the debates throws, so an error is never
// cached. Written questions failing still shows the debates, as the page did.
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (Number.isNaN(memberId)) return NextResponse.json({ contributions: [], writtenQuestions: null }, { status: 400 });
  const [contributions, writtenQuestions] = await Promise.all([
    supabase
      .from('mp_contributions')
      .select('debate_title, sitting_date, section, house, speech_count, question_count, intervention_count, answer_count, statement_count, total_contributions, hansard_url')
      .eq('member_id', memberId)
      .order('sitting_date', { ascending: false })
      .limit(25),
    questionsSummary(supabase, memberId).catch((e) => {
      console.error(`/api/mps/${memberId}/house written questions:`, e instanceof Error ? e.message : e);
      return null;
    }),
  ]);
  if (contributions.error) throw new Error(`contributions of ${memberId}: ${contributions.error.message}`);
  return NextResponse.json({ contributions: contributions.data ?? [], writtenQuestions });
}
