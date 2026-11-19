// Newsletter sign-up and the landing page for the confirm and unsubscribe links
// (audit reassessment, 16 Oct 2026). Static (F04 batch 2): the links now land on /newsletter/status/<status>; an old
// /newsletter?status= address moves there (next.config.ts).

import type { Metadata } from 'next';
import NewsletterView from './NewsletterView';

export const revalidate = false;

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'opengovt Weekly: the week’s investigations, overlooked documents and public spending stories, by email every Sunday.',
  alternates: { canonical: '/newsletter' },
};

export default function NewsletterPage() {
  return <NewsletterView />;
}
