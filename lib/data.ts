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
    const allBills: any[] = [];
    let hasMore = true;
    let rangeStart = 0;
    const rangeSize = 1000;

    // Fetch in batches of 1000 until we have all bills
    while (hasMore) {
      const { data: bills, error } = await supabase
        .from('bill')
        .select('id, title, description, category, current_stage, stage_date, sponsor_name, sponsor_party, sponsor_party_colour, sponsor_photo, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes')
        .eq('status', 'Active')
        .order('id', { ascending: true })
        .range(rangeStart, rangeStart + rangeSize - 1);
      
      if (error) {
        console.error('Error fetching bills:', error);
        break;
      }
      
      if (bills && bills.length > 0) {
        allBills.push(...bills);
        rangeStart += rangeSize;
        hasMore = bills.length === rangeSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Fetched ${allBills.length} bills total`);
    
    // Format the data
    return allBills.map(bill => ({
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
    }));
    
  } catch (error) {
    console.error('Failed to fetch bills:', error);
    return [];
  }
}
