import { goneDebateIds, leaveOut } from '@/lib/gone-debates';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import DebatesListing, { DEBATE_COLUMNS, PER_PAGE, SECTIONS, type DebateRow } from '../DebatesListing';
import { listPath, pastTheEnd, searchKey, slug } from '@/lib/list-path';
import { cachedQuery } from '@/lib/tagged-read';
import { tableTags } from '@/lib/source-tags';
import { ilikeWords } from '@/lib/ilike-words';
import { supabase } from '@/lib/supabase';

// Search results for /debates?q= (next.config.ts rewrites that address here; A16 exception: search results, title text over
// the debates table). Section and page are read as the page read them before. Not indexed; the canonical is /debates.
// The page answers each visit, but its data is read only from the tagged cache (owner's rule for the exceptions, ENTRY 187;
// Cowork ENTRY 226): one entry per normalised search, section and page under the debates table's tag, so every entry is
// dropped at the next debates sync. Fewer than two characters goes back to the static list with no read.
export const metadata: Metadata = {
  title: 'Commons Debates',
  description:
    'Every debate held in the House of Commons since the July 2024 general election. Read the full record on site, by date and section.',
  alternates: { canonical: '/debates' },
  robots: { index: false, follow: true },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function DebatesSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const section = SECTIONS.includes(one(sp.section)) ? one(sp.section) : null;
  const q = one(sp.q).trim();
  const pageNum = Math.max(1, parseInt(one(sp.page) || '1', 10) || 1);
  const key = searchKey(q);
  const list = listPath('/debates', { section: section && slug(section), page: String(pageNum) });
  if (!key) permanentRedirect(list);
  if (key.length < 2) redirect(list); // one character: the list, with no read (ENTRY 226); 307, so it is not kept by browsers
  // One page at most. The words go through ilikeWords, so % and _ in a search are not patterns (F05). Same columns and order
  // as the list. A page past the end is refused by the database (416) and answers 404.
  const from = (pageNum - 1) * PER_PAGE;
  let found;
  try {
    const gone = leaveOut(await goneDebateIds()); // ENTRY 649 (4): as the list
    found = await cachedQuery(['debates-search-v2', section ?? '', key, pageNum], tableTags('debates'), () => {
      let query = supabase.from('debates').select(DEBATE_COLUMNS, { count: 'exact' })
        .order('sitting_date', { ascending: false }).order('title', { ascending: true }).range(from, from + PER_PAGE - 1);
      if (section) query = query.eq('section', section);
      if (gone) query = query.not('id', 'in', gone);
      const pattern = ilikeWords(key);
      if (pattern) query = query.ilike('title', pattern);
      return query;
    });
  } catch (e) {
    if (pastTheEnd(e)) notFound();
    throw e;
  }
  const { data, count } = found;
  return <DebatesListing section={section} q={q} pageNum={pageNum} found={{ data: data as DebateRow[] | null, count }} />;
}
