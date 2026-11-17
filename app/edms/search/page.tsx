import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import EdmsListing, { type Search } from '../EdmsListing';
import { listPath } from '@/lib/list-path';

// Search results for /edms?q= (next.config.ts rewrites that address here; A16 exception: search results, title or EDM number).
// The other choices are read as the page read them before; the search filters the cached list in memory (no database read per
// search). Not indexed; the canonical is /edms. An empty search goes to the same choices without it.
export const metadata: Metadata = {
  title: 'Early day motions in the Commons',
  description: 'Every early day motion tabled in the House of Commons since the July 2024 general election, with its text, sponsors, signatures and amendments.',
  alternates: { canonical: '/edms' },
  robots: { index: false, follow: true },
};

const KEYS = ['state', 'prayer', 'q', 'sort', 'member', 'role', 'show'] as const;

export default async function EdmsSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s: Search = {};
  for (const k of KEYS) { const v = sp[k]; const one = Array.isArray(v) ? v[0] : v; if (one) s[k] = one; }
  if (!(s.q ?? '').trim()) { const { q: _q, ...rest } = s; void _q; permanentRedirect(listPath('/edms', rest)); }
  return <EdmsListing s={s} />;
}
