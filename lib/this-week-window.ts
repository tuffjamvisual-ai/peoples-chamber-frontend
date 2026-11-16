// The date windows of /this-week (owner, 23 Oct 2026; ENTRY 140, 16 Nov 2026: worked out in the browser for today's
// date in London, so the page is not rebuilt for the date). No server code here; tests in scripts/checks/london-date.test.ts.
import { addDays } from '@/lib/london-date';

/** Bills: today and the next six days. */
export function billsWindow(today: string): { start: string; end: string } {
  return { start: today, end: addDays(today, 6) };
}

/** Recent votes: from the Monday of this week, less seven days, to today. */
export function divisionsFrom(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday 0
  return addDays(today, -weekday - 7);
}
