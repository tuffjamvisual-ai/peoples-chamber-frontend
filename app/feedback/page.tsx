import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import FeedbackForm from './FeedbackForm';
import { cleanFrom } from '@/lib/feedback';

// User feedback (owner's brief, 2 Nov 2026), the same pattern as the commission form. Linked from the footer on every
// page as /feedback?from=<path>. Not indexed; not in the sitemap.

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Tell opengovt what is wrong, what could be better, or anything else.',
  alternates: { canonical: '/feedback' },
  robots: { index: false, follow: true },
};

const INK = '#14100d';
const ACCENT = '#7a1612';

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await searchParams;
  const page = cleanFrom(Array.isArray(from) ? from[0] : from);
  return (
    <OpenGovShell pageStamp="Feedback">
      <BackLink
        fallbackHref={page || '/'}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Feedback
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Tell us what is wrong, what could be better, or anything else. We read every message.
        </p>
      </header>

      <section aria-label="Feedback form" style={{ marginBottom: '4%' }}>
        <FeedbackForm from={page} />
      </section>

      <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK }}>
        Our <Link href="/privacy" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>privacy policy</Link> explains how we look after personal information.
      </p>
    </OpenGovShell>
  );
}
