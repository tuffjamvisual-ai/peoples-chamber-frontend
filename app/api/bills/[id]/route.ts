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

    // Stages are now cached in bill.stages (refreshed daily by
    // /api/sync-bill-stages). No live Parliament-API call on this path.
    const stages = (bill.stages?.items as unknown[]) || [];
    
    return NextResponse.json({
      id: bill.id,
      parliament_id: bill.parliament_id,
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
      is_act: bill.is_act,
      is_defeated: bill.is_defeated,
      bill_withdrawn: bill.bill_withdrawn,
      plain_summary: bill.plain_summary,
      support_explanation: bill.support_explanation,
      oppose_explanation: bill.oppose_explanation,
      ai_generated: bill.ai_generated,
      commons_ayes: bill.commons_ayes,
      commons_noes: bill.commons_noes,
      votes: {
        yes: bill.vote_count_yes || 0,
        no: bill.vote_count_no || 0,
        abstain: bill.vote_count_abstain || 0
      },
      stages: stages,
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
