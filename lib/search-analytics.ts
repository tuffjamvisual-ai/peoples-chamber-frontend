// The "search" analytics event (owner's brief, 3 Nov 2026): sent to PostHog only for a visitor who accepted additional
// cookies, only when they submitted the search form (not when they arrived from a link), with the query cleaned first.

// The search form (app/search/SearchInput.tsx) leaves the submitted query here for the results page to pick up once.
export const SUBMITTED_SEARCH_KEY = 'og-search-submitted';

const EMAIL = /[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]+/g;
// A full UK postcode (outward and inward code, with or without the space), and the special GIR 0AA.
const POSTCODE = /\b(?:GIR ?0AA|[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})\b/gi;
export const QUERY_MAX = 100;

// Anything that looks like an email address or a UK postcode becomes "[removed]"; the result is capped at 100 characters.
export function cleanSearchQuery(q: string): string {
  return q.replace(EMAIL, '[removed]').replace(POSTCODE, '[removed]').slice(0, QUERY_MAX);
}
