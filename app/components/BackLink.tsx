'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent } from 'react';
import { cameFromThisSite } from './NavTrail';

// The back arrow (owner, 10 Nov 2026, T1-5u: "one back arrow, the same on every page"). Every inner page shows the same
// "←" in the same place, the top left of the page folder (opengov-shell.css .og-back), with the accessible name "Back" and a
// 44px tap area. A click goes to the previous page when the reader came from another opengovt page in this tab
// (NavTrail.tsx); otherwise, and with JavaScript off, it is a plain link one level up (`fallbackHref`).
//
// `label`, `className` and `style` are accepted from the older call sites but no longer change anything, so no page can
// show a different back link.

type Props = {
  fallbackHref: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export default function BackLink({ fallbackHref }: Props) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Modifier and middle clicks keep the browser's own behaviour (open the one-level-up page in a new tab).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!cameFromThisSite()) return; // the plain link: one level up
    e.preventDefault();
    router.back();
  };

  return (
    <a
      href={fallbackHref}
      rel={/^\/(login|account)(\?|$)/.test(fallbackHref) ? 'nofollow' : undefined}
      onClick={handleClick}
      aria-label="Back"
      className="og-back no-hover-scale"
      data-og-back=""
    >
      <span aria-hidden="true">←</span>
    </a>
  );
}
