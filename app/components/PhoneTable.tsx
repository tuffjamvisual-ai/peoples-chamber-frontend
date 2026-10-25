'use client';

// Wide tables on phones (25 Oct 2026, report 47). Under 768px the table scrolls sideways inside this box (the page
// itself never does), its first column (or first two, for a rank followed by a name) stays put while the rest scrolls,
// and "Scroll for more columns" shows above it while there are columns out of view. From 768px up it is a plain box.
// The hint is drawn by CSS (phone-table.css), so it is not part of the table's text. Every value and link is the table's
// own; nothing is changed or left out.

import { useEffect, useRef } from 'react';
import './phone-table.css';

export default function PhoneTable({ sticky = 1, children }: { sticky?: 1 | 2; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const update = () => {
      const more = box.scrollWidth > box.clientWidth + 1 && box.scrollLeft + box.clientWidth < box.scrollWidth - 1;
      box.dataset.more = more ? '1' : '0';
      // The second pinned column starts where the first one ends.
      const first = box.querySelector(':scope > table > * > tr > :first-child:not([colspan])') as HTMLElement | null;
      if (first) box.style.setProperty('--pt-left2', `${first.getBoundingClientRect().width}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    const table = box.querySelector('table');
    if (table) ro.observe(table);
    box.addEventListener('scroll', update, { passive: true });
    return () => { ro.disconnect(); box.removeEventListener('scroll', update); };
  }, []);
  return <div ref={ref} className={`pt-box pt-sticky-${sticky}`} data-more="0">{children}</div>;
}
