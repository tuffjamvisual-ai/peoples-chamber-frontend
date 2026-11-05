'use client';

// Arriving at /pmqs/<date>#r-12 opens the Show more folds around that row (owner, 5 Nov 2026). A browser opens a details
// around a fragment on its own only where the row is inside it, and a phone-only fold (MoreChain phoneOnly) holds its rows
// beside it. Without JavaScript the row may need a press to reach.
import { useEffect } from 'react';

export default function OpenHashTarget() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      let opened = false;
      for (let e: Element | null = target.parentElement; e; e = e.parentElement) {
        if (e instanceof HTMLDetailsElement && !e.open) { e.open = true; opened = true; }
        const fold = e.classList.contains('pc-b') ? e.previousElementSibling : null;
        if (fold instanceof HTMLDetailsElement && !fold.open) { fold.open = true; opened = true; }
      }
      if (opened) target.scrollIntoView();
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
