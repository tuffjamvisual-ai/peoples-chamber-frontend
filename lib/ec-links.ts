// Electoral Commission links (24 Oct 2026). A donation's EC reference opens the Commission's own donations search for
// that reference, the same address the donor pages have always used. One builder so every page links the same way.
export function ecDonationSearchUrl(ecRef: string): string {
  return `https://search.electoralcommission.org.uk/Search/Donations?currentPage=1&rows=10&query=${encodeURIComponent(ecRef)}&sort=AcceptedDate&order=desc`;
}
