// Year and month pages (Cowork ENTRY 367 item 3, owner approved; from Search Console: division and PMQs pages were
// "discovered, not indexed", known mostly from the sitemap because page 2 onward of every list is noindex, follow).
// Pure helpers shared by /divisions/year/<yyyy>/<mm> and /pmqs/year/<yyyy>: month names, addresses, and the choice of
// the previous and next year or month that has records. No database reads here.

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 1 -> "January"; anything outside 1 to 12 -> null.
export const monthName = (month: number): string | null => MONTH_NAMES[month - 1] ?? null;

// The month in an address: exactly two digits, 01 to 12.
export const monthOf = (raw: string): number | null => (/^(0[1-9]|1[0-2])$/.test(raw) ? Number(raw) : null);

// "2025", "03" -> the first and last day of that month, as plain dates.
export function monthRange(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0');
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, '0')}` };
}

export const divisionMonthHref = (year: number, month: number) => `/divisions/year/${year}/${String(month).padStart(2, '0')}`;
export const pmqsYearHref = (year: number) => `/pmqs/year/${year}`;

// The items either side of `current` in a list that has records: the nearest smaller and the nearest larger. The list
// need not be sorted, and `current` need not be in it.
export function neighbours<T>(items: T[], current: T, compare: (a: T, b: T) => number): { previous: T | null; next: T | null } {
  let previous: T | null = null, next: T | null = null;
  for (const x of items) {
    const c = compare(x, current);
    if (c < 0 && (previous === null || compare(x, previous) > 0)) previous = x;
    if (c > 0 && (next === null || compare(x, next) < 0)) next = x;
  }
  return { previous, next };
}

export type YearMonth = { year: number; month: number };
export const compareYearMonth = (a: YearMonth, b: YearMonth) => a.year - b.year || a.month - b.month;

// Month counts from a list of plain dates ("2025-03-04"): [{ month, count }], January first, months with none left out.
export function monthCounts(dates: string[]): { month: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const d of dates) { const m = Number(d.slice(5, 7)); if (m >= 1 && m <= 12) counts.set(m, (counts.get(m) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([month, count]) => ({ month, count }));
}
