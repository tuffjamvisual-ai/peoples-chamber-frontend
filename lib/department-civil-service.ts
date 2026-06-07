// Server-side fetchers for the Phase 1 civil service transparency
// data: staffing (ONS Public Sector Employment Table 8) and budgets
// (HM Treasury Main Estimates DEL). One round-trip per page render,
// imported by app/departments/[slug]/page.tsx.

import { supabase } from '@/lib/supabase';

export type DepartmentStaffingRow = {
  department_slug: string;
  period: string;
  period_end_date: string;
  headcount: number | null;
  fte: number | null;
  prior_quarter_headcount: number | null;
  change_from_previous_percent: number | null;
  is_proxy: boolean;
  proxy_note: string | null;
  source: string;
  source_file_url: string | null;
};

export type DepartmentBudgetRow = {
  department_slug: string;
  financial_year: string;
  is_outturn: boolean;
  resource_del_millions: number | null;
  resource_del_ex_depr_millions: number | null;
  capital_del_millions: number | null;
  total_del_millions: number | null;
  ame_millions: number | null;
  change_from_previous_percent: number | null;
  editorial_prose: string | null;
  caveat_note: string | null;
  source: string;
  source_file_url: string | null;
  source_release_date: string | null;
};

// Returns the single most-recent staffing row for the slug, or null
// if none. ONS Table 8 publishes quarterly; we want the latest.
export async function getDepartmentStaffing(slug: string): Promise<DepartmentStaffingRow | null> {
  const { data, error } = await supabase
    .from('department_staffing')
    .select('*')
    .eq('department_slug', slug)
    .order('period_end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as DepartmentStaffingRow;
}

// Returns the most-recent budget row for the slug. Mains releases once
// per year so this is normally FY 2026-27 plans at time of writing.
export async function getDepartmentBudget(slug: string): Promise<DepartmentBudgetRow | null> {
  const { data, error } = await supabase
    .from('department_budgets')
    .select('*')
    .eq('department_slug', slug)
    .eq('source', 'hmt_main_estimates')
    .order('financial_year', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as DepartmentBudgetRow;
}

// Formats £m → "£X bn" / "£Y m" — same rules as the existing fmtBn in
// lib/department-budgets.ts. Returns null for null input so callers can
// short-circuit to placeholder copy.
export function fmtMillions(m: number | null | undefined): string | null {
  if (m == null) return null;
  const bn = m / 1000;
  if (bn >= 10) return `£${Math.round(bn)} bn`;
  if (bn >= 1) return `£${bn.toFixed(1)} bn`;
  if (bn >= 0.1) return `£${bn.toFixed(2)} bn`;
  return `£${Math.round(m)} m`;
}

// "1,200" with commas. Returns null for null input.
export function fmtHeadcount(n: number | null | undefined): string | null {
  if (n == null) return null;
  return n.toLocaleString('en-GB');
}

// "since October 2022" — date formatter for appointment dates.
// Returns null when no date is supplied so the caller can omit the suffix.
export function fmtAppointed(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime())) return null;
  const month = d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  return `since ${month} ${d.getUTCFullYear()}`;
}

// "£200,000 – £204,999" — SCS pay band, rendered as a range.
export function fmtPayBand(floor: number | null | undefined, ceiling: number | null | undefined): string | null {
  if (floor == null || ceiling == null) return null;
  const f = floor.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  const c = ceiling.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  return `${f} – ${c}`;
}
