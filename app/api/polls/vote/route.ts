import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { pollId, choice } = await request.json();

  if (!pollId || !choice) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data: voter } = await supabase
    .from('users')
    .select('id, email_verified')
    .eq('id', userId)
    .single();
  if (!voter) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!voter.email_verified) return NextResponse.json({ error: 'Please confirm your email before voting. Check your inbox for the confirmation link.' }, { status: 403 });

  const { data: existing } = await supabase
    .from('poll_vote')
    .select('id')
    .eq('user_id', userId)
    .eq('poll_id', pollId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already voted' }, { status: 400 });
  }

  const { error: voteError } = await supabase
    .from('poll_vote')
    .insert({ user_id: userId, poll_id: pollId, choice });

  if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 });

  const field = choice === 'yes' ? 'vote_count_yes' : 'vote_count_no';

  const { data: poll } = await supabase
    .from('polls')
    .select('vote_count_yes, vote_count_no')
    .eq('id', pollId)
    .single();

  await supabase
    .from('polls')
    .update({ [field]: (poll as any)[field] + 1 })
    .eq('id', pollId);

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data } = await supabase
    .from('poll_vote')
    .select('poll_id, choice')
    .eq('user_id', userId);

  const votes: Record<number, string> = {};
  (data || []).forEach((v: any) => { votes[v.poll_id] = v.choice; });

  return NextResponse.json({ votes });
}
