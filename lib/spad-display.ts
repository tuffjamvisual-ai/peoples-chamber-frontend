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

// An adviser's official background (owner, 28 Oct 2026): declared interests (word for word, recusals first), the
// ministers they advised in each Cabinet Office yearly list, and ACOBA advice on later jobs. Built on the server.
export type SpadInterestRow = { adviser_name: string; department: string; period: string; entry_text: string; category: string; is_recusal: boolean; end_date_text: string | null; source_title: string; source_url: string; source_page: number | null };
export type SpadPostRow = { adviser_name: string; former_department: string; new_employer: string; new_role: string | null; advice_date: string; conditions_text: string | null; source_url: string };
export type SpadHistoryRow = { adviser_name: string; minister_title: string; as_at: string; source_url: string };
export type SpadBackground = {
  interests: SpadInterestRow[];
  history: { title: string; from: string; to: string; source_url: string }[];
  posts: SpadPostRow[];
};

const monthYear = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const historyLine = (h: SpadBackground['history'][number]) => `${h.title}, ${h.from === h.to ? monthYear(h.from) : `${monthYear(h.from)} to ${monthYear(h.to)}`}`;

// Per adviser name (exact match only): their interests, history and ACOBA advice. History joins the yearly lists in
// which the adviser appears under the same minister title in consecutive editions ("March 2024 to March 2026").
export function buildBackground(names: string[], interests: SpadInterestRow[], history: SpadHistoryRow[], posts: SpadPostRow[], editions: string[]): Record<string, SpadBackground> {
  const order = [...new Set(editions)].sort();
  const out: Record<string, SpadBackground> = {};
  for (const name of new Set(names)) {
    const ints = interests.filter((i) => i.adviser_name === name)
      .sort((a, b) => Number(b.is_recusal) - Number(a.is_recusal) || b.period.localeCompare(a.period) || a.department.localeCompare(b.department));
    const byTitle = new Map<string, SpadHistoryRow[]>();
    for (const h of history.filter((x) => x.adviser_name === name)) byTitle.set(h.minister_title, [...(byTitle.get(h.minister_title) ?? []), h]);
    const spans: SpadBackground['history'] = [];
    for (const [title, rows] of byTitle) {
      const dates = [...new Set(rows.map((r) => r.as_at))].sort();
      let start = dates[0], prev = dates[0];
      for (const d of [...dates.slice(1), null]) {
        if (d && order.indexOf(d) === order.indexOf(prev) + 1) { prev = d; continue; }
        spans.push({ title, from: start, to: prev, source_url: rows.find((r) => r.as_at === prev)!.source_url });
        if (d) { start = d; prev = d; }
      }
    }
    spans.sort((a, b) => b.to.localeCompare(a.to) || b.from.localeCompare(a.from));
    out[name] = { interests: ints, history: spans, posts: posts.filter((p) => p.adviser_name === name).sort((a, b) => b.advice_date.localeCompare(a.advice_date)) };
  }
  return out;
}

// Each listed minister's status today (spad_minister_status, from the Members API; owner, 28 Oct 2026).
export type SpadMinisterStatus = {
  kind: 'listed' | 'current'; minister_title: string; minister_name: string | null; member_id: number | null; gender: string | null;
  post_name: string | null; started_on: string | null; left_on: string | null; still_in_post: boolean; area: string | null;
};
// What the table and the MP block need per listed minister title: when they left (null while in post), and a name
// from the Members API when the list itself gives none.
export type SpadMinisterInfo = { left_on: string | null; api_name: string | null };
export const leftLabel = (iso: string) => `(left this post on ${longDate(iso)})`;
// The Members API's display name without "Mr", "Mrs", "Ms" or "Dr".
export const plainName = (n: string | null) => (n ? n.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '') : n);

const QUARTER_END: Record<string, string> = { march: '03-31', june: '06-30', september: '09-30', december: '12-31' };
// "April to June 2026" → "2026-06-30".
export function quarterEndDate(q: string): string | null {
  const m = q.match(/to\s+(march|june|september|december)\s+(\d{4})$/i);
  return m ? `${m[2]}-${QUARTER_END[m[1].toLowerCase()]}` : null;
}
export const monthYearLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
