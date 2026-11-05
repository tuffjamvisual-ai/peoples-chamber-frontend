'use client';

// Shown when a page cannot be rendered, for example when the database cannot be read (Stage D, owner, 5 Nov 2026). It
// keeps the site frame. An error here, or in the root layout, falls through to app/global-error.tsx.
import Link from 'next/link';
import OpenGovShell from './components/OpenGovShell';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default function Error() {
  return (
    <OpenGovShell pageStamp="Unavailable">
      <meta name="robots" content="noindex, nofollow" />
      <article style={{ fontFamily: MONO, color: INK, padding: 'clamp(15px, 2vw, 24px) 0' }}>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 'bold', margin: '0 0 12px' }}>
          This page could not be loaded
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: '0 0 20px' }}>
          Please try again shortly.
        </p>
        <p style={{ fontSize: '16px', margin: 0 }}>
          <Link href="/" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Go to the homepage</Link>
        </p>
      </article>
    </OpenGovShell>
  );
}
