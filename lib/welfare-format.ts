// Shared formatting helpers for the welfare explorer pages
// (app/tools/welfare/**). Kept separate from the page files since the
// same formatting is needed on the landing search, the results listing,
// and both tier detail pages.

// Formats a raw GBP value (not £m — these welfare figures come straight
// off DWP Stat-Xplore as whole-pound annual totals) into a compact
// display string: "£1,234" below £1m, "£12.3m" from £1m, "£1.2bn" from
// £1bn. Mirrors the £m -> "£X bn"/"£Y m" rounding convention already
// used in lib/department-civil-service.ts, just starting from pounds
// rather than millions.
export function formatGBP(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}£${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}bn`;
  if (abs >= 1_000_000) return `${sign}£${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  return `${sign}£${Math.round(abs).toLocaleString('en-GB')}`;
}

// Plain integer with thousands separators — claimant counts, households,
// population, rankings.
export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Math.round(value).toLocaleString('en-GB');
}

// Signed percentage, one decimal place, with a leading + for increases
// (the two-year change figures can go either way and the sign matters —
// a bare "12.3%" reads as ambiguous where "+12.3%" / "-4.1%" doesn't).
export function formatSignedPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// Short "£12,345 per resident" style figure — same £ formatting as
// formatGBP but always shown in full pounds-and-pence-free pounds since
// per-resident figures are small enough that "£1.2m" would never apply.
export function formatGBPPerResident(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

// Financial-year period_end (e.g. "2025-11-30") -> "2025/26" style label,
// matching how DWP/ONS financial years are conventionally written. Falls
// back to the raw string if it doesn't parse as a date.
export function formatPeriodEnd(periodEnd: string | null | undefined): string {
  if (!periodEnd) return '—';
  const d = new Date(periodEnd);
  if (Number.isNaN(d.getTime())) return periodEnd;
  const endYear = d.getUTCFullYear();
  // DWP/ONS financial years run April-to-April; a period ending in
  // Jan-Mar belongs to the financial year that started the previous
  // calendar year (e.g. a 2026-02-28 period_end is FY 2025/26).
  const fyStartYear = d.getUTCMonth() < 3 ? endYear - 1 : endYear;
  return `${fyStartYear}/${String((fyStartYear + 1) % 100).padStart(2, '0')}`;
}
