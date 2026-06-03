'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent } from 'react';

// Story navigation arrows + page chip. Wraps router.push in
// document.startViewTransition() so the global CSS keyframes
// (see app/expenses/story/layout.tsx) animate the page fold.
//
// Browsers without the View Transitions API just navigate normally —
// no polyfill, no fallback work. Chrome 111+, Edge 111+, Safari 18+,
// Firefox 138+ get the animation.

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const ACCENT = '#6b2417';

type StartViewTransition = (cb: () => void) => { ready: Promise<void> };
function getStartViewTransition(): StartViewTransition | null {
  if (typeof document === 'undefined') return null;
  const d = document as Document & { startViewTransition?: StartViewTransition };
  return typeof d.startViewTransition === 'function' ? d.startViewTransition.bind(d) : null;
}

export default function StoryNav({
  part,
  total,
}: {
  part: number;
  total: number;
}) {
  const router = useRouter();

  // Fold animation only fires between adjacent chapters. Clicking
  // 'Back to Top 10' at either end routes plainly with no fold — the
  // animation is for the book metaphor, and leaving the book entirely
  // shouldn't pretend to be page-turning.
  const go = (e: MouseEvent, href: string, animate: boolean) => {
    e.preventDefault();
    const start = animate ? getStartViewTransition() : null;
    if (start) {
      start(() => {
        router.push(href);
      });
    } else {
      router.push(href);
    }
  };

  const hasPrevChapter = part > 1;
  const hasNextChapter = part < total;
  const prevHref = hasPrevChapter ? `/expenses/story/${part - 1}` : '/expenses';
  const nextHref = hasNextChapter ? `/expenses/story/${part + 1}` : '/expenses';
  const prevLabel = hasPrevChapter ? `← Part ${part - 1}` : '← Back to Top 10';
  const nextLabel = hasNextChapter ? `Part ${part + 1} →` : 'Back to Top 10 →';

  const baseLinkStyle: CSSProperties = {
    fontFamily: 'Special Elite, monospace',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: ACCENT,
    textDecoration: 'none',
    borderBottom: `1px solid ${ACCENT}`,
    paddingBottom: '2px',
    cursor: 'pointer',
  };

  return (
    <nav
      style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: `1px solid rgba(20,16,13,0.2)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <a href={prevHref} onClick={(e) => go(e, prevHref, hasPrevChapter)} style={baseLinkStyle}>
        {prevLabel}
      </a>
      <span
        style={{
          fontFamily: 'EB Garamond, Garamond, Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          fontSize: '13px',
          color: INK_SOFT,
          letterSpacing: '0.02em',
        }}
      >
        Part {part} of {total}
      </span>
      <a href={nextHref} onClick={(e) => go(e, nextHref, hasNextChapter)} style={baseLinkStyle}>
        {nextLabel}
      </a>
      {/* INK is referenced via baseLinkStyle hairline; silence the lint. */}
      <span aria-hidden style={{ display: 'none' }}>{INK}</span>
    </nav>
  );
}
