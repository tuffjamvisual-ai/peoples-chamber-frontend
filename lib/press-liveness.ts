// Press release liveness from GOV.UK's own list (JF1e, audit JA1, 9 Nov 2026). /api/check-press-release-liveness used to
// HEAD 500 releases every 2 hours, oldest check first, so the whole ~46,500 archive was re-requested about every 4 days
// (about 6,000 GOV.UK requests a day) to catch a handful of removals. GOV.UK's search API lists every current press
// release (filter_content_store_document_type=press_release, 1,000 a page, about 47 requests), and a removed release
// drops out of it. So once a day the route reads that list and compares it with ours; it requests a release's own page
// only when the release is missing from the list (and not already marked removed), is listed again after being marked
// removed, or is listed but has no stored body yet (to fill it, as before). Pure, so it is unit tested.

export const LISTING = 'https://www.gov.uk/api/search.json?filter_content_store_document_type=press_release&fields=link&order=public_timestamp';
export const LISTING_PAGE = 1000;
// A listing that comes back with fewer links than GOV.UK says it holds (a page failed or the index moved) is not used:
// every release missing from it would look removed.
export const LISTING_TOLERANCE = 0.995;
// At most this many releases are queued for their own request in one day; more means the list and our archive no longer
// match (a change at GOV.UK) and is reported rather than requested.
export const MAX_PENDING = 3000;

export type StoredRelease = { id: number; gov_url: string | null; removed_upstream: boolean | null };
export type Pending = { id: number; why: 'missing from the listing' | 'listed again' | 'no stored body' };

// "/government/news/..." from "https://www.gov.uk/government/news/...", the form the listing gives.
export const govPath = (url: string) => url.replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();

export function listingComplete(links: number, total: number): boolean {
  return total > 0 && links >= Math.floor(total * LISTING_TOLERANCE);
}

// The releases to request today, and the counts behind them.
export function livenessPlan(stored: StoredRelease[], listed: Set<string>, noBody: Set<number>): { pending: Pending[]; listed: number; missingAlreadyRemoved: number; overCap: number } {
  const pending: Pending[] = [];
  let listedCount = 0, missingAlreadyRemoved = 0;
  for (const r of stored) {
    if (!r.gov_url) continue;
    const isListed = listed.has(govPath(r.gov_url));
    if (isListed) {
      listedCount++;
      if (r.removed_upstream === true) pending.push({ id: r.id, why: 'listed again' });
      else if (noBody.has(r.id)) pending.push({ id: r.id, why: 'no stored body' });
    } else if (r.removed_upstream === true) missingAlreadyRemoved++;
    else pending.push({ id: r.id, why: 'missing from the listing' });
  }
  const overCap = Math.max(0, pending.length - MAX_PENDING);
  return { pending: pending.slice(0, MAX_PENDING), listed: listedCount, missingAlreadyRemoved, overCap };
}
