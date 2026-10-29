// The /news/<slug> address of a stored press release, from its gov_url: the same rule as the news_slug column
// (migration 2026-10-16k): the last path segment, without query or hash, lower case, letters, digits and hyphens only.
// Used by the press release crons to refresh exactly the pages they change (owner's approval, 29 Oct 2026).
export function newsPath(govUrl: string | null | undefined): string | null {
  if (!govUrl) return null;
  const clean = govUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const slug = clean.slice(clean.lastIndexOf('/') + 1).replace(/[^A-Za-z0-9-]/g, '').toLowerCase();
  return slug ? `/news/${slug}` : null;
}
