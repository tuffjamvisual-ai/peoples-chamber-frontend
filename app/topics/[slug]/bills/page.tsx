import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopic, topics } from '@/lib/topics';
import TopicBillsListing from './TopicBillsListing';

// /topics/[slug]/bills: page 1 of a topic's full list of bills and Acts; page 2 onwards is /topics/[slug]/bills/page/N.
// Cached for a day, like the topic page.
export const revalidate = 86400;

export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) return { title: 'Topic' };
  return {
    title: `${t.title}: Bills and Acts`,
    description: `Every bill and Act on ${t.title.toLowerCase()} in the UK Parliament, most recently updated first.`,
    alternates: { canonical: `/topics/${slug}/bills` },
  };
}

export default async function TopicBillsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getTopic(slug)) notFound();
  return <TopicBillsListing slug={slug} page={1} />;
}
