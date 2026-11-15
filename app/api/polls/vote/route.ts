import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';
import { touchLastSeen } from '@/lib/touch-last-seen';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  await touchLastSeen(userId);
  const { pollId, choice } = await request.json();

  if (!pollId || !choice) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  // L10 (security review, owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 59): only 'yes' and 'no' are votes; anything
  // else used to be counted as 'no'.
  if (choice !== 'yes' && choice !== 'no') return NextResponse.json({ error: 'Choice must be yes or no' }, { status: 400 });

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
    // The time is sent as well as left to the column default, the same as bill votes (25 Oct 2026, report 58).
    .insert({ user_id: userId, poll_id: pollId, choice, created_at: new Date().toISOString() });

  if (voteError) { console.error('[polls/vote]', voteError.message); return NextResponse.json({ error: 'Your vote could not be saved. Please try again.' }, { status: 500 }); }

  const field = choice === 'yes' ? 'vote_count_yes' : 'vote_count_no';

  // Read, plus one, write (unchanged): the shown totals start from published figures, not only this site's votes, so they
  // cannot be recounted from poll_vote. Two votes at the same moment can still lose one +1; the fix needs a database
  // function (drafted for Cowork, scripts/migrations/draft-poll-vote-increment.sql, not applied).
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
  const userId = await getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  await touchLastSeen(userId);

  const { data } = await supabase
    .from('poll_vote')
    .select('poll_id, choice')
    .eq('user_id', userId);

  const votes: Record<number, string> = {};
  (data || []).forEach((v: any) => { votes[v.poll_id] = v.choice; });

  return NextResponse.json({ votes });
}
