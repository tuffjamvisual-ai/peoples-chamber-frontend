// A recommendation's status as of a day (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 140). A target "still to come" becomes
// "target passed" once its month is over; pages are rebuilt only when the data changes, so the server sends both forms
// with the target month, and the browser shows the one for today (app/components/useToday.ts). No server code here.
import { monthPassed } from '@/lib/london-date';

export type Dated<T> = { base: T; month?: string; passed?: T };

/** The form for the day given: the passed form once the target month is over in London, else the stored form. */
export function onDay<T>(d: Dated<T>, today: string): T {
  return d.passed !== undefined && d.month && monthPassed(d.month, today) ? d.passed : d.base;
}
