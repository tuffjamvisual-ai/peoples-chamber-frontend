'use client';

// Floating "jump to bottom" button, styled like the one in the Claude chat
// app: a small round button with a down arrow, centred near the bottom of
// the screen. It fades in whenever the reader is more than a short distance
// from the bottom of a page that's long enough to need it, and fades out at
// the bottom. Added once in app/layout.tsx so every page gets it. (The
// existing in-page up arrow at the end of many pages is unchanged.)

import { useEffect, useState } from 'react';

const SHOW_WHEN_MORE_THAN_PX_FROM_BOTTOM = 200;
const MIN_PAGE_HEIGHT_SCREENS = 1.5; // don't show on short pages

export default function FloatingScrollDownButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const viewport = window.innerHeight;
        const total = Math.max(doc.scrollHeight, document.body.scrollHeight);
        const remaining = total - (window.scrollY + viewport);
        setVisible(total > viewport * MIN_PAGE_HEIGHT_SCREENS && remaining > SHOW_WHEN_MORE_THAN_PX_FROM_BOTTOM);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Page height changes as content loads or tabs switch.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);

  const jump = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    window.scrollTo({ top: total, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={jump}
      aria-label="Scroll to bottom"
      title="Scroll to bottom"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className="no-hover-scale"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(24px, env(safe-area-inset-bottom))',
        transform: `translateX(-50%) translateY(${visible ? '0' : '8px'})`,
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1px solid rgba(0,0,0,0.12)',
        background: '#ffffff',
        color: '#1a1a1a',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        zIndex: 60,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 160ms ease, transform 160ms ease',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
