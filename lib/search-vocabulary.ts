// The words of our own titles for /search's "Did you mean" (SR1, 8 Nov 2026; lib/search-suggest.ts): every bill title,
// every MP's name and every published report's headline, read at most once a day. A failed read gives no vocabulary,
// so no suggestion, never an error.
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';
import { allEditorials } from '@/lib/editorials-source';
import { buildVocabulary, type Vocabulary } from '@/lib/search-suggest';

const titles = unstable_cache(async (): Promise<string[]> => {
  const [bills, mps, reports] = await Promise.all([
    readAll<{ title: string | null }>(() => supabase.from('bill'), { columns: 'id, title', orderBy: 'id', label: 'search vocabulary (bills)' }),
    readAll<{ name: string | null; display_name: string | null }>(() => supabase.from('mps'), { columns: 'member_id, name, display_name', orderBy: 'member_id', label: 'search vocabulary (mps)' }),
    allEditorials(),
  ]);
  return [
    ...bills.map((b) => b.title ?? ''),
    ...mps.map((m) => m.display_name || m.name || ''),
    ...reports.map((r) => r.headline),
  ].filter(Boolean);
}, ['search-vocabulary'], { revalidate: 86400 });

export async function searchVocabulary(): Promise<Vocabulary> {
  try {
    return buildVocabulary(await titles());
  } catch (e) {
    console.error('search vocabulary:', e instanceof Error ? e.message : String(e));
    return new Map();
  }
}
