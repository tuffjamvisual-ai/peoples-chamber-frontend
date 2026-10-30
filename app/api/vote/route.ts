import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { getSessionUserId } from '@/lib/session';
import { touchLastSeen } from '@/lib/touch-last-seen';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);

    if (userId == null) {
      return NextResponse.json(
        { error: 'Unauthorised' },
        { status: 401 }
      );
    }
    await touchLastSeen(userId);

    // Fetch all votes for this user
    const { data: votes, error } = await supabase
      .from('vote')
      .select('bill_id, choice')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching votes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
      );
    }
    
    // Convert to a map for easy lookup: { billId: choice }
    const votesMap = votes.reduce((acc: any, vote: any) => {
      acc[vote.bill_id] = vote.choice;
      return acc;
    }, {});
    
    return NextResponse.json({ votes: votesMap });
    
  } catch (error) {
    console.error('Vote fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (userId == null) {
      return NextResponse.json(
        { error: 'Unauthorised' },
        { status: 401 }
      );
    }
    await touchLastSeen(userId);
    const { billId, choice } = await request.json();

    // Validate input
    if (!billId || !choice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!['yes', 'no', 'abstain'].includes(choice)) {
      return NextResponse.json(
        { error: 'Invalid choice' },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const { data: userExists } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('id', userId)
      .single()
    
    if (!userExists) {
      return NextResponse.json(
        { error: 'Unauthorised' },
        { status: 401 }
      )
    }

    if (!userExists.email_verified) {
      return NextResponse.json(
        { error: 'Please confirm your email before voting. Check your inbox for the confirmation link.' },
        { status: 403 }
      )
    }

    // Hidden bills (bill.hidden_reason: duplicates and bad records) have no page and take no votes (24 Oct 2026).
    // A bill that does not exist, or is hidden, gets 404 and nothing is recorded.
    const { data: target, error: targetErr } = await supabase
      .from('bill')
      .select('id, hidden_reason')
      .eq('id', billId)
      .maybeSingle();
    if (targetErr) {
      console.error('Vote bill lookup error:', targetErr);
      return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
    }
    if (!target || target.hidden_reason) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Check if user already voted on this bill
    const { data: existingVote } = await supabase
      .from('vote')
      .select('id, choice')
      .eq('user_id', userId)
      .eq('bill_id', billId)
      .single();
    
    // Changing a vote (owner's approval, 25 Oct 2026, report 53): while the bill is still going through Parliament a
    // visitor may switch to another choice. public.change_bill_vote (migration 2026-10-25a) changes the vote row and
    // moves exactly one count from the old choice to the new one in a single transaction, with the bill row locked.
    // The same choice changes nothing. A closed bill (an Act, withdrawn or defeated) keeps the existing refusal, with
    // the stored choice; a hidden one is refused above.
    if (existingVote) {
      const counts = async () => {
        const { data } = await supabase.from('bill').select('vote_count_yes, vote_count_no, vote_count_abstain').eq('id', billId).single();
        return { yes: data?.vote_count_yes || 0, no: data?.vote_count_no || 0, abstain: data?.vote_count_abstain || 0 };
      };
      if (existingVote.choice === choice) {
        return NextResponse.json({ success: true, unchanged: true, choice, votes: await counts() });
      }
      const { data: changed, error: changeErr } = await supabase.rpc('change_bill_vote', { p_user_id: userId, p_bill_id: Number(billId), p_choice: choice });
      if (changeErr) {
        console.error('Vote change error:', changeErr);
        return NextResponse.json({ error: 'Failed to change vote', existingChoice: existingVote.choice }, { status: 500 });
      }
      const result = changed as { status: string; choice?: string; to?: string; votes?: { yes: number; no: number; abstain: number } };
      if (result.status === 'changed') {
        revalidatePath(`/bills/${Number(billId)}`);
        return NextResponse.json({ success: true, changed: true, choice: result.to, votes: result.votes });
      }
      if (result.status === 'unchanged') {
        return NextResponse.json({ success: true, unchanged: true, choice: result.choice, votes: await counts() });
      }
      if (result.status === 'not_found') return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      if (result.status === 'invalid') return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
      // closed (or a vote that vanished meanwhile): the existing refusal, with the stored choice.
      return NextResponse.json(
        { error: result.status === 'closed' ? 'Voting has closed on this bill' : 'You have already voted on this bill', closed: result.status === 'closed', existingChoice: result.choice ?? existingVote.choice },
        { status: 400 }
      );
    }
    
    // Insert vote. vote.created_at has no default, so the time is sent (25 Oct 2026, report 58): before this, bill
    // votes were stored with no date. A changed vote keeps its first time; change_bill_vote does not set it.
    const { error: voteError } = await supabase
      .from('vote')
      .insert({
        user_id: userId,
        bill_id: billId,
        choice,
        created_at: new Date().toISOString(),
      });
    
    if (voteError) {
      console.error('Vote insert error:', voteError);
      return NextResponse.json(
        { error: 'Failed to submit vote' },
        { status: 500 }
      );
    }
    
    // Update cached vote counts
    const { data: bill } = await supabase
      .from('bill')
      .select('vote_count_yes, vote_count_no, vote_count_abstain')
      .eq('id', billId)
      .single();
    
    if (bill) {
      const updates: any = {};
      if (choice === 'yes') updates.vote_count_yes = (bill.vote_count_yes || 0) + 1;
      if (choice === 'no') updates.vote_count_no = (bill.vote_count_no || 0) + 1;
      if (choice === 'abstain') updates.vote_count_abstain = (bill.vote_count_abstain || 0) + 1;
      
      await supabase
        .from('bill')
        .update(updates)
        .eq('id', billId);
    }
    
    // The bill page keeps for a week (cache Stage 2a part 2, owner, 30 Oct 2026): a vote refreshes its own bill.
    revalidatePath(`/bills/${Number(billId)}`);

    // Get updated counts
    const { data: updatedBill } = await supabase
      .from('bill')
      .select('vote_count_yes, vote_count_no, vote_count_abstain')
      .eq('id', billId)
      .single();
    
    return NextResponse.json({
      success: true,
      choice,
      votes: {
        yes: updatedBill?.vote_count_yes || 0,
        no: updatedBill?.vote_count_no || 0,
        abstain: updatedBill?.vote_count_abstain || 0
      }
    });
    
  } catch (error) {
    console.error('Vote submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
