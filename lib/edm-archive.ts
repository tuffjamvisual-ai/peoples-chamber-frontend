// The early day motion archive by year and month (owner approved 23 Nov 2026, Cowork ENTRY 536 item 1): every motion a
// plain link from an indexable page, as the divisions and PMQs year pages do. Built from the one cached list of motions
// (lib/edm-pages.ts allEdms, refreshed by the EDM tag when /api/sync-edms runs each morning): no extra database reads.
import 'server-only';
import { allEdms, type EdmListRow } from '@/lib/edm-pages';

export const edmYearHref = (year: number) => `/edms/year/${year}`;
export const edmMonthHref = (year: number, month: number) => `/edms/year/${year}/${String(month).padStart(2, '0')}`;

const ym = (d: string) => ({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) });

// Years with motions, oldest first.
export async function edmYears(): Promise<number[]> {
  const { rows } = await allEdms();
  return [...new Set(rows.filter((r) => /^\d{4}-\d{2}/.test(r.date_tabled)).map((r) => ym(r.date_tabled).year))].sort((a, b) => a - b);
}

// A year's months with motions and how many, oldest first.
export async function edmYearMonths(year: number): Promise<{ month: number; count: number }[]> {
  const { rows } = await allEdms();
  const counts = new Map<number, number>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}/.test(r.date_tabled)) continue;
    const d = ym(r.date_tabled);
    if (d.year === year) counts.set(d.month, (counts.get(d.month) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => a[0] - b[0]).map(([month, count]) => ({ month, count }));
}

// Every motion tabled in a month, newest first (by tabled date, then motion number), with the session start for Open/Closed.
export async function edmsInMonth(year: number, month: number): Promise<{ rows: EdmListRow[]; sessionStart: string }> {
  const { rows, sessionStart } = await allEdms();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const inMonth = rows.filter((r) => r.date_tabled.startsWith(prefix))
    .sort((a, b) => b.date_tabled.localeCompare(a.date_tabled) || (b.uin ?? 0) - (a.uin ?? 0));
  return { rows: inMonth, sessionStart };
}
