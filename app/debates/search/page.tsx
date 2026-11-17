import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import DebatesListing, { DEBATE_COLUMNS, PER_PAGE, SECTIONS, type DebateRow } from '../DebatesListing';
import { listPath, pastTheEnd, slug } from '@/lib/list-path';
import { ilikeWords } from '@/lib/ilike-words';
import { supabase } from '@/lib/supabase';

// Search results for /debates?q= (next.config.ts rewrites that address here; A16 exception: search results, title text over
// the debates table). Section and page are read as the page read them before. Not indexed; the canonical is /debates.
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
  if (!q) permanentRedirect(listPath('/debates', { section: section && slug(section), page: String(pageNum) }));
  // Read per request, one page at most: one cache entry per visitor search would grow without bound (Cowork ENTRY 181, F05).
  // The words go through ilikeWords, so % and _ in a search are not patterns (F05). Same columns and order as the list.
  const from = (pageNum - 1) * PER_PAGE;
  let query = supabase.from('debates').select(DEBATE_COLUMNS, { count: 'exact' })
    .order('sitting_date', { ascending: false }).order('title', { ascending: true }).range(from, from + PER_PAGE - 1);
  if (section) query = query.eq('section', section);
  const pattern = ilikeWords(q);
  if (pattern) query = query.ilike('title', pattern);
  const { data, count, error } = await query;
  if (error) { if (pastTheEnd(error.message)) notFound(); throw new Error(`/debates/search: ${error.message}`); }
  return <DebatesListing section={section} q={q} pageNum={pageNum} found={{ data: data as DebateRow[] | null, count }} />;
}
