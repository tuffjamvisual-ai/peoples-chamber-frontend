'use client';
// 'See all 12 measures' (Cowork ENTRY 444 item 3(c)): on the area page, opens the existing 'Every measure explained' fold
// (<details id="all-measures">) and scrolls to it. Without JavaScript the link still goes to the fold's heading, where one
// tap opens it. Not in a <p>, so the shared phone script does not mark it as a lone link before React hydrates (see
// SourceNotes.tsx); its own 44px tap height instead. OpenFoldOnHash opens a fold when the page is reached with its id as
// the hash: #all-measures, and #why from the main page's 'Why <place> ranks here' links (ENTRY 444 decisions item 1).
import { useEffect } from 'react';

export const ALL_MEASURES_ID = 'all-measures';
export const WHY_ID = 'why';

function openFold(id: string, scroll: boolean) {
  const d = document.getElementById(id);
  if (!(d instanceof HTMLDetailsElement)) return false;
  d.open = true;
  if (scroll) d.scrollIntoView({ block: 'start' });
  return true;
}

export default function AllMeasuresLink({ count }: { count: number }) {
  const style = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: '#14100d', textDecoration: 'underline', textUnderlineOffset: '3px' } as const;
  return (
    <a href={`#${ALL_MEASURES_ID}`} style={style} onClick={(e) => { if (openFold(ALL_MEASURES_ID, true)) { e.preventDefault(); history.replaceState(null, '', `#${ALL_MEASURES_ID}`); } }}>
      See all {count} measures
    </a>
  );
}

/** On the area page: opens the fold whose id is the hash (#all-measures or #why) on arrival and on a hash change. */
export function OpenFoldOnHash() {
  useEffect(() => {
    const go = () => { const id = location.hash.slice(1); if (id === ALL_MEASURES_ID || id === WHY_ID) openFold(id, true); };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  return null;
}
