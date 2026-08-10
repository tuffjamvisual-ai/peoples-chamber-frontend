import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';
import { CATEGORIES, computeReaderViAggregate, viPollId } from '@/lib/readerVi';

export const dynamic = 'force-dynamic';

// Reader voting-intention poll, stored on the shared polls/poll_vote
// infrastructure (polls.poll_type = 'voting_intention') rather than a separate
// table. One vote per logged-in, email-verified account; changeable at any time
// (upsert on the UNIQUE (user_id, poll_id) constraint). Identity comes only from
// the session cookie. `choice` is a fixed party key, or 'other:<free text>' when
// the reader selects "Another party". The tally + total are a deliberate public
// aggregate (like the pollster average and donations tracker); only the caller's
// own vote is derived from the cookie.

// Tally computation lives in lib/readerVi.ts (computeReaderViAggregate) so the
// homepage "If an Election Were Held Now" card reads the identical source and
// can never show different numbers from this /polls ballot.

// The aggregate barely moves per vote (the seed dwarfs live votes), so a short
// shared cache is fine and takes the per-request full-table read off the hot
// path. Voters still see their choice immediately via the live userVote lookup;
// POST recomputes fresh so the returned totals include the just-cast vote.
const cachedAggregate = unstable_cache(computeReaderViAggregate, ['reader-vi-aggregate'], { revalidate: 45 });

// The caller's own vote — a single indexed row on (user_id, poll_id).
async function readUserVote(userId: number | null) {
  if (userId == null) return { userVote: null, userVoteText: null, votedAt: null };
  const pollId = await viPollId();
  if (pollId == null) return { userVote: null, userVoteText: null, votedAt: null };
  const { data } = await supabase
    .from('poll_vote')
    .select('choice, created_at')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return { userVote: null, userVoteText: null, votedAt: null };
  const choice = data.choice as string;
  const isOther = choice.startsWith('other:');
  return {
    userVote: isOther ? 'another' : choice,
    userVoteText: isOther ? choice.slice(6) : null,
    votedAt: data.created_at as string,
  };
}

async function readState(userId: number | null, freshAggregate = false) {
  const [aggregate, user] = await Promise.all([
    freshAggregate ? computeReaderViAggregate() : cachedAggregate(),
    readUserVote(userId),
  ]);
  return { ...aggregate, ...user };
}

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  return NextResponse.json(await readState(userId));
}

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (userId == null) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const party = String(body.party || '');
  if (!CATEGORIES.includes(party)) return NextResponse.json({ error: 'Invalid option' }, { status: 400 });

  let choice: string;
  if (party === 'another') {
    const t = String(body.otherText || '').trim();
    if (!t) return NextResponse.json({ error: 'Please name the party.' }, { status: 400 });
    choice = 'other:' + t.slice(0, 60);
  } else {
    choice = party;
  }

  const { data: voter } = await supabase.from('users').select('id, email_verified').eq('id', userId).single();
  if (!voter) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!voter.email_verified) {
    return NextResponse.json({ error: 'Please confirm your email before voting. Check your inbox for the confirmation link.' }, { status: 403 });
  }

  const pollId = await viPollId();
  if (pollId == null) return NextResponse.json({ error: 'Poll unavailable' }, { status: 500 });

  const { error } = await supabase
    .from('poll_vote')
    .upsert(
      { user_id: userId, poll_id: pollId, choice, created_at: new Date().toISOString() },
      { onConflict: 'user_id,poll_id' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // freshAggregate:true bypasses the 45s cache so the returned totals include
  // the vote just cast (the GET cache still self-refreshes within 45s).
  return NextResponse.json({ success: true, ...(await readState(userId, true)) });
}
