import { supabase } from '@/lib/supabase';

// The latest financial year IPSA has published full-year totals for (e.g. '24_25').
// IPSA publishes year-end totals months after the year closes, so this moves on by itself.
// Shared by /expenses and the homepage card, so both always name the same year
// (audit reassessment, 16 Oct 2026: the homepage said "last financial year").
export async function latestExpensesYear(): Promise<string> {
  const { data } = await supabase.from('mp_expenses_summary').select('year').order('year', { ascending: false }).limit(1);
  return (data && data[0] && (data[0] as { year: string }).year) || '24_25';
}
// '24_25' -> '2024/25' (titles and short text) and '2024 / 2025' (page text). A slash, not a
// hyphen: the site shows no dash-like marks in its own text (owner's rule, 17 Oct 2026).
export const expensesYearShort = (y: string) => `20${y.slice(0, 2)}/${y.slice(3, 5)}`;
export const expensesYearLong = (y: string) => `20${y.slice(0, 2)} / 20${y.slice(3, 5)}`;
