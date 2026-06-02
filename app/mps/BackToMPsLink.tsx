'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

// Tiny client island so the MP profile page can stay statically
// prerendered. Honours browser history first via router.back(); if
// the user landed on the MP page directly (history.length === 1,
// typically an external referrer like Google or a social link), it
// falls through to the previous default destination — the /mps
// listing, optionally expanded to the party group the user came from
// via the ?from=<party> param.
//
// Reason for the fix (2026-06-02): the earlier site-wide BackLink
// roll-out missed this component because the MP profile page used
// its own custom back link instead of the shared one. Result was
// that clicking 'Back to all MPs' on /mps/<id> always dumped the
// user on /mps, even if they had arrived from /your-tax-pound or a
// dept page. Now matches the shared BackLink behaviour everywhere
// else in the dossier shell.
export default function BackToMPsLink() {
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get('from');
  const fallbackHref = from
    ? `/mps?expand=${encodeURIComponent(from)}#mps-list`
    : '/mps';

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Honour modifier-click (cmd/ctrl/shift/middle) so the user can
    // still open the fallback in a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
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
