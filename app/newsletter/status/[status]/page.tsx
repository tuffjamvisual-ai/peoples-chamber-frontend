import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import NewsletterView, { MESSAGES } from '../../NewsletterView';

// /newsletter/status/<confirmed|unsubscribed|invalid|error>: where the confirm email link and the unsubscribe form land (F04
// batch 2). Four static pages built with the site; any other value is a 404. Not indexed; the canonical is /newsletter.
export const revalidate = false;
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(MESSAGES).map((status) => ({ status })); }

export const metadata: Metadata = { title: 'Newsletter', alternates: { canonical: '/newsletter' }, robots: { index: false, follow: true } };

export default async function NewsletterStatusPage({ params }: { params: Promise<{ status: string }> }) {
  const { status } = await params;
  if (!MESSAGES[status]) notFound();
  return <NewsletterView status={status} />;
}
