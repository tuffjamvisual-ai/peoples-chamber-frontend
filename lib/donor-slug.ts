// Donor page slugs (moved here from app/donors/[slug]/page.tsx on 24 Oct 2026 so client components can use them).
// Donor pages are not stored: /donors/<slug> finds its donor by searching political_donations.donor_name for the
// slug's narrowTokens (each must appear in the name, ignoring case) and then comparing donorNameToSlug exactly.

// Same canonical slug rule we use across the site.
export function donorNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Words from a slug used to narrow the database search before the exact slug comparison.
// The slug drops apostrophes and turns "&" into "and", so "childrens" must still find
// "Children's" and "and" must not be required (Forstmann Little & Co): a trailing "s" is
// dropped from longer words and "and" is skipped. Fixes donor pages that 404'd although
// they were linked (link crawl, 16 Oct 2026).
export function narrowTokens(slug: string): string[] {
  return slug
    .split('-')
    .filter((t) => t.length >= 2 && t !== 'and')
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

// Search words too common to find one donor on their own: "limited" and "ltd" each appear in thousands of donation
// rows (4,312 and 6,787 on 24 Oct 2026), more than the 2,000 the donor page reads, so a donor whose only search word is
// one of them ("T C Limited", "T S L Ltd") is not found and its page 404s.
const TOO_COMMON_ALONE = new Set(['limited', 'ltd']);

// The /donors/<slug> for a donor name, or null when that page would not find the donor: the slug is empty, it has no
// word to search on, a search word is not in the name as written (an apostrophe inside a word, as in "O'Brien" ->
// "obrien", or "dec'd"), or its only search word is too common (above). A record links to a donor page only when this
// returns a slug. Checked on 24 Oct 2026 against all 19,262 donor names: the 69 refused for a missing word and the 3
// refused as too common all 404; 151 sampled linkable names all open a donor page.
export function donorPageSlug(name: string | null | undefined): string | null {
  const n = (name ?? '').trim();
  if (!n) return null;
  const slug = donorNameToSlug(n);
  if (!slug) return null;
  const tokens = narrowTokens(slug);
  if (tokens.length === 0) return null;
  if (tokens.length === 1 && TOO_COMMON_ALONE.has(tokens[0])) return null;
  const lower = n.toLowerCase();
  return tokens.every((t) => lower.includes(t)) ? slug : null;
}
