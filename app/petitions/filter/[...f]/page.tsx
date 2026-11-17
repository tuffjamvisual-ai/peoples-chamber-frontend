import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import PetitionsListing from '../../PetitionsListing';
import { listChoices, listPath } from '@/lib/list-path';
import { petitionsInConstituency } from '@/lib/petition-pages';

// /petitions by state, responded, debated and constituency (F04 batch 3, pattern P+): each variant static, built on its first
// visit and rebuilt only when the petitions tags are refreshed or on a deploy. Every value is checked so the cache stays
// bounded: state open|closed, responded and debated 1, a constituency we hold signatures for; anything else 404. Not indexed.
export const revalidate = false;
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Petitions that reached 10,000 signatures',
  description: 'Every UK Parliament petition since the July 2024 general election with 10,000 signatures or more: the government response, any debate, and signatures by constituency.',
  alternates: { canonical: '/petitions' },
  robots: { index: false, follow: true },
};

export default async function PetitionsFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  const { f } = await params;
  const c = listChoices('/petitions', f);
  if (!c) notFound();
  if (c.state && c.state !== 'open' && c.state !== 'closed') notFound();
  if ((c.responded && c.responded !== '1') || (c.debated && c.debated !== '1')) notFound();
  if (c.constituency && (!/^[A-Z][0-9]{8}$/.test(c.constituency) || !(await petitionsInConstituency(c.constituency))?.name)) notFound();
  const canon = listPath('/petitions', c);
  if (canon !== `/petitions/filter/${f.join('/')}`) permanentRedirect(canon);
  return <PetitionsListing s={c} />;
}
