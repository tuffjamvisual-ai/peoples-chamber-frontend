// Hidden bills (bill.hidden_reason: duplicates and bad records, scripts/migrations/2026-10-20j-bill-hidden-reason.sql)
// have no page: /bills/[id] returns 404. Queries on the bill table filter them with .is('hidden_reason', null); this
// set is for links built from other tables (MP division votes, visitors' votes, comments) that carry a bill_id.
import { supabase } from './supabase';
import { tagged } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';

async function getHiddenBillIdsRead(): Promise<Set<number>> {
  const { data, error } = await supabase.from('bill').select('id').not('hidden_reason', 'is', null).range(0, 999);
  if (error) {
    console.error('getHiddenBillIds:', error.message);
    return new Set();
  }
  return new Set((data || []).map((r) => r.id as number));
}

// A16 (owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129): kept in the shared data cache under its tags, no timer.
// A Set is not stored as JSON, so the ids are cached as a list and made a Set again here.
export async function getHiddenBillIds(): Promise<Set<number>> {
  return new Set(await tagged(['hidden-bill-ids-v1'], tableTags('bill'), async () => [...(await getHiddenBillIdsRead())]));
}
