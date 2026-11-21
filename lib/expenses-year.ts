import { tagDb } from '@/lib/page-reads';

// The latest financial year IPSA has published full-year totals for (e.g. '24_25').
// IPSA publishes year-end totals months after the year closes, so this moves on by itself.
// Shared by /expenses and the homepage card, so both always name the same year
// (audit reassessment, 16 Oct 2026: the homepage said "last financial year").
export async function latestExpensesYear(): Promise<string> {
  const { data, error: dataErr } = await tagDb().from('mp_expenses_summary').select('year').order('year', { ascending: false }).limit(1);
  if (dataErr && dataErr.code !== 'PGRST116') throw new Error(`expenses-year mp_expenses_summary: ${dataErr.message}`);
  return (data && data[0] && (data[0] as { year: string }).year) || '24_25';
}
// '24_25' -> '2024/25' (titles and short text) and '2024 / 2025' (page text). A slash, not a
// hyphen: the site shows no dash-like marks in its own text (owner's rule, 17 Oct 2026).
export const expensesYearShort = (y: string) => `20${y.slice(0, 2)}/${y.slice(3, 5)}`;
export const expensesYearLong = (y: string) => `20${y.slice(0, 2)} / 20${y.slice(3, 5)}`;

// Every year with IPSA totals, newest first (ENTRY 495; Cowork 22:44: every loaded year is selectable on purpose, now
// 2025/26, 2024/25 and 2023/24). One small read per year (the newest year below the last one found), so no answer
// depends on the API's row cap (T2, 22:36): each read returns one row.
export async function expensesYears(): Promise<string[]> {
  const years: string[] = [];
  for (let i = 0; i < 30; i++) {
    let q = tagDb().from('mp_expenses_summary').select('year').order('year', { ascending: false }).limit(1);
    if (years.length) q = q.lt('year', years[years.length - 1]);
    const { data, error } = await q;
    if (error && error.code !== 'PGRST116') throw new Error(`expenses-years mp_expenses_summary: ${error.message}`);
    const y = (data && data[0] && (data[0] as { year: string }).year) || null;
    if (!y) break;
    years.push(y);
  }
  return years;
}
// The address of a year's page: the latest year is /expenses itself.
export const expensesYearHref = (y: string, latest: string) => (y === latest ? '/expenses' : `/expenses/year/${y}`);
