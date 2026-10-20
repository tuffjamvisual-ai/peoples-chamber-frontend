// Hidden bills (bill.hidden_reason: duplicates and bad records, scripts/migrations/2026-10-20j-bill-hidden-reason.sql)
// have no page: /bills/[id] returns 404. Queries on the bill table filter them with .is('hidden_reason', null); this
// set is for links built from other tables (MP division votes, visitors' votes, comments) that carry a bill_id.
import { supabase } from './supabase';

export async function getHiddenBillIds(): Promise<Set<number>> {
  const { data, error } = await supabase.from('bill').select('id').not('hidden_reason', 'is', null).range(0, 999);
  if (error) {
    console.error('getHiddenBillIds:', error.message);
    return new Set();
  }
  return new Set((data || []).map((r) => r.id as number));
}
