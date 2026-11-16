// F09 proof (read only): the MP donations route's keyword votes, old query (119 ILIKE patterns) against the new read
// (member_id, then the keywords in code). Same ids in the same order? Time of each.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readAllById } from '../../lib/read-all';
import { ALL_VOTE_KEYWORDS } from '../../lib/donor-sectors';
config({ path: '.env.local', quiet: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const cols = 'id, division_title, division_date, division_date_only, division_number, vote_type, is_rebellion, division_id';
(async () => {
  for (const memberId of [172, 1510, 4356]) {
    let t = Date.now();
    const orClause = ALL_VOTE_KEYWORDS.map((kw) => `division_title.ilike.%${kw.replace(/[%_,]/g, '')}%`).join(',');
    const { data: oldRows, error } = await db.from('mp_division_votes').select(cols).eq('member_id', memberId).or(orClause).in('vote_type', ['aye', 'no', 'both']).order('division_date', { ascending: false }).limit(500);
    if (error) throw error;
    const tOld = Date.now() - t; t = Date.now();
    const kws = ALL_VOTE_KEYWORDS.map((kw) => kw.replace(/[%_,]/g, '').toLowerCase()).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await readAllById<{ id: number; division_title: string | null; division_date: string | null }>(() => db.from('mp_division_votes'), { columns: cols, filter: (q: any) => q.eq('member_id', memberId).in('vote_type', ['aye', 'no', 'both']), label: 'votes' });
    const newRows = all.filter((v) => kws.some((k) => (v.division_title || '').toLowerCase().includes(k))).sort((a, b) => (b.division_date || '').localeCompare(a.division_date || '') || a.id - b.id).slice(0, 500);
    const tNew = Date.now() - t;
    const oldIds = (oldRows ?? []).map((r: { id: number }) => r.id), newIds = newRows.map((r) => r.id);
    const sameSet = oldIds.length === newIds.length && oldIds.every((id) => newIds.includes(id));
    const sameOrder = JSON.stringify(oldIds) === JSON.stringify(newIds);
    console.log(`member ${memberId}: all votes ${all.length}; keyword votes old ${oldIds.length} in ${tOld} ms, new ${newIds.length} in ${tNew} ms; same rows ${sameSet}, same order ${sameOrder}`);
  }
})().catch((e) => { console.error('FAILED: ' + (e instanceof Error ? e.message : JSON.stringify(e))); process.exit(1); });
