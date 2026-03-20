import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
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
    const { userId, billId, choice } = await request.json();
    
    // Validate input
    if (!userId || !billId || !choice) {
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
    
    // Check if user already voted on this bill
    const { data: existingVote } = await supabase
      .from('vote')
      .select('id, choice')
      .eq('user_id', userId)
      .eq('bill_id', billId)
      .single();
    
    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this bill', existingChoice: existingVote.choice },
        { status: 400 }
      );
    }
    
    // Insert vote
    const { error: voteError } = await supabase
      .from('vote')
      .insert({
        user_id: userId,
        bill_id: billId,
        choice
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
