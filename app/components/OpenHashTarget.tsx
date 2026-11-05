'use client';

// Arriving at /pmqs/<date>#r-12 opens the Show more folds around that row (owner, 5 Nov 2026). Newer browsers do this on
// their own for a fragment; this covers the rest. Without JavaScript the row may need a press to reach.
import { useEffect } from 'react';

export default function OpenHashTarget() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      for (let d = target.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
      target.scrollIntoView();
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
