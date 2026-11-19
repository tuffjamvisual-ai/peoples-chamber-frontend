// Cowork ENTRY 367 items 5 and 6: the index rules in lib/index-rules.ts (one canonical organisation page, thin suppliers,
// Lords members with no activity).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/orgs-lords-index.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orgCanonical, thinSupplier, peerHasPosts, peerNoActivity, type ThinSupplierFields } from '../../lib/index-rules';

const org = (o: Partial<ThinSupplierFields>): ThinSupplierFields => ({
  kind: 'company', lobby_org_id: null, donations: 0, contracts: 0, framework_places: 0, grants: 0, meetings: 0, lobbying_quarters: 0, ...o,
});

test('registry organisation with meetings only: the lobbying page is canonical', () => {
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7, lobbying_quarters: 9 }), 12), 'lobbying');
});
test('registry organisation with contracts, grants or donations: the organisation page is canonical', () => {
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7, contracts: 1 }), 12), 'organisations');
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7, grants: 2 }), 12), 'organisations');
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7, donations: 1 }), 12), 'organisations');
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7, framework_places: 3 }), 12), 'organisations');
});
test('no lobbying page of the same organisation: the organisation page stays canonical', () => {
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7 }), 13), 'organisations');
  assert.equal(orgCanonical(org({ kind: 'registry', lobby_org_id: 12, meetings: 7 }), null), 'organisations');
  // A company page that shares a slug with a public body's lobbying page (network-rail) is a different page.
  assert.equal(orgCanonical(org({ kind: 'company', contracts: 40 }), 767), 'organisations');
});

const none = { linked: false, heldBack: 0 };
test('thin supplier: 1 to 3 contracts and framework places and nothing else', () => {
  assert.equal(thinSupplier(org({ contracts: 1 }), none), true);
  assert.equal(thinSupplier(org({ contracts: 3 }), none), true);
  assert.equal(thinSupplier(org({ contracts: 1, framework_places: 2 }), none), true);
  assert.equal(thinSupplier(org({ framework_places: 1 }), none), true);
});
test('not thin: no contracts, or more than 3', () => {
  assert.equal(thinSupplier(org({}), none), false);
  assert.equal(thinSupplier(org({ contracts: 4 }), none), false);
  assert.equal(thinSupplier(org({ contracts: 2, framework_places: 2 }), none), false);
});
test('not thin: any other record', () => {
  assert.equal(thinSupplier(org({ contracts: 1, donations: 1 }), none), false);
  assert.equal(thinSupplier(org({ contracts: 1, grants: 1 }), none), false);
  assert.equal(thinSupplier(org({ contracts: 1, meetings: 1 }), none), false);
  assert.equal(thinSupplier(org({ contracts: 1, lobbying_quarters: 1 }), none), false);
  assert.equal(thinSupplier(org({ contracts: 1 }), { linked: true, heldBack: 0 }), false);
  assert.equal(thinSupplier(org({ contracts: 1 }), { linked: false, heldBack: 1 }), false);
  assert.equal(thinSupplier(org({ kind: 'registry', lobby_org_id: 5, contracts: 1 }), none), false);
});

const noPosts = { government_posts: [], opposition_posts: [], other_posts: [], committee_memberships: [] };
const zero = { votes: 0, questions: 0, interests: 0 };
test('Lords member with nothing on record: no activity', () => {
  assert.equal(peerNoActivity(noPosts, zero), true);
  assert.equal(peerNoActivity({ government_posts: null, opposition_posts: null, other_posts: null, committee_memberships: null }, zero), true);
});
test('Lords member with any post, committee, vote, question or interest: activity', () => {
  const post = [{ name: 'Lord in Waiting' }];
  assert.equal(peerHasPosts({ ...noPosts, government_posts: post }), true);
  assert.equal(peerNoActivity({ ...noPosts, opposition_posts: post }, zero), false);
  assert.equal(peerNoActivity({ ...noPosts, other_posts: post }, zero), false);
  assert.equal(peerNoActivity({ ...noPosts, committee_memberships: post }, zero), false);
  assert.equal(peerNoActivity(noPosts, { ...zero, votes: 1 }), false);
  assert.equal(peerNoActivity(noPosts, { ...zero, questions: 1 }), false);
  assert.equal(peerNoActivity(noPosts, { ...zero, interests: 1 }), false);
});
