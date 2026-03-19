import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const billId = parseInt(params.id);
    
    if (isNaN(billId)) {
      return NextResponse.json({ error: 'Invalid bill ID' }, { status: 400 });
    }
    
    const { data: bill, error } = await supabase
      .from('bill')
      .select('*')
      .eq('id', billId)
      .single();
    
    if (error || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }
    
    // Format response to match Flask API
    return NextResponse.json({
      id: bill.id,
      title: bill.title,
      long_title: bill.long_title,
      description: bill.description,
      category: bill.category,
      status: bill.status,
      current_stage: bill.current_stage,
      stage_date: bill.stage_date,
      sponsor_name: bill.sponsor_name,
      sponsor_party: bill.sponsor_party,
      sponsor_party_colour: bill.sponsor_party_colour,
      sponsor_photo: bill.sponsor_photo,
      sponsor_constituency: bill.sponsor_constituency,
      originating_house: bill.originating_house,
      votes: {
        yes: bill.vote_count_yes || 0,
        no: bill.vote_count_no || 0,
        abstain: bill.vote_count_abstain || 0
      },
      user_vote: null
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
