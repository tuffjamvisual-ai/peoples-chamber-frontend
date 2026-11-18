'use client';
// Keyboard for a suggestions list under a box (SEARCH-ALL batch 2, Cowork ENTRY 326), the same as the /reports box and
// SuggestInput: ArrowDown and ArrowUp move through the rows (wrapping), Enter opens the highlighted row (and only then:
// with none highlighted, Enter does what the box's form does), Escape closes the list. For the boxes that keep their own
// list (CouncilSearch, AreaSearch, PostcodeLookup); the rows' ids give aria-activedescendant.
import { useState } from 'react';

export function useListNav(count: number, open: (i: number) => void, close: () => void) {
  const [active, setActive] = useState(-1);
  // A new list starts with nothing highlighted (reset in render, React's pattern for state that follows a prop).
  const [lastCount, setLastCount] = useState(count);
  if (count !== lastCount) { setLastCount(count); setActive(-1); }
  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown' && count) { ev.preventDefault(); setActive((a) => (a + 1) % count); }
    else if (ev.key === 'ArrowUp' && count) { ev.preventDefault(); setActive((a) => (a <= 0 ? count - 1 : a - 1)); }
    else if (ev.key === 'Enter' && count && active >= 0 && active < count) { ev.preventDefault(); open(active); }
    else if (ev.key === 'Escape') { setActive(-1); close(); }
  };
  return { active, setActive, onKeyDown };
}
