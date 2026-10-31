'use client';

// Error boundary for one recommendation's page (owner, 31 Oct 2026): if the page cannot load (a database read failed
// or timed out), the reader gets a short plain message, a way to try again and a link back to the tracker, not the
// framework's default error page. A page already cached keeps showing its last good version; this shows only when a
// page is built for the first time and its read fails.

import Link from 'next/link';
import { useEffect } from 'react';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default function RecommendationError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error('[recommendations] detail page failed to load:', error);
  }, [error]);

  return (
    <main style={{ maxWidth: '46em', margin: '0 auto', padding: '48px 20px', color: INK, fontFamily: MONO }}>
      <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '14px' }}>Recommendation</h1>
      <p style={{ fontSize: '17px', lineHeight: 1.7, marginBottom: '20px' }}>
        This page could not load just now. Please try again in a minute.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => retry()}
          style={{ fontFamily: MONO, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 16px', border: `1px solid ${ACCENT}`, borderRadius: '3px', background: ACCENT, color: '#fff', cursor: 'pointer' }}
        >
          Try again
        </button>
        <Link href="/recommendations" style={{ fontSize: '16px', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          Back to all recommendations
        </Link>
      </div>
    </main>
  );
}
