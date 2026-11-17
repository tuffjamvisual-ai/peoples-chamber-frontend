import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { fitTitle } from '@/lib/seo-title';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import TreatiesListing from '../../TreatiesListing';

// /treaties/page/N: page 2 onwards of /treaties (F04 batch 2), built on first visit and rebuilt when the treaty tables'
// tags are refreshed. /treaties/page/1 is /treaties. The canonical stays /treaties, as it was for the old ?page=N.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: fitTitle('Treaties laid before Parliament', 'Treaties'),
  description: PAGE_DESCRIPTIONS['/treaties'],
  alternates: { canonical: '/treaties' },
};

export default async function TreatiesPageN({ params }: { params: Promise<{ page: string }> }) {
  const { page: raw } = await params;
  if (!/^[1-9][0-9]{0,3}$/.test(raw)) notFound();
  const page = Number(raw);
  if (page === 1) permanentRedirect('/treaties');
  return <TreatiesListing page={page} />;
}
