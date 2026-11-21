// The year (or month) list a search for 'pmq 1965' or 'votes june 2024' leads with (Cowork ENTRY 489, owner approved
// 21 Nov 2026). Only pages that exist: a PMQs year with sessions or days of questions (lib/pmqs-years.ts, the reads the
// /pmqs/year pages use, already in the shared data cache), a divisions year or month with votes (lib/division-links.ts).
// PMQs have no month pages, so a month leads to its year's page, and the row says so.
import 'server-only';
import type { DirectoryPage } from '@/lib/directory';
import { pmqsYears } from '@/lib/pmqs-years';
import { divisionYears, yearHref, yearMonths } from '@/lib/division-links';
import { divisionMonthHref, monthName, pmqsYearHref } from '@/lib/year-pages';
import { yearListFor } from '@/lib/search/query-understanding';

const row = (href: string, title: string, desc: string): DirectoryPage => ({ href, title, desc, keywords: [], alt: [] });

export async function yearListPage(q: string): Promise<DirectoryPage | null> {
  const want = yearListFor(q);
  if (!want) return null;
  const { kind, year, month } = want;
  if (kind === 'pmqs') {
    const all = await pmqsYears();
    if (!all.years.includes(year)) return null;
    const sessions = all.sessions.filter((s) => s.date.startsWith(`${year}-`)).length;
    const days = all.preFixed.filter((d) => d.date.startsWith(`${year}-`)).length;
    const inMonth = month ? [...all.sessions, ...all.preFixed].filter((d) => d.date.startsWith(`${year}-${String(month).padStart(2, '0')}-`)).length : 0;
    const monthNote = month ? ` ${monthName(month)} ${year} is on this page${inMonth ? '' : ', with no sitting that month'}.` : '';
    return sessions
      ? row(pmqsYearHref(year), `PMQs in ${year}: all sessions`, `All ${sessions} sessions of Prime Minister's Questions in ${year}, with who answered.${monthNote}`)
      : row(pmqsYearHref(year), `Questions to the Prime Minister in ${year}: every day`, `All ${days} days in ${year} with questions to the Prime Minister, before PMQs had a fixed time in July 1961.${monthNote}`);
  }
  const years = await divisionYears();
  if (!years.includes(year)) return null;
  if (month) {
    const months = await yearMonths(year);
    const m = months.find((x) => x.month === month);
    if (m) return row(divisionMonthHref(year, month), `Commons votes in ${monthName(month)} ${year}`, `All ${m.count} Commons divisions in ${monthName(month)} ${year}, with the result.`);
  }
  return row(yearHref(year), `Commons votes in ${year}`, `Every Commons division in ${year}, with the result.`);
}
