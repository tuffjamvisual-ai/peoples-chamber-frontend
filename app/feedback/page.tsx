import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { Suspense } from 'react';
import FeedbackForm from './FeedbackForm';
import { BackLinkFromAddress, FeedbackFormFromAddress } from './FeedbackFromAddress';

// User feedback (owner's brief, 2 Nov 2026), the same pattern as the commission form. Linked from the footer on every
// page as /feedback?from=<path>. Not indexed; not in the sitemap. Static (F04 batch 2, T2's f04-32-routes.md B1.9): ?from=
// is read in the browser, which the form needs anyway (it sends by fetch), and cleaned again on the server.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Tell opengovt what is wrong, what could be better, or anything else.',
  alternates: { canonical: '/feedback' },
  robots: { index: false, follow: true },
};

const INK = '#14100d';
const ACCENT = '#7a1612';

const BACK_STYLE = { display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' } as const;

export default function FeedbackPage() {
  return (
    <OpenGovShell pageStamp="Feedback">
      <Suspense fallback={<BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={BACK_STYLE} />}>
        <BackLinkFromAddress label="← Back" className="no-hover-scale" style={BACK_STYLE} />
      </Suspense>

      <header style={{ marginBottom: '4%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Feedback
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Tell us what is wrong, what could be better, or anything else. We read every message.
        </p>
      </header>

      <section aria-label="Feedback form" style={{ marginBottom: '4%' }}>
        <Suspense fallback={<FeedbackForm from="" />}><FeedbackFormFromAddress /></Suspense>
      </section>

      <p style={{ fontSize: '15px', lineHeight: 1.7, color: INK }}>
        Our <Link href="/privacy" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>privacy policy</Link> explains how we look after personal information.
      </p>
    </OpenGovShell>
  );
}
