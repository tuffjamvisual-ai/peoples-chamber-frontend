import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PressListing from '../../PressListing';

// One day's press releases (F04 batch 3, pattern P): static, built on its first visit and rebuilt only when the press_releases
// tag is refreshed or on a deploy. Only a real calendar date; anything else is 404. Not indexed; the canonical is the latest day.
export const revalidate = false;
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  title: 'Press Releases',
  description:
    'The full archive of UK Government department press releases from 2007 to today, and House of Commons select committee reports, each with its full text.',
  alternates: { canonical: '/transparency/press-releases' },
  robots: { index: false, follow: true },
};

export default async function PressReleasesDay({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) notFound();
  return <PressListing sp={{ date }} strict />;
}
