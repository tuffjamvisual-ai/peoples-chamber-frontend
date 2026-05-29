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

// Server-side paginated fetch. Used by /bills to avoid the ~4000-row
// payload — one .range() query per page, plus a single count query.
// Sort order matches getAllBills (most-voted first) so the URL paging
// is over the same canonical ordering.
export async function getBillsPage(
  page: number,
  perPage = 20,
): Promise<{ bills: Bill[]; totalCount: number }> {
  const cols =
    'id, parliament_id, title, category, current_stage, stage_date, sponsor_name, sponsor_party, sponsor_party_colour, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, last_update, bill_withdrawn, is_act';
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * perPage;
  const to = from + perPage - 1;

  try {
    const { data, count, error } = await supabase
      .from('bill')
      .select(cols, { count: 'exact' })
      .order('vote_count_yes', { ascending: false })
      .range(from, to);
    if (error) {
      console.error('getBillsPage error:', error);
      return { bills: [], totalCount: 0 };
    }
    const bills: Bill[] = (data || []).map((bill: { vote_count_yes: number | null; vote_count_no: number | null; vote_count_abstain: number | null; commons_ayes: number | null; commons_noes: number | null; [k: string]: unknown }) => ({
      ...(bill as unknown as Bill),
      votes: {
        yes: bill.vote_count_yes || 0,
        no: bill.vote_count_no || 0,
        abstain: bill.vote_count_abstain || 0,
      },
      commons_votes:
        bill.commons_ayes !== null
          ? { ayes: bill.commons_ayes, noes: bill.commons_noes as number }
          : null,
    }));
    return { bills, totalCount: count ?? 0 };
  } catch (error) {
    console.error('getBillsPage exception:', error);
    return { bills: [], totalCount: 0 };
  }
}

export async function getAllBills(): Promise<Bill[]> {
  // Supabase project-level db-max-rows caps each response at 1000 even
  // when .range() asks for more, so we issue four parallel range queries
  // and concatenate. This holds 4000 bills; revisit when the table grows
  // past that.
  const cols =
    'id, parliament_id, title, category, current_stage, stage_date, sponsor_name, sponsor_party, sponsor_party_colour, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, last_update, bill_withdrawn, is_act';

  const batch = (from: number, to: number) =>
    supabase
      .from('bill')
      .select(cols)
      .order('vote_count_yes', { ascending: false })
      .range(from, to);

  try {
    const [b1, b2, b3, b4] = await Promise.all([
      batch(0, 999),
      batch(1000, 1999),
      batch(2000, 2999),
      batch(3000, 3999),
    ]);

    const firstError = b1.error || b2.error || b3.error || b4.error;
    if (firstError) {
      console.error('Error fetching bills:', firstError);
      return [];
    }

    const bills = [
      ...(b1.data || []),
      ...(b2.data || []),
      ...(b3.data || []),
      ...(b4.data || []),
    ];

    return bills.map((bill: any) => ({
      ...bill,
      votes: {
        yes: bill.vote_count_yes || 0,
        no: bill.vote_count_no || 0,
        abstain: bill.vote_count_abstain || 0,
      },
      commons_votes:
        bill.commons_ayes !== null
          ? { ayes: bill.commons_ayes, noes: bill.commons_noes }
          : null,
    }));
  } catch (error) {
    console.error('Error in getAllBills:', error);
    return [];
  }
}
