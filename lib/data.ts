import { supabase } from './supabase';

export type Bill = {
  id: number;
  title: string;
  description: string;
  category: string;
  current_stage: string;
  stage_date: string | null;
  sponsor_name: string | null;
  sponsor_party: string | null;
  sponsor_party_colour: string | null;
  sponsor_photo: string | null;
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  commons_votes: {
    ayes: number;
    noes: number;
  } | null;
};

export async function getAllBills(): Promise<Bill[]> {
  try {
    // Fetch ALL bills in one query (Supabase is fast!)
    const { data: bills, error } = await supabase
      .from('bill')
      .select('id, title, description, category, current_stage, stage_date, sponsor_name, sponsor_party, sponsor_party_colour, sponsor_photo, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes')
      .eq('status', 'Active')
      .order('id', { ascending: true })
      .range(0, 4999);
    
    if (error) {
      console.error('Error fetching bills:', error);
      return [];
    }
    
    // Format the data
    return bills?.map(bill => ({
      id: bill.id,
      title: bill.title,
      description: bill.description,
      category: bill.category,
      current_stage: bill.current_stage,
      stage_date: bill.stage_date,
      sponsor_name: bill.sponsor_name,
      sponsor_party: bill.sponsor_party,
      sponsor_party_colour: bill.sponsor_party_colour,
      sponsor_photo: bill.sponsor_photo,
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
    
  } catch (error) {
    console.error('Failed to fetch bills:', error);
    return [];
  }
}
