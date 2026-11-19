// Search term log (owner approved, Cowork ENTRY 375 item 2): the words typed into the site's search boxes, kept to
// improve the site, with nothing that identifies the person. Shared by the browser (app/components/SearchLog.tsx, so a
// term is cleaned before it leaves the browser) and the server route (app/api/search-log/route.ts, which cleans it
// again). Pure: no database, no request data. The table is public.search_terms (migration 2026-11-19c).

// Which box ran the search. 'home-*' are the homepage boxes; the rest are the search pages themselves.
//   site          /search (its own box, or a link to /search?q=)
//   home-site     the homepage "Search opengovt" box (lands on /search with via=home)
//   councils      /councils/search
//   home-council  the homepage "Find your local council" box (AreaSearch, a postcode, town or council lookup)
//   pmqs          /pmqs/search (/pmqs?q=)
//   home-pmqs     the homepage "Search Prime Minister's Questions" box (lands on /pmqs?q= with via=home)
//   mps           the /mps list opened with ?q=
//   home-mp       the homepage "Find your MP" box, when it lands on /mps?q= with via=home (the box is not on main yet)
export const SEARCH_BOXES = ['site', 'home-site', 'councils', 'home-council', 'pmqs', 'home-pmqs', 'mps', 'home-mp'] as const;
export type SearchBox = (typeof SEARCH_BOXES)[number];
export const isSearchBox = (v: unknown): v is SearchBox => typeof v === 'string' && (SEARCH_BOXES as readonly string[]).includes(v);

// The homepage forms add a hidden via=home; the page it lands on turns its own box into the home one.
export const HOME_VIA = 'home';
export function homeBox(box: 'site' | 'pmqs' | 'mps', via: unknown): SearchBox {
  if (via !== HOME_VIA) return box;
  return box === 'site' ? 'home-site' : box === 'pmqs' ? 'home-pmqs' : 'home-mp';
}

export const TERM_MAX = 100;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// A phone number: 7 or more digits in a row once spaces, dashes, brackets and + are taken out.
const PHONE_SEPARATORS = /[\s\-()+]/g;
const PHONE = /\d{7,}/;
// A full UK postcode (outward and inward code, with or without the space, and GIR 0AA): only the outward code is kept.
const POSTCODE = /\b(gir|[a-z]{1,2}\d[a-z\d]?) ?\d[a-z]{2}\b/g;
// Control characters (including tabs and new lines) become spaces.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

// The term as stored: trimmed, inner spaces collapsed, lower case, a full postcode cut to its outward code, at most 100
// characters. null (nothing is logged) for an empty term, an email address or a phone number.
export function cleanTerm(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let t = raw.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!t) return null;
  if (EMAIL.test(t)) return null;
  if (PHONE.test(t.replace(PHONE_SEPARATORS, ''))) return null;
  t = t.replace(POSTCODE, '$1').replace(/\s+/g, ' ').trim();
  // At most 100 characters (code points, as Postgres counts them, so a cut never splits one).
  const chars = Array.from(t);
  if (chars.length > TERM_MAX) t = chars.slice(0, TERM_MAX).join('').trim();
  return t || null;
}

// The result count: a whole number from 0 up, or null when the page could not tell.
export function cleanResults(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return v;
  return undefined; // invalid: the request is refused
}

// The start of the current hour (UTC), the only time kept.
export function hourStart(d: Date = new Date()): string {
  const h = new Date(d.getTime());
  h.setUTCMinutes(0, 0, 0);
  return h.toISOString();
}

export type SearchLogRow = { term: string; box: SearchBox; results: number | null; at_hour: string };

// A request body to the row stored, or null when nothing is stored (bad box, bad count, or a term that is empty or
// personal). The body holds nothing else that is read.
export function searchLogRow(body: unknown, now: Date = new Date()): SearchLogRow | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!isSearchBox(b.box)) return null;
  const results = cleanResults(b.results);
  if (results === undefined) return null;
  const term = cleanTerm(b.term);
  if (!term) return null;
  return { term, box: b.box, results, at_hour: hourStart(now) };
}

// Kept for 13 months: rows with at_hour before this are deleted by /api/cron/search-terms-retention. The same as
// Postgres's now() - interval '13 months' (a day past the end of the earlier month is moved back to its last day).
export const RETENTION_MONTHS = 13;
export function retentionCutoff(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() - RETENTION_MONTHS;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = new Date(Date.UTC(y, m, Math.min(now.getUTCDate(), lastDay), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()));
  return d.toISOString();
}
