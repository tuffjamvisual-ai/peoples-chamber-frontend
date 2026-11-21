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

// Every year with IPSA totals, newest first (ENTRY 495: the latest year at /expenses, earlier ones at /expenses/year/<yy_yy>).
export async function expensesYears(): Promise<string[]> {
  const { data, error } = await tagDb().from('mp_expenses_summary').select('year').order('year', { ascending: false }).limit(5000);
  if (error && error.code !== 'PGRST116') throw new Error(`expenses-years mp_expenses_summary: ${error.message}`);
  return [...new Set(((data || []) as { year: string }[]).map((r) => r.year))];
}
// The address of a year's page: the latest year is /expenses itself.
export const expensesYearHref = (y: string, latest: string) => (y === latest ? '/expenses' : `/expenses/year/${y}`);
