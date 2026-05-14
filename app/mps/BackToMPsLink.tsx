'use client';

import { useSearchParams } from 'next/navigation';

// Tiny client island so the MP profile page can stay statically
// prerendered. Reads ?from=<party> at runtime in the user's browser
// and builds a back link that opens that party section on /mps.
export default function BackToMPsLink() {
  const params = useSearchParams();
  const from = params.get('from');
  const href = from ? `/mps?expand=${encodeURIComponent(from)}#mps-list` : '/mps';

  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        color: '#14100d',
        textDecoration: 'none',
        fontSize: '16px',
        transform: 'rotate(-0.2deg)',
      }}
    >
      ← Back to all MPs
    </a>
  );
}
