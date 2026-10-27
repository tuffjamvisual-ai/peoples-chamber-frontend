// Newsletter sign-up and the landing page for the confirm and unsubscribe links
// (audit reassessment, 16 Oct 2026).

import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import NewsletterSignup from '../components/NewsletterSignup';
import MarkNewsletterSubscribed from '../components/MarkNewsletterSubscribed';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'Open Govt Weekly: the week’s investigations, overlooked documents and public spending stories, in one weekly email. Sign up for the first issue.',
  alternates: { canonical: '/newsletter' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const FONT = "var(--font-special-elite), monospace";

const MESSAGES: Record<string, { head: string; body: string }> = {
  confirmed: { head: 'You are subscribed.', body: 'Thank you. You will get the first issue of Open Govt Weekly. Every email has a link to unsubscribe in one click.' },
  unsubscribed: { head: 'You have been unsubscribed.', body: 'You will not receive any more newsletters. You can sign up again below at any time.' },
  invalid: { head: 'That link did not work.', body: 'It may have been copied incompletely. Enter your email below and we will send a new one.' },
  error: { head: 'Something went wrong.', body: 'Please try the link again in a few minutes.' },
};

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const msg = status ? MESSAGES[status] : undefined;
  return (
    <OpenGovShell pageStamp="Newsletter">
      <article style={{ fontFamily: FONT, color: INK, maxWidth: '640px', padding: 'clamp(15px, 2vw, 24px) 0' }}>
        {status === 'confirmed' && <MarkNewsletterSubscribed />}
        {msg && (
          <div role="status" style={{ margin: '0 0 24px', padding: '12px 14px', border: `1.5px solid ${ACCENT}`, borderLeft: `5px solid ${ACCENT}`, background: 'rgba(122,22,18,0.05)' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '17px' }}>{msg.head}</p>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6 }}>{msg.body}</p>
          </div>
        )}
        <h1 style={{ fontFamily: FONT, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 'bold', margin: '0 0 12px' }}>Open Govt Weekly</h1>
        <p style={{ fontSize: '17px', lineHeight: 1.7, margin: '0 0 10px' }}>What government announced. What the evidence shows. What happened next.</p>
        <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 10px' }}>The most important investigations, overlooked documents, questionable claims and public spending stories from the week.</p>
        <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 10px', fontWeight: 700 }}>A weekly email. Sign up now for the first issue.</p>
        <NewsletterSignup source="newsletter-page" />
      </article>
    </OpenGovShell>
  );
}
