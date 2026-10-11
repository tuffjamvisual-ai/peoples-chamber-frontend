'use client';

// Floating scroll arrow, styled like the Claude chat app's: a small round
// button near the bottom of the screen. It points down (jump to the bottom)
// until you reach the bottom of the page, then flips to point up (jump back
// to the top). Shown only on pages long enough to need it. Added once in
// app/layout.tsx so every page gets it.
//
// Position: it stays in the same place on screen as you scroll, centred on
// the page's folder (the paper area) rather than the browser window, and it
// never sits off the folder: near the end of a page, where the folder
// finishes and the dark background shows, it moves up just enough to stay
// on the paper. The folder is the shell's content area (.dossier-content in
// OpenGovShell, .pca-folder-content in DossierShell); pages without either
// fall back to the centre of the window.

import { useEffect, useState } from 'react';

const BUTTON = 36;                 // px
const GAP_FROM_SCREEN_BOTTOM = 24; // px
const GAP_FROM_FOLDER_EDGE = 12;   // px, inside the paper
const AT_BOTTOM_PX = 200;          // within this distance of the end counts as "at the bottom"
const MIN_PAGE_HEIGHT_SCREENS = 1.5;
const FOLDER_SELECTOR = '.dossier-content, .pca-folder-content';

type Pos = { visible: boolean; atBottom: boolean; left: number | null; top: number | null };

export default function FloatingScrollDownButton() {
  const [pos, setPos] = useState<Pos>({ visible: false, atBottom: false, left: null, top: null });

  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement;
      const viewport = window.innerHeight;
      const total = Math.max(doc.scrollHeight, document.body.scrollHeight);
      const remaining = total - (window.scrollY + viewport);
      const visible = total > viewport * MIN_PAGE_HEIGHT_SCREENS;
      const atBottom = remaining <= AT_BOTTOM_PX;

      let left: number | null = null;
      let top = viewport - GAP_FROM_SCREEN_BOTTOM - BUTTON;
      const folder = document.querySelector<HTMLElement>(FOLDER_SELECTOR);
      if (folder) {
        const r = folder.getBoundingClientRect();
        left = r.left + r.width / 2;
        // Keep the button on the paper: never below the folder's bottom edge
        // (or above its top edge on very short screens).
        top = Math.min(top, r.bottom - GAP_FROM_FOLDER_EDGE - BUTTON);
        top = Math.max(top, r.top + GAP_FROM_FOLDER_EDGE);
      }
      setPos({ visible, atBottom, left, top });
    };
    // Measured straight away (not on the next animation frame): animation
    // frames pause in background tabs and can lag while a page loads, which
    // left the arrow pointing the wrong way or in the wrong place.
    const update = () => measure();
    measure();
    // Catch late layout shifts (fonts, images) after the first paint.
    const settle = window.setTimeout(measure, 500);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Page height changes as content loads or tabs switch.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(document.body);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, []);

  const jump = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const total = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    window.scrollTo({ top: pos.atBottom ? 0 : total, behavior: reduce ? 'auto' : 'smooth' });
  };

  const label = pos.atBottom ? 'Scroll to top' : 'Scroll to bottom';

  return (
    <button
      type="button"
      onClick={jump}
      aria-label={label}
      title={label}
      tabIndex={pos.visible ? 0 : -1}
      aria-hidden={!pos.visible}
      className="no-hover-scale"
      style={{
        position: 'fixed',
        left: pos.left != null ? `${pos.left}px` : '50%',
        top: pos.top != null ? `${pos.top}px` : undefined,
        bottom: pos.top != null ? undefined : `${GAP_FROM_SCREEN_BOTTOM}px`,
        transform: 'translateX(-50%)',
        width: `${BUTTON}px`,
        height: `${BUTTON}px`,
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
        opacity: pos.visible ? 1 : 0,
        pointerEvents: pos.visible ? 'auto' : 'none',
        transition: 'opacity 160ms ease',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ transform: pos.atBottom ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }}
      >
        <path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
