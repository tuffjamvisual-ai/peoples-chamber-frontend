import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import LordsListing from '../../LordsListing';

// /lords/page/N: page 2 onwards of the /lords list on phones and tablets (F04 batch 2), built on first visit and rebuilt by
// the peers tag. /lords/page/1 is /lords. The canonical stays /lords. A page past the end is a 404 (LordsListing; ENTRY 364).
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'House of Lords',
  description: 'Every member of the House of Lords: party, type of peerage and when they joined, with their posts, votes and written questions.',
  alternates: { canonical: '/lords' },
};

export default async function LordsPageN({ params }: { params: Promise<{ page: string }> }) {
  const { page: raw } = await params;
  if (!/^[1-9][0-9]{0,3}$/.test(raw)) notFound();
  const page = Number(raw);
  if (page === 1) permanentRedirect('/lords');
  return <LordsListing page={page} />;
}
