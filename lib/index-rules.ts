// Which detail pages search engines are asked to index, as pure rules shared by the pages' metadata and the sitemap
// (Search Console "discovered, not indexed" audit, 19 Nov 2026; owner approved, Cowork ENTRY 367 items 5 and 6). No reads
// here: each caller passes what it has already read. Tests: scripts/checks/orgs-lords-index.test.ts.

// Cowork ENTRY 367 item 5: one canonical page per organisation. 1,357 lobbying registry organisations have both
// /organisations/<slug> and /lobbying/<slug> (the same slug and the same lobby_orgs id). Both list the same meetings with
// ministers and lobbying firms, the lobbying page in full (every meeting, every firm with every quarter, the four counts),
// the organisation page only the latest five of each. The organisation page holds more only when it also has donations,
// contracts, framework places or grants, which the lobbying page never shows (7 organisations on 19 Nov 2026). So:
//   - registry organisation with none of those: /lobbying/<slug> is canonical, /organisations/<slug> names it;
//   - registry organisation with any of those: /organisations/<slug> is canonical, /lobbying/<slug> names it.
// Both pages keep working; the sitemap lists only the canonical one.
export type OrgCanonicalFields = {
  kind: 'registry' | 'company';
  lobby_org_id: number | null;
  donations: number;
  contracts: number;
  framework_places: number;
  grants: number;
};

// Records the organisation page shows that the lobbying page does not.
export const orgHasCompanyRecords = (o: Pick<OrgCanonicalFields, 'donations' | 'contracts' | 'framework_places' | 'grants'>) =>
  o.donations + o.contracts + o.framework_places + o.grants > 0;

// For an organisation page whose lobbying page is the same organisation (same slug, same lobby_orgs id): which of the two is canonical.
export function orgCanonical(o: OrgCanonicalFields, lobbyOrgId: number | null | undefined): 'organisations' | 'lobbying' {
  if (o.kind !== 'registry' || o.lobby_org_id == null || lobbyOrgId == null || o.lobby_org_id !== lobbyOrgId) return 'organisations';
  return orgHasCompanyRecords(o) ? 'organisations' : 'lobbying';
}

// Cowork ENTRY 367 item 5: a supplier with 1 to 3 contracts and no other record. An organisation page (company pages
// only: a registry page always has meetings or lobbying) with
//   - 1 to 3 contracts and framework places together (organisation_index contracts + framework_places),
//   - no political donations, no grants, no meetings with ministers and no consultant lobbying quarters,
//   - no checked link to a lobbying registry organisation (organisation_links, the page's "Also see" line),
//   - no contract held back for checking (contract_awards.held_back: a value over 1 billion pounds, not in the count).
// Such a page is noindex, follow and left out of the sitemap; it stays reachable, in /organisations and in site search.
export const THIN_SUPPLIER_MAX_CONTRACTS = 3;
export type ThinSupplierFields = OrgCanonicalFields & { meetings: number; lobbying_quarters: number };
export function thinSupplier(o: ThinSupplierFields, other: { linked: boolean; heldBack: number }): boolean {
  if (o.kind !== 'company') return false;
  const n = o.contracts + o.framework_places;
  if (n < 1 || n > THIN_SUPPLIER_MAX_CONTRACTS) return false;
  if (o.donations || o.grants || o.meetings || o.lobbying_quarters) return false;
  return !other.linked && other.heldBack === 0;
}

// Cowork ENTRY 367 item 6: a member of the House of Lords with a page and no activity on record: no posts (government,
// opposition or other), no committee memberships, no recorded votes, no written questions and no current entries on the
// register of interests: what /lords/<id> shows. Such a page is noindex, follow and left out of the sitemap.
export type PeerPostFields = { government_posts: unknown[] | null; opposition_posts: unknown[] | null; other_posts: unknown[] | null; committee_memberships: unknown[] | null };
export const peerHasPosts = (p: PeerPostFields) =>
  (p.government_posts?.length ?? 0) + (p.opposition_posts?.length ?? 0) + (p.other_posts?.length ?? 0) + (p.committee_memberships?.length ?? 0) > 0;
export function peerNoActivity(p: PeerPostFields, counts: { votes: number; questions: number; interests: number }): boolean {
  return !peerHasPosts(p) && counts.votes === 0 && counts.questions === 0 && counts.interests === 0;
}
