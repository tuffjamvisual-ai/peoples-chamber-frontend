// Search result titles (owner's approval, 24 Oct 2026). The root layout's title template adds " | opengovt" to every
// page title (app/layout.tsx), and the full title should be 60 characters or fewer so it is not cut in results.
// fitTitle takes the preferred forms in order and returns the first that fits with the suffix; when none fits it
// returns the last, the agreed fallback. Titles are never cut mid-word.
export const TITLE_SUFFIX = ' | opengovt';
export const TITLE_MAX = 60;

export function fitTitle(...candidates: string[]): string {
  for (const c of candidates) if (c.length + TITLE_SUFFIX.length <= TITLE_MAX) return c;
  return candidates[candidates.length - 1];
}

// "4 Mar 2026" from an ISO date or timestamp, read from its date part so the day never shifts with the time zone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
