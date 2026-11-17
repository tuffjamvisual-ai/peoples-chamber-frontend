import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import DivisionsListing from '../../DivisionsListing';

// /divisions/page/N: page 2 onwards of /divisions (A16: the page number in the path, so each page is static). Each page
// names itself canonical (owner, 31 Oct 2026). Old /divisions?page=N addresses redirect here (proxy.ts, lib/list-path.ts).
export const revalidate = false; // A16: rebuilt only when commons_divisions_fts or the division tables' tags are refreshed
export function generateStaticParams() { return []; }

const pageOf = (raw: string) => (/^[1-9][0-9]{0,3}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const n = pageOf((await params).page);
  return {
    title: 'Commons Divisions',
    description: 'Recorded votes in the House of Commons back to October 2004, with how the House divided on each.',
    alternates: { canonical: n ? `/divisions/page/${n}` : '/divisions' },
  };
}

export default async function DivisionsPageN({ params }: { params: Promise<{ page: string }> }) {
  const n = pageOf((await params).page);
  if (!n) notFound();
  if (n === 1) permanentRedirect('/divisions');
  return <DivisionsListing pageNum={n} />;
}
