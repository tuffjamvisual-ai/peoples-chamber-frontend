'use client';
// Today's London date in the browser (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 140). The first render uses the day the
// server rendered the page, so the HTML and the browser's first render match and nothing jumps; after that the
// browser's own date takes over, and the date-dependent parts change only when the day has really moved on since the
// page was built. It checks again at the next London midnight for a page left open.
import { useEffect, useState } from 'react';
import { londonDay } from '@/lib/london-date';

export function useToday(renderedOn: string): string {
  const [today, setToday] = useState(renderedOn);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      setToday(londonDay());
      // Look again a minute after the next hour turns, which always catches midnight in London (BST or GMT).
      const now = new Date();
      const next = new Date(now); next.setMinutes(61, 0, 0);
      timer = setTimeout(check, next.getTime() - now.getTime());
    };
    check();
    return () => clearTimeout(timer);
  }, []);
  return today;
}
