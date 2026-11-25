import { supabase } from './supabase';
import { tagged } from './tagged-read';
import { tableTags } from './source-tags';
import { bothCases } from './gone-debates-core';

// The rows of `debates` whose record Hansard no longer holds (hansard_debates.gone_at is set: withdrawn, or issued again
// under a new id), by their own numeric id, for the debates lists to leave out (owner approved 25 Nov 2026, Cowork ENTRY 649
// (4)): their pages answer 404. There were 261 of 11,468 on 24 Nov 2026.
// The two tables do not share a case: hansard_debates.guid is upper, debates.hansard_ext_id is Hansard's own (lower for 260 of
// the 261), so both forms are asked for. Ids, not GUIDs, are used in the list's own query: 261 are about 1.6 KB of address.
// Kept in the shared data cache under the debates tag only (A16), so a list is rebuilt no more often than now: a debate that
// goes after the last change of debates is left out from the next one (debates is synced daily).
const CHUNK = 50;
export { leaveOut } from './gone-debates-core';

async function readGone(): Promise<number[]> {
  const { data, error } = await supabase.from('hansard_debates').select('guid').not('gone_at', 'is', null).order('guid').limit(1000);
  if (error) throw new Error(`gone debates: ${error.message}`);
  const guids = (data ?? []).map((r) => String((r as { guid: string }).guid));
  // 1,000 is the API's most per call: past it none is left out (the list then links what it links today), never a failed page.
  if (guids.length === 1000) { console.error('[gone-debates] 1,000 or more in hansard_debates: none left out'); return []; }
  const ids: number[] = [];
  for (let i = 0; i < guids.length; i += CHUNK) {
    const { data: rows, error: e } = await supabase.from('debates').select('id').in('hansard_ext_id', bothCases(guids.slice(i, i + CHUNK)));
    if (e) throw new Error(`gone debates: ${e.message}`);
    ids.push(...(rows ?? []).map((r) => Number((r as { id: number }).id)));
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

// An unread list is an error, not an empty one: the page's own handling decides (Next keeps the last good copy).
export const goneDebateIds = (): Promise<number[]> => tagged(['gone-debate-ids-v1'], tableTags('debates'), readGone);
