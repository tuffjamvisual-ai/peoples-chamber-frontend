cat > ~/peoples-chamber-frontend/lib/data.ts << 'EOF'
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
  commons_votes?: {
    ayes: number;
    noes: number;
  } | null;
  vote_count_yes: number;
  vote_count_no: number;
  vote_count_abstain: number;
  last_update: string;
  bill_withdrawn: string | null;
  is_act: boolean;
};

export async function getAllBills(): Promise<Bill[]> {
  try {
    const allBills: any[] = [];
    let hasMore = true;
    let rangeStart = 0;
    const rangeSize = 1000;

    while (hasMore) {
      const { data: bills, error } = await supabase
        .from('bill')
        .select('id, title, description, category, current_stage, stage_date, sponsor_name, sponsor_party, sponsor_party_colour, sponsor_photo, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, last_update, bill_withdrawn, is_act')
        .order('id', { ascending: true })
        .range(rangeStart, rangeStart + rangeSize - 1);
      
      if (error) {
        console.error('Error fetching bills:', error);
        break;
      }
      
      if (!bills || bills.length === 0) {
        hasMore = false;
        break;
      }

      const transformedBills = bills.map((bill: any) => ({
        ...bill,
        votes: {
          yes: bill.vote_count_yes || 0,
          no: bill.vote_count_no || 0,
          abstain: bill.vote_count_abstain || 0,
        },
        commons_votes: bill.commons_ayes !== null ? {
          ayes: bill.commons_ayes,
          noes: bill.commons_noes,
        } : null,
      }));

      allBills.push(...transformedBills);
      
      if (bills.length < rangeSize) {
        hasMore = false;
      } else {
        rangeStart += rangeSize;
      }
    }

    return allBills;
  } catch (error) {
    console.error('Error in getAllBills:', error);
    return [];
  }
}
EOF
