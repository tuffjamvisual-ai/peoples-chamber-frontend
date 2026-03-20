import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    
    // Start building query
    let query = supabase
      .from('bill')
      .select('*', { count: 'exact' })
      .eq('status', 'Active');
    
    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    // Calculate pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    // Execute query with pagination
    const { data: bills, error, count } = await query
      .range(from, to)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Format response
    const billsData = bills?.map(bill => ({
      id: bill.id,
      title: bill.title,
      description: bill.description,
      category: bill.category,
      current_stage: bill.current_stage,
      stage_date: bill.stage_date,
      sponsor_name: bill.sponsor_name,
      sponsor_party: bill.sponsor_party,
      sponsor_photo: bill.sponsor_photo,
      sponsor_party_colour: bill.sponsor_party_colour,
      originating_house: bill.originating_house,
      votes: {
        yes: bill.vote_count_yes || 0,
        no: bill.vote_count_no || 0,
        abstain: bill.vote_count_abstain || 0
      },
      commons_votes: (bill.commons_ayes || bill.commons_noes) ? {
        ayes: bill.commons_ayes || 0,
        noes: bill.commons_noes || 0
      } : null
    })) || [];
    
    const totalPages = count ? Math.ceil(count / perPage) : 0;
    
    return NextResponse.json({
      bills: billsData,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        pages: totalPages
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
