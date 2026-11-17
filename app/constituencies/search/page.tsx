import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ConstituenciesListing from '../ConstituenciesListing';

// Search results for /constituencies?q= (next.config.ts rewrites that address here; A16 exception: search results, a postcode is
// looked up on postcodes.io per search). Not indexed; the canonical is /constituencies. An empty search goes back to the list.
export const metadata: Metadata = {
  title: 'UK constituencies: MPs and election results',
  description: 'All 650 UK parliamentary constituencies by nation and region: the MP, the 2024 result, byelections, petitions and councils.',
  alternates: { canonical: '/constituencies' },
  robots: { index: false, follow: true },
};

export default async function ConstituenciesSearch({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = ((Array.isArray(raw) ? raw[0] : raw) ?? '').trim().slice(0, 100);
  if (!q) redirect('/constituencies');
  return <ConstituenciesListing q={q} />;
}
