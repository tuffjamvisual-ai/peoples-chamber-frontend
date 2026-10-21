import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import BillsListing from '../../BillsListing';

// /bills/page/N: page 2 onwards of /bills, built on first visit and cached like /bills (10 minutes, and refreshed by
// the bill syncs). /bills/page/1 is /bills. The canonical stays /bills, as it was for the old ?page=N addresses.
export const revalidate = 600;
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: "UK Parliament Bills Tracker, Live Stages, Votes & Acts",
  alternates: { canonical: '/bills' },
};

export default async function BillsPageN({ params }: { params: Promise<{ page: string }> }) {
  const { page: raw } = await params;
  if (!/^[1-9][0-9]{0,3}$/.test(raw)) notFound();
  const page = Number(raw);
  if (page === 1) permanentRedirect('/bills');
  return <BillsListing page={page} />;
}
