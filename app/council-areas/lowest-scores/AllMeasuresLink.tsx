'use client';
// 'See all 12 measures' (Cowork ENTRY 444 item 3(c)): opens the area page's existing 'Every measure explained' fold
// (<details id="all-measures">). On the area page it opens the fold and scrolls to it; from the main page it goes to the
// area page with #all-measures, and OpenAllMeasures opens the fold there. Without JavaScript the link still goes to the
// fold's heading, where one tap opens it. Not in a <p>, so the shared phone script does not mark it as a lone link before
// React hydrates (see SourceNotes.tsx); its own 44px tap height instead.
import { useEffect } from 'react';
import Link from 'next/link';

export const ALL_MEASURES_ID = 'all-measures';

function openFold(scroll: boolean) {
  const d = document.getElementById(ALL_MEASURES_ID);
  if (!(d instanceof HTMLDetailsElement)) return false;
  d.open = true;
  if (scroll) d.scrollIntoView({ block: 'start' });
  return true;
}

export default function AllMeasuresLink({ href, count }: { href?: string; count: number }) {
  const style = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' } as const;
  const label = `See all ${count} measures`;
  if (href) return <Link href={`${href}#${ALL_MEASURES_ID}`} style={style}>{label}</Link>;
  return (
    <a href={`#${ALL_MEASURES_ID}`} style={style} onClick={(e) => { if (openFold(true)) { e.preventDefault(); history.replaceState(null, '', `#${ALL_MEASURES_ID}`); } }}>
      {label}
    </a>
  );
}

/** On the area page: opens 'Every measure explained' when the page is reached with #all-measures. */
export function OpenAllMeasures() {
  useEffect(() => {
    const go = () => { if (location.hash === `#${ALL_MEASURES_ID}`) openFold(true); };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  return null;
}
