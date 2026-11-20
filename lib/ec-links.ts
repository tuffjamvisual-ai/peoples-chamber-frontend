// Electoral Commission links (24 Oct 2026). A donation's EC reference opens the Commission's own donations search for
// that reference, the same address the donor pages have always used. One builder so every page links the same way.
// The Commission's donations search itself, for a Sources fold that lists the register once (Cowork ENTRY 369, ENTRY 412).
export const EC_DONATIONS_SEARCH = 'https://search.electoralcommission.org.uk/Search/Donations';

export function ecDonationSearchUrl(ecRef: string): string {
  return `https://search.electoralcommission.org.uk/Search/Donations?currentPage=1&rows=10&query=${encodeURIComponent(ecRef)}&sort=AcceptedDate&order=desc`;
}
