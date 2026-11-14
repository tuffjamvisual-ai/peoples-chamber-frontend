// Finding PMQs sessions (T2 ENTRY 1, Cowork 14 Nov 2026, from T1-AUDIT2): /pmqs takes ?q= (words from a question, an MP's
// name or a date), ?pm= (a Prime Minister) and ?year=, on the server, so the page carries one page of sessions, not all
// 3,000 and more. The filters work on the session list the page already reads (cached); only words go to the database:
// the archive (1961 to 2024) and the Hansard rows of the sessions since, each match read once and kept for an hour.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { PMQS_TAG, type PmqsSet } from '@/lib/pmqs';
import { ilikeWords } from '@/lib/ilike-words';
export { cleanWords, datePrefix, pmSlug } from '@/lib/pmqs-words';

// How many matching rows are read at most. A common word matches tens of thousands of rows; the page then says the list
// may not be complete, rather than reading the whole archive for one search.
export const ROW_CAP = 4000;

export type TextMatches = { dates: string[]; capped: boolean };

const readMatches = unstable_cache(async (words: string, guidDates: [string, string, number][]): Promise<TextMatches> => {
  // The words in order, anything between (the site's search rule, lib/ilike-words.ts).
  const like = ilikeWords(words);
  if (!like) return { dates: [], capped: false };
  const dates = new Set<string>();
  let capped = false;
  // The archive: question text and the printed speaker's name, newest first (the table's key), a thousand rows a read.
  for (let from = 0; from < ROW_CAP; from += 1000) {
    const { data, error } = await supabase.from('pmqs_archive_exchanges').select('date')
      .or(`contribution_text.ilike.${like},attributed_to.ilike.${like}`)
      .order('date', { ascending: false }).order('item_order', { ascending: false }).range(from, from + 999);
    if (error) throw new Error(`pmqs search archive: ${error.message}`);
    for (const r of (data ?? []) as { date: string }[]) dates.add(String(r.date).slice(0, 10));
    if ((data ?? []).length < 1000) break;
    if (from + 1000 >= ROW_CAP) capped = true;
  }
  // The sessions since the archive: their own Hansard sections only, from where each session starts.
  const start = new Map(guidDates.map(([g, d, o]) => [g, { d, o }]));
  const guids = guidDates.map(([g]) => g);
  for (let i = 0; i < guids.length; i += 40) {
    const { data, error } = await supabase.from('hansard_contributions').select('debate_ext_id, item_order')
      .in('debate_ext_id', guids.slice(i, i + 40)).is('removed_at', null)
      .or(`contribution_text.ilike.${like},attributed_to.ilike.${like}`).limit(1000);
    if (error) throw new Error(`pmqs search sessions: ${error.message}`);
    for (const r of (data ?? []) as { debate_ext_id: string; item_order: number | null }[]) {
      const s = start.get(r.debate_ext_id);
      if (s && (r.item_order ?? 0) >= s.o) dates.add(s.d);
    }
  }
  return { dates: [...dates], capped };
}, ['pmqs-search'], { tags: [PMQS_TAG], revalidate: 3600 });

// The dates of the sessions whose questions, answers or speakers' names contain the words.
export function sessionsMatching(words: string, set: PmqsSet): Promise<TextMatches> {
  const guidDates: [string, string, number][] = set.sessions.flatMap((s) => s.parts.map((p): [string, string, number] => [p.guid, s.date, p.fromOrder]));
  return readMatches(words.toLowerCase(), guidDates);
}
