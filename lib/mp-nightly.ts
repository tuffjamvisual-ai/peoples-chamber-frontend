// The nightly MP page refreshes (owner, 30 Oct 2026, cache Stage 2a part 3), run by /api/refresh-nightly-pages at
// 05:15 UTC. MP pages keep for a week, so in place of refreshing every MP page each night:
//   1. the queue of MPs the nightly GitHub scripts changed (sync_cursor 'mp-refresh-queue': the register of interests
//      and the outside earnings summary, scripts/mp-refresh-queue.js) is refreshed and emptied;
//   2. date based content: MPs with an outside earnings role whose "Until:" date was yesterday (the Earnings tab marks a
//      role ended from the day after), and ministers with a meeting dated yesterday or today (the page lists meetings
//      dated up to today), matched to MPs by name as the page does.
import type { SupabaseClient } from '@supabase/supabase-js';

export const MP_REFRESH_QUEUE = 'mp-refresh-queue';

export async function queuedMps(db: SupabaseClient): Promise<number[]> {
  const { data, error } = await db.from('sync_cursor').select('cursor').eq('route', MP_REFRESH_QUEUE).maybeSingle();
  if (error) throw new Error(`mp-refresh-queue read: ${error.message}`);
  const ids = (data?.cursor as { ids?: unknown[] } | null)?.ids ?? [];
  return ids.filter((n): n is number => Number.isInteger(n));
}

// Removes the ids handled from the queue (ids added meanwhile stay).
export async function dequeueMps(db: SupabaseClient, done: number[]): Promise<void> {
  const left = (await queuedMps(db)).filter((id) => !done.includes(id));
  const { error } = left.length
    ? await db.from('sync_cursor').upsert({ route: MP_REFRESH_QUEUE, cursor: { ids: left }, updated_at: new Date().toISOString() }, { onConflict: 'route' })
    : await db.from('sync_cursor').delete().eq('route', MP_REFRESH_QUEUE);
  if (error) throw new Error(`mp-refresh-queue write: ${error.message}`);
}


// The name key the MP page matches ministers' meetings on (app/mps/[id]/page.tsx, mpNameKey).
export const mpNameKey = (name: string) =>
  name.replace(/^(?:Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr|The )\s+/i, '').replace(/\s+(?:MP|QC|KC|CBE|OBE|MBE)\s*$/i, '').trim();

// mpsDueByDate (the MPs whose page changed with the date) was removed on 16 Nov 2026 (F07, ENTRY 134): those parts are
// worked out in the browser now.

// MPs whose page lists a minister's meetings or hospitality: the page matches minister_name containing the MP's name
// key (app/mps/[id]/page.tsx), so the same match is made here.
export async function mpsForMinisterNames(db: SupabaseClient, ministerNames: string[]): Promise<number[]> {
  const names = [...new Set(ministerNames.map((n) => n.toLowerCase().trim()).filter(Boolean))];
  if (!names.length) return [];
  const { data: mps, error } = await db.from('mps').select('member_id, display_name, name').eq('current_member', true);
  if (error) throw new Error(`mps: ${error.message}`);
  const out: number[] = [];
  for (const m of mps ?? []) {
    const key = mpNameKey(String(m.display_name || m.name || '')).toLowerCase();
    if (key && names.some((n) => n.includes(key))) out.push(m.member_id as number);
  }
  return out;
}
