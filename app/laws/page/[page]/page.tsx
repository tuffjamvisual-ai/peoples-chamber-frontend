import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import LawsListing from '../../LawsListing';

// /laws/page/N: page 2 onwards of /laws (F04 batch 2), built on first visit and rebuilt only when the bill tag is
// refreshed. /laws/page/1 is /laws. The canonical stays /laws, as it was for the old ?page=N addresses.
export const revalidate = false; // A16: rebuilt only when its data changes (bill tag), or on a deploy
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'UK Laws, every Act of Parliament',
  description:
    'Browse Acts of the UK Parliament that have received Royal Assent, searchable, filterable, with original sponsor and stage history.',
  alternates: { canonical: '/laws' },
};

export default async function LawsPageN({ params }: { params: Promise<{ page: string }> }) {
  const { page: raw } = await params;
  if (!/^[1-9][0-9]{0,3}$/.test(raw)) notFound();
  const page = Number(raw);
  if (page === 1) permanentRedirect('/laws');
  return <LawsListing page={page} />;
}
