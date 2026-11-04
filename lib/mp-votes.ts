// One page of an MP's voting record, for /api/mps/[id]/votes (later pages and searches) and /api/mps/[id]/votes/first
// (page 1, cached): each vote tagged when its division is a statutory instrument, and a vote on a hidden bill
// (bill.hidden_reason) keeps its row but loses the bill link, as that page is a 404. A failed read throws.
import { supabase } from '@/lib/supabase';
import { getHiddenBillIds } from '@/lib/hidden-bills';

export const VOTES_PER_PAGE = 20;
const COLS = 'id, division_title, division_date, vote_type, is_rebellion, bill_id, division_id, division_date_only, division_number';
const escapeIlike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function mpVotesPage(memberId: number, page: number, query: string) {
  const start = (page - 1) * VOTES_PER_PAGE;
  let listQ = supabase.from('mp_division_votes').select(COLS).eq('member_id', memberId);
  let countQ = supabase.from('mp_division_votes').select('id', { count: 'exact', head: true }).eq('member_id', memberId);
  if (query) {
    const like = `%${escapeIlike(query)}%`;
    listQ = listQ.ilike('division_title', like);
    countQ = countQ.ilike('division_title', like);
  }
  const [listRes, countRes] = await Promise.all([listQ.order('division_date', { ascending: false }).range(start, start + VOTES_PER_PAGE - 1), countQ]);
  if (listRes.error) throw new Error(`votes of ${memberId}: ${listRes.error.message}`);
  const votes = (listRes.data ?? []) as Array<{ division_id: number | null; bill_id: number | null }>;
  const divisionIds = votes.map((v) => v.division_id).filter((d): d is number => d != null);
  let si = new Set<number>();
  if (divisionIds.length) {
    const { data: siRows, error } = await supabase.from('statutory_instrument').select('division_id').in('division_id', divisionIds);
    if (error) throw new Error(`statutory instruments: ${error.message}`);
    si = new Set(((siRows ?? []) as Array<{ division_id: number }>).map((r) => r.division_id));
  }
  const hidden = votes.some((v) => v.bill_id != null) ? await getHiddenBillIds() : new Set<number>();
  const withTags = votes.map((v) => ({
    ...v,
    bill_id: v.bill_id != null && hidden.has(v.bill_id) ? null : v.bill_id,
    is_si: v.division_id != null && si.has(v.division_id),
  }));
  return { votes: withTags, total: countRes.count ?? withTags.length, page, perPage: VOTES_PER_PAGE };
}
