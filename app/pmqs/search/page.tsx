import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import PmqsBody, { PMQS_META } from '../PmqsBody';
import type { PmqsFilters } from '../EverySession';
import { listPath } from '@/lib/list-path';
import { homeBox } from '@/lib/search-terms';

// Search results for /pmqs?q= (next.config.ts rewrites that address here; A16 exception: search results, words in every PMQs
// contribution, read per search). The other choices are read as the page read them before. Not indexed; the canonical is
// /pmqs. An empty search (the form sends q= with the selects) goes to the same choices without it.
export const metadata: Metadata = { ...PMQS_META, robots: { index: false, follow: true } };

export default async function PmqsSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters: PmqsFilters = Object.fromEntries((['q', 'pm', 'year', 'page', 'dpage'] as const).map((k) => [k, typeof sp[k] === 'string' ? sp[k] : undefined]));
  if (!(filters.q ?? '').trim()) { const { q: _q, ...rest } = filters; void _q; permanentRedirect(listPath('/pmqs', rest)); }
  // The search term log (Cowork ENTRY 375 item 2): this box, or the homepage's when the homepage form sent via=home.
  return <PmqsBody filters={filters} logBox={homeBox('pmqs', sp.via)} />;
}
