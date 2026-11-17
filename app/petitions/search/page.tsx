import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import PetitionsListing, { type Search } from '../PetitionsListing';
import { listPath } from '@/lib/list-path';

// Search results for /petitions?q= (next.config.ts rewrites that address here; A16 exception: search results, petition title
// text over the cached list, no database read per search). The other choices are read as the page read them before. Not
// indexed; the canonical is /petitions. An empty search goes to the same choices without it.
export const metadata: Metadata = {
  title: 'Petitions that reached 10,000 signatures',
  description: 'Every UK Parliament petition since the July 2024 general election with 10,000 signatures or more: the government response, any debate, and signatures by constituency.',
  alternates: { canonical: '/petitions' },
  robots: { index: false, follow: true },
};

const KEYS = ['state', 'responded', 'debated', 'q', 'constituency'] as const;

export default async function PetitionsSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s: Search = {};
  for (const k of KEYS) { const v = sp[k]; const one = Array.isArray(v) ? v[0] : v; if (one) s[k] = one; }
  if (!(s.q ?? '').trim()) { const { q: _q, ...rest } = s; void _q; permanentRedirect(listPath('/petitions', rest)); }
  return <PetitionsListing s={s} />;
}
