import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import YearListing, { yearMetadata, yearOf } from '../../../YearListing';
import { yearHref } from '@/lib/division-links';

// /divisions/year/<yyyy>/page/<n>: page 2 onwards of a year's divisions (F04 batch 2), built on first visit and rebuilt by
// the division tags. Page 1 is /divisions/year/<yyyy>.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

type Params = { year: string; page: string };
const pageOf = (raw: string) => (/^[1-9][0-9]{0,3}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { year, page } = await params;
  const n = pageOf(page);
  if (!n) notFound();
  return yearMetadata(year, n);
}

export default async function DivisionYearPageN({ params }: { params: Promise<Params> }) {
  const { year, page } = await params;
  const n = pageOf(page);
  const y = yearOf(year);
  if (!n || y == null) notFound();
  if (n === 1) permanentRedirect(yearHref(y));
  return <YearListing rawYear={year} page={n} />;
}
