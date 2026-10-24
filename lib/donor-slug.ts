// Donor page slugs (moved here from app/donors/[slug]/page.tsx on 24 Oct 2026 so client components can use them).
// /donors/<slug> finds its donor by exact name through lib/donor-registry.ts; narrowTokens serves the word search it
// falls back to for a slug the registry does not hold, and the page's other cross-references.

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

// The /donors/<slug> for a donor name (24 Oct 2026): every registered donor name has a page, because donor pages now
// find their donor by exact name (lib/donor-registry.ts) instead of by searching words from the slug, so the earlier
// "page exists" checks are no longer needed. Null only for an empty name or one with no letters or digits. When two
// different names share a slug, the page at that slug links to the other name's page.
export function donorPageSlug(name: string | null | undefined): string | null {
  return donorNameToSlug((name ?? '').trim()) || null;
}
