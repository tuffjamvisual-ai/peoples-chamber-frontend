'use client';

// Newsletter sign-up at the end of an article (26 Oct 2026, report 80): search visitors land on articles, which had
// no sign-up of their own (only the strip, which can be closed for 30 days). Shown only to readers who are not signed
// in, the same rule as NewsletterStrip (!authLoading && !user). Until the sign-in check has finished the box keeps
// its space but is invisible, so it never pushes the content below it when it appears; a signed-in member's page
// drops it once the check finishes.

import { useAuth } from '../context/AuthContext';
import NewsletterSignup from './NewsletterSignup';

const INK = '#14100d';
const ACCENT = '#7a1612';
const FONT = 'var(--font-special-elite), monospace';

export default function ArticleEndSignup({ source }: { source: string }) {
  const { user, authLoading } = useAuth();
  if (!authLoading && user) return null;
  return (
    <section
      aria-labelledby={`signup-head-${source}`}
      aria-hidden={authLoading || undefined}
      style={{ visibility: authLoading ? 'hidden' : 'visible', margin: '32px 0', padding: '18px 0', borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, fontFamily: FONT, color: INK }}
    >
      <h2 id={`signup-head-${source}`} style={{ fontFamily: FONT, fontSize: '20px', fontWeight: 'bold', color: ACCENT, margin: '0 0 6px', lineHeight: 1.3 }}>
        Get the Open Govt Weekly
      </h2>
      <p style={{ fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
        The week&rsquo;s investigations, overlooked documents and public spending stories, in one email. Free, and you can unsubscribe at any time.
      </p>
      <NewsletterSignup source={source} minFontPx={15} />
    </section>
  );
}
