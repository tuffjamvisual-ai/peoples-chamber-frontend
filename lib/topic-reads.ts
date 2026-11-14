// The topic pages' database functions, kept in the shared data cache (T1-READALL fix 2, owner approved 14 Nov 2026,
// COWORK-TO-T1 ENTRY 51). topic_bills, topic_bills_page and top_question_askers were the database's next largest load
// after the donor reads: 1,563 + 2,985 + 1,563 calls and about 604 s in pg_stat_statements over 2.8 days to 14 Nov
// 2026, mean 227 ms for topic_bills. The topic pages refresh daily, but every page rebuild and every deploy's build
// ran them again. Now each set of arguments is read at most every 6 hours, shared by every server instance and kept
// across deploys; a page rebuild in between reads the cached rows. Bills change slowly, and the pages themselves are
// still refreshed daily, so a page is at most about 6 hours older than it would otherwise be.
// A failed read throws and is not cached, so the page keeps its last good version (as before, 21 Oct 2026).
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

export const TOPIC_READS_TAG = 'topic-reads';

const cachedRpc = unstable_cache(
  async (fn: 'topic_bills' | 'topic_bills_page' | 'top_question_askers', args: Record<string, unknown>): Promise<unknown[]> => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(`${fn}: ${error.message}`);
    return (data ?? []) as unknown[];
  },
  ['topic-reads-v1'],
  { tags: [TOPIC_READS_TAG], revalidate: 21600 },
);

// The same { data, error } shape as a supabase call, so the pages read it as before.
export async function topicRpc(fn: 'topic_bills' | 'topic_bills_page' | 'top_question_askers', args: Record<string, unknown>): Promise<{ data: unknown[]; error: { message: string } | null }> {
  return { data: await cachedRpc(fn, args), error: null };
}
