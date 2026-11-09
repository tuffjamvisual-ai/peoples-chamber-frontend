// Which bill pages search engines may index (owner, 7 Nov 2026). The bill page's robots rule (app/bills/[id]/page.tsx)
// and the sitemap (app/sitemap.ts) both use billIndexable, so they cannot drift apart.
//
// A bill page is indexable when any of these holds:
//   - it is in the current, unfinished session (introduced in it or carried into it), whatever its stage;
//   - its current stage is a working stage (committee, report, 3rd reading, consideration of amendments);
//   - it became an Act, had a Commons division, or has at least one recorded MP vote.
// A bill from a finished session that never got past 1st or 2nd reading, with no vote, division or Act, keeps
// noindex, follow: a thin page (first set as a soft 404 fix; follow keeps its links crawlable).
// The stage is bill.current_stage. bill.status holds the NEXT stage (bill 4078: status "2nd reading" while
// current_stage is "1st reading"), so it is not used here.
import 'server-only';
import { supabase } from '@/lib/supabase';

const WORKING_STAGE = /committee|report|3rd reading|third reading|consideration/;

export type BillIndexFacts = {
  currentStage: string | null | undefined;
  isLaw: boolean; // from lib/bill-status.ts (UX1a)
  commonsDivisionId: number | null | undefined;
  hasVotes: boolean;
  inCurrentSession: boolean;
};

export function billIndexable(b: BillIndexFacts): boolean {
  return b.inCurrentSession
    || WORKING_STAGE.test((b.currentStage || '').toLowerCase())
    || b.isLaw
    || b.commonsDivisionId != null
    || b.hasVotes;
}

// The current session's id (parliament_session_bill_counts_stored.is_current), or null when none is marked current.
export async function currentBillSessionId(): Promise<number | null> {
  const { data, error } = await supabase.from('parliament_session_bill_counts_stored').select('session_id').eq('is_current', true).limit(1);
  if (error) throw new Error(`currentBillSessionId: ${error.message}`);
  return (data?.[0]?.session_id as number | undefined) ?? null;
}

// Every bill listed in the current session: introduced in it or carried into it (bill_in_session_stored).
export async function currentSessionBillIds(): Promise<Set<number>> {
  const session = await currentBillSessionId();
  if (session == null) return new Set();
  const ids = new Set<number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('bill_in_session_stored').select('bill_id').eq('session_id', session).order('bill_id').range(from, from + 999);
    if (error) throw new Error(`currentSessionBillIds: ${error.message}`);
    for (const r of data ?? []) ids.add(r.bill_id as number);
    if (!data || data.length < 1000) break;
  }
  return ids;
}

// Whether one bill is listed in the current session.
export async function billInCurrentSession(billId: number): Promise<boolean> {
  const session = await currentBillSessionId();
  if (session == null) return false;
  const { data, error } = await supabase.from('bill_in_session_stored').select('bill_id').eq('session_id', session).eq('bill_id', billId).limit(1);
  if (error) throw new Error(`billInCurrentSession: ${error.message}`);
  return (data?.length ?? 0) > 0;
}
