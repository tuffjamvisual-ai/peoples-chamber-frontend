// Share image for /this-week (OG1, audit, 8 Nov 2026): "This week in Parliament" and the week the page covers, today and
// the next six days as UK dates (the page's own window, weekRange() in ./page.tsx). Drawn again every 10 minutes, like
// the page, so the dates move on each day.

import { ogCard } from '@/lib/og-card';

export const alt = 'This week in Parliament, from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 600;

const londonYmd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// "8 to 14 November 2026", "28 November to 4 December 2026", "29 December 2026 to 4 January 2027".
function weekLabel(now: Date): string {
  const start = londonYmd(now);
  const end = new Date(Date.parse(`${start}T12:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
  const [s, e] = [start, end].map((ymd) => new Date(`${ymd}T12:00:00Z`));
  const part = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
  const full = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  if (s.getUTCFullYear() !== e.getUTCFullYear()) return `${part(s, full)} to ${part(e, full)}`;
  if (s.getUTCMonth() !== e.getUTCMonth()) return `${part(s, { day: 'numeric', month: 'long' })} to ${part(e, full)}`;
  return `${part(s, { day: 'numeric' })} to ${part(e, full)}`;
}

export default async function Image() {
  return ogCard({ kicker: 'This week in Parliament', title: weekLabel(new Date()), line: 'Bills coming up in the House of Commons, and the latest votes' });
}
