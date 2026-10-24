import { supabase } from './supabase';
import { readAll } from './read-all';
import { cardSummary } from './bill-summary';

export type Bill = {
  id: number;
  title: string;
  description?: string;
  summary?: string; // card-length summary, set by toCardBill
  category: string;
  current_stage: string;
  stage_date: string | null;
  originating_house?: string | null;
  introduced_session_id?: number | null;
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
// payload: one .range() query per page, with the count.
// Sort order matches getAllBills (most-voted first) so the URL paging
// is over the same canonical ordering.
export async function getBillsPage(
  page: number,
  perPage = 20,
): Promise<{ bills: Bill[]; totalCount: number }> {
  // bill_current: bills going through Parliament now (introduced in or carried into the current session; not Acts,
  // withdrawn, defeated or at Royal Assent), so every page has `perPage` cards and the count matches. Earlier bills
  // are in the archive (/bills/sessions). The summary is cut to the card's length here, not in the browser.
  // Ordered by public_votes (Aye + No, the total the card shows), then id.
  const cols =
    'id, parliament_id, title, category, description, long_title, current_stage, stage_date, originating_house, introduced_session_id, sponsor_name, sponsor_party, sponsor_party_colour, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, last_update, bill_withdrawn, is_act';
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * perPage;
  const to = from + perPage - 1;

  try {
    const { data, count, error } = await supabase
      .from('bill_current')
      .select(cols, { count: 'exact' })
      .order('public_votes', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);
    // PGRST103: the page is past the last one. No bills, so /bills/page/N returns notFound() (404); not an error.
    if (error?.code === 'PGRST103') return { bills: [], totalCount: 0 };
    if (error) {
      console.error('getBillsPage error:', error);
      return { bills: [], totalCount: 0 };
    }
    return { bills: (data || []).map(toCardBill), totalCount: count ?? 0 };
  } catch (error) {
    console.error('getBillsPage exception:', error);
    return { bills: [], totalCount: 0 };
  }
}

// A bill row as the bill cards take it: vote totals grouped, and the summary cut to card length (the full
// description and long title are dropped so list pages stay small). Shared with /api/bills/search.
export function toCardBill(bill: Record<string, unknown>): Bill {
  const { description, long_title, ...rest } = bill as { description?: string | null; long_title?: string | null; [k: string]: unknown };
  const b = rest as { title?: string | null; vote_count_yes: number | null; vote_count_no: number | null; vote_count_abstain: number | null; commons_ayes: number | null; commons_noes: number | null };
  return {
    ...(rest as unknown as Bill),
    summary: cardSummary({ title: b.title, description, long_title }),
    votes: {
      yes: b.vote_count_yes || 0,
      no: b.vote_count_no || 0,
      abstain: b.vote_count_abstain || 0,
    },
    commons_votes:
      b.commons_ayes != null
        ? { ayes: b.commons_ayes, noes: b.commons_noes as number }
        : null,
  };
}

// A bill row as read by getAllBills, before the votes objects are added.
type BillRow = Omit<Bill, 'votes' | 'commons_votes'> & { commons_ayes: number | null; commons_noes: number | null };

export async function getAllBills(): Promise<Bill[]> {
  // Every visible bill via lib/read-all.ts (24 Oct 2026, report 36), replacing four fixed range queries that held
  // at most 4,000 bills and were ordered only by vote_count_yes (ties could repeat or skip bills across pages).
  // Nothing calls this today. Still returns [] on failure, as before.
  const cols =
    'id, parliament_id, title, category, current_stage, stage_date, sponsor_name, sponsor_party, sponsor_party_colour, vote_count_yes, vote_count_no, vote_count_abstain, commons_ayes, commons_noes, last_update, bill_withdrawn, is_act';

  try {
    const bills = await readAll<BillRow>(() => supabase.from('bill'), {
      columns: cols,
      filter: (q) => q.is('hidden_reason', null),
      orderBy: [{ column: 'vote_count_yes', ascending: false }, { column: 'id' }],
      label: 'getAllBills',
    });

    return bills.map((bill) => ({
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
    }) as Bill);
  } catch (error) {
    console.error('Error in getAllBills:', error);
    return [];
  }
}
