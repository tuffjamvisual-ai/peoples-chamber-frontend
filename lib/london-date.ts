// Calendar dates in London, for the parts of a page that depend on today's date (owner, 15 Nov 2026, COWORK-TO-T1
// ENTRY 140). Pages are rebuilt only when their data changes (A16), so the server renders these parts as of the day it
// rendered, and the browser checks them again against today (app/components/useToday.ts). Plain functions with no
// server code, so the same rules run on both sides and are tested in scripts/checks/london-date.test.ts.
//
// Dates are 'YYYY-MM-DD' strings: compared as strings, they sort as dates.

const LONDON = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Today's date in London (BST or GMT as it applies) at the moment given. */
export function londonDay(at: Date = new Date()): string {
  return LONDON.format(at);
}

/** The date n days after (or before, n < 0) a 'YYYY-MM-DD' date. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Whole days from a to b (b later: positive). */
export function daysBetween(a: string, b: string): number {
  const t = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

/** Published within the last `days` days: the day of publication and the days - 1 after it. */
export function isRecent(publishedOn: string | null | undefined, days: number, today: string): boolean {
  if (!publishedOn) return false;
  const age = daysBetween(publishedOn.slice(0, 10), today);
  return age >= 0 && age < days;
}

/** A target month (stored as its first day) has passed once that month is over in London: October 2026 on 1 November. */
export function monthPassed(month: string | null | undefined, today: string): boolean {
  if (!month) return false;
  return month.slice(0, 7) < today.slice(0, 7);
}

/** Days since 1 January 1970 for a London date: the homepage's daily rotation turns on it. */
export function dayNumber(day: string): number {
  return daysBetween('1970-01-01', day);
}
