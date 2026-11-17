import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PressListing from '../PressListing';

// Search results for /transparency/press-releases?q= (next.config.ts rewrites that address here; A16 exception: search
// results, ILIKE over the archive since 2007). Not indexed; the canonical is the latest day. An empty search goes back.
export const metadata: Metadata = {
  title: 'Press Releases',
  description:
    'The full archive of UK Government department press releases from 2007 to today, and House of Commons select committee reports, each with its full text.',
  alternates: { canonical: '/transparency/press-releases' },
  robots: { index: false, follow: true },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PressReleasesSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q);
  if (!(q ?? '').trim()) redirect('/transparency/press-releases');
  return <PressListing sp={{ q, page: one(sp.page) }} />;
}
