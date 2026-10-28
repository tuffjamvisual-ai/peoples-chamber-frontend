// Wording shared by /transparency/special-advisers and the "Special advisers" block on MP pages (owner, 28 Oct 2026).
export type SpadRow = {
  adviser_name: string; minister_title: string; minister_name: string | null; minister_member_id: number | null;
  pay_band: number | null; salary_band_text: string | null; salary_band_min: number | null; notes: string[];
};
export type SpadReleaseRow = {
  release_slug: string; as_at: string; headcount: number | null; fte: number | null; paybill: number | null;
  prior_paybill: number | null; source_url: string;
};

export const SPAD_LIST_ANCHOR = 'all-special-advisers';
export const OGL_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

// Salaries are published only from £81,000 (in £5,000 bands).
export const salaryLabel = (r: Pick<SpadRow, 'salary_band_text'>) => r.salary_band_text ?? 'Under £81,000 (not published)';

// "special-adviser-data-releases-numbers-and-costs-july-2026" → "July 2026".
export function releaseLabel(slug: string): string {
  const m = slug.match(/-([a-z]+)-(\d{4})$/);
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}` : slug;
}

export const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// The financial year that ends on the "as at" date: 31 March 2026 → "2025/26".
export function financialYear(asAt: string): string {
  const y = Number(asAt.slice(0, 4));
  const end = Number(asAt.slice(5, 7)) <= 3 ? y : y + 1;
  return `${end - 1}/${String(end).slice(2)}`;
}

const millions = (n: number) => `£${(n / 1e6).toFixed(1)} million`;

// "159 special advisers (155 full time equivalent) cost £17.9 million in 2025/26, up from £16.7 million."
export function totalsLine(r: SpadReleaseRow): string | null {
  if (r.headcount == null || r.paybill == null) return null;
  const fte = r.fte != null ? ` (${Number(r.fte).toLocaleString('en-GB')} full time equivalent)` : '';
  const change = r.prior_paybill == null ? '' : r.prior_paybill === r.paybill ? `, the same as the year before` : `, ${r.paybill > r.prior_paybill ? 'up' : 'down'} from ${millions(r.prior_paybill)}`;
  return `${r.headcount.toLocaleString('en-GB')} special advisers${fte} cost ${millions(r.paybill)} in ${financialYear(r.as_at)}${change}.`;
}

// The minister's name as we show it: without "The Rt Hon", "MP" and letters after the name.
export function ministerShownName(name: string | null): string | null {
  if (!name) return null;
  return name.replace(/^(the\s+)?(rt\.?\s+(hon\.?\s+)?|right\s+honourable\s+)/i, '').replace(/(\s+(kcb|kc|qc|mp|obe|cbe|mbe|dbe|kbe|pc|cb))+\s*$/i, '').trim();
}
