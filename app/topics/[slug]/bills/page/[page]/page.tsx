import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTopic } from '@/lib/topics';
import TopicBillsListing from '../../TopicBillsListing';

// /topics/[slug]/bills/page/N: page 2 onwards, built on first visit and cached for a day. Page 1 is /topics/[slug]/bills.
export const revalidate = 86400;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug, page } = await params;
  const t = getTopic(slug);
  if (!t) return { title: 'Topic' };
  return {
    title: `${t.title}: Bills and Acts, page ${page}`,
    alternates: { canonical: `/topics/${slug}/bills/page/${page}` },
  };
}

export default async function TopicBillsPageN({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page: raw } = await params;
  if (!getTopic(slug) || !/^[1-9][0-9]{0,3}$/.test(raw)) notFound();
  const page = Number(raw);
  if (page === 1) permanentRedirect(`/topics/${slug}/bills`);
  return <TopicBillsListing slug={slug} page={page} />;
}
