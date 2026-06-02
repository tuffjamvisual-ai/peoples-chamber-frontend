'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent } from 'react';

// Shared back-link. Default behaviour: go to the page the user came
// from via browser history. If they landed on this page directly
// (history length 1 — typically external referrer like Google, an
// inbound social-media link, or a fresh tab) it falls through to the
// hardcoded `fallbackHref` so the link is never a dead-end click.
//
// Replaces 26 hardcoded `← Back to X` anchors across the site so the
// reader's back-link always honours their actual reading path: arrive
// from /your-tax-pound → /departments/treasury → click Back → land
// back on /your-tax-pound, not always on /departments.

type Props = {
  fallbackHref: string;
  label: string;
  className?: string;
  style?: CSSProperties;
};

export default function BackLink({ fallbackHref, label, className, style }: Props) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Honour modifier-click (cmd/ctrl/middle) so the user can still
    // open the fallback page in a new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <a href={fallbackHref} onClick={handleClick} className={className} style={style}>
      {label}
    </a>
  );
}
