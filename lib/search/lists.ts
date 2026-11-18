// Council and MP name lists for the search boxes that ask the server (SEARCH-ALL batch 2, Cowork ENTRY 326): the councils
// search (/api/councils/search, used by CouncilSearch and AreaSearch, and /councils/search with no script) and Find your
// MP (/api/mps/search). Each list is small (382 councils, 650 MPs), read once into a shared cache (a day, refreshed by its
// table's tag) and searched in memory with lib/search/words.ts: every word in any order at word starts, a one letter typo
// only when nothing matches exactly, a name typed whole first. Replaces the 'words in order' ilike for these boxes.
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { tableTags } from '@/lib/source-tags';
import { wordsOf, searchList, type Fielded } from '@/lib/search/words';

export type CouncilName = { slug: string; name: string; short_name: string | null; type_label: string | null; country: string | null };
export type MpName = { member_id: number; name: string; constituency: string | null; party: string | null };

const councilList = unstable_cache(async (): Promise<CouncilName[]> => {
  const { data, error } = await supabase.from('councils').select('slug, name, short_name, type_label, country').not('gss_code', 'is', null).order('name').limit(1000);
  if (error) throw new Error(`councils list: ${error.message}`);
  return (data ?? []) as CouncilName[];
}, ['search-council-list-v1'], { revalidate: 86400, tags: tableTags('councils') });

// current_member null means current (rows before the column), as the old route had it.
const mpList = unstable_cache(async (): Promise<MpName[]> => {
  const { data, error } = await supabase.from('mps').select('member_id, name, constituency, party').not('current_member', 'eq', false).order('name').limit(1000);
  if (error) throw new Error(`mps list: ${error.message}`);
  return (data ?? []) as MpName[];
}, ['search-mp-list-v1'], { revalidate: 86400, tags: tableTags('mps') });

// A name typed whole first, then names starting with it, then the order searchList gave.
function closeFirst<T>(matches: T[], label: (x: T) => string, q: string): T[] {
  const want = wordsOf(q).join(' ');
  const close = (x: T) => { const l = wordsOf(label(x)).join(' '); return l === want ? 0 : l.startsWith(want) ? 1 : 2; };
  return matches.map((x, i) => [x, i] as const).sort((a, b) => close(a[0]) - close(b[0]) || a[1] - b[1]).map(([x]) => x);
}

const memo = new WeakMap<object, unknown>();
function fielded<T>(list: T[], fields: (x: T) => string[][]): Fielded<T>[] {
  let f = memo.get(list) as Fielded<T>[] | undefined;
  if (!f) { f = list.map((x) => ({ item: x, fields: fields(x) })); memo.set(list, f); }
  return f;
}

export async function searchCouncilNames(q: string, most: number): Promise<{ matches: CouncilName[]; typos: boolean }> {
  if (wordsOf(q).join('').length < 2) return { matches: [], typos: false };
  const list = await councilList();
  const { matches, typos } = searchList(fielded(list, (c) => [wordsOf(`${c.short_name ?? ''} ${c.name}`), wordsOf(`${c.type_label ?? ''} ${c.country ?? ''}`)]), q);
  return { matches: closeFirst(matches, (c) => c.short_name || c.name, q).slice(0, most), typos };
}

export async function searchMpNames(q: string, most: number): Promise<{ matches: MpName[]; typos: boolean }> {
  if (wordsOf(q).join('').length < 2) return { matches: [], typos: false };
  const list = await mpList();
  const { matches, typos } = searchList(fielded(list, (m) => [wordsOf(m.name), wordsOf(m.constituency ?? ''), wordsOf(m.party ?? '')]), q);
  return { matches: closeFirst(matches, (m) => m.name, q).slice(0, most), typos };
}
