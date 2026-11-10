'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Which opengovt pages this tab has shown, in order, so the back arrow (BackLink.tsx) knows whether the previous page
// in the browser's history is one of ours (owner, 10 Nov 2026, T1-5u). document.referrer is not enough: it is set
// once per full page load and does not change when the site moves between pages without reloading.
//
// The trail starts again whenever a page is loaded from another site, a bookmark or a typed address, so the arrow never
// sends a reader back to a search engine or social site. Kept in sessionStorage (this tab only, gone when it closes).

const KEY = 'og_nav_trail';
const MAX = 50;
let loadedThisDocument = false;

function read(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(trail: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-MAX)));
  } catch {
    // Storage blocked: the arrow then always links one level up.
  }
}

/** True when the page before this one in this tab was an opengovt page. */
export function cameFromThisSite(): boolean {
  if (typeof window === 'undefined' || window.history.length < 2) return false;
  const trail = read();
  return trail.length >= 2 && trail[trail.length - 1] === window.location.pathname;
}

export default function NavTrail() {
  const pathname = usePathname();
  useEffect(() => {
    const here = window.location.pathname;
    let trail = read();
    if (!loadedThisDocument) {
      // A full page load: keep the trail only if the reader arrived from one of our own pages.
      loadedThisDocument = true;
      let fromUs = false;
      try {
        fromUs = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
      } catch {
        fromUs = false;
      }
      if (!fromUs) trail = [];
    }
    if (trail.length >= 2 && trail[trail.length - 2] === here) trail.pop(); // went back a page
    else if (trail[trail.length - 1] !== here) trail.push(here);
    write(trail);
  }, [pathname]);
  return null;
}
