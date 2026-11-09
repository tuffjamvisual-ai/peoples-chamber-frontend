// Unit tests for scripts/career-sync-changes.ts (SY2, 9 Nov 2026): which MPs the nightly career sync fetches in full, and
// which bills it rebuilds, from Parliament's cheap lists against the stored records.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/career-sync-changes.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { membersToRefresh, storedState, billsSince, billHolders, withBills, postKey, SAFETY_MAX, type LiveState } from '../career-sync-changes';
import type { CareerEntry } from '../../lib/career-timeline';

const src = { title: 'UK Parliament: Members API, career', url: 'https://members.parliament.uk/member/1446/career' };
const e = (over: Partial<CareerEntry>): CareerEntry => ({ group: 'elections', start: '2001-06-07', end: 'present', title: '', organisation: 'House of Commons', detail: null, source: src, ...over });
const bill = (id: number, title: string, end: string): CareerEntry => ({ group: 'bills', start: null, end, title, organisation: null, detail: 'Sponsor', outcome: 'in_progress', stage: 'Committee stage', session: '2024-26', source: { title: `UK Parliament Bills: ${title}`, url: `https://bills.parliament.uk/bills/${id}` } });

// Chris Bryant (1446) as stored: his seat, his party, one post held now and one ended, and a bill.
const bryant: CareerEntry[] = [
  e({ title: 'MP for Rhondda and Ogmore', start: '2024-07-04' }),
  e({ title: 'MP for Rhondda', start: '2001-06-07', end: '2024-05-30' }),
  e({ title: 'Party: Labour', start: '2001-06-07' }),
  e({ group: 'posts', title: 'Secretary of State for Northern Ireland', start: '2026-07-20', organisation: 'Northern Ireland Office', detail: 'Government post' }),
  e({ group: 'posts', title: 'Minister of State (Department for Business and Trade)', start: '2025-09-06', end: '2026-07-20', organisation: 'Department for Business and Trade', detail: 'Government post' }),
  bill(4001, 'Example Bill', '2026-10-01'),
];
const NOW = new Date('2026-11-09T04:00:00Z');
const RECENT = { '1446': '2026-11-08T04:30:00Z', '4820': '2026-11-08T04:31:00Z' };
const liveAsStored = (): LiveState => ({
  members: new Map([[1446, { party: 'Labour', seat: 'Rhondda and Ogmore' }], [4820, { party: 'Labour', seat: 'Erith and Thamesmead' }]]),
  posts: new Map([[1446, new Set([postKey('Government post', 'Secretary of State for Northern Ireland')])]]),
});
const abena: CareerEntry[] = [e({ title: 'MP for Erith and Thamesmead', start: '2019-12-12' }), e({ title: 'Party: Labour', start: '2019-12-12' })];
const stored = () => new Map<number, CareerEntry[] | null>([[1446, bryant], [4820, abena]]);

test('the stored record gives the posts, party and seat held now', () => {
  const s = storedState(bryant);
  assert.deepEqual([...s.posts], ['Government post|Secretary of State for Northern Ireland']);
  assert.equal(s.party, 'Labour');
  assert.equal(s.seat, 'Rhondda and Ogmore');
});

test('nothing changed: no full fetches', () => {
  assert.equal(membersToRefresh([1446, 4820], stored(), liveAsStored(), RECENT, NOW).size, 0);
});

test('an MP gaining a post is fetched in full', () => {
  const live = liveAsStored();
  live.posts.set(4820, new Set([postKey('Opposition post', 'Shadow Minister (Health and Social Care)')]));
  const r = membersToRefresh([1446, 4820], stored(), live, RECENT, NOW);
  assert.deepEqual([...r.keys()], [4820]);
  assert.deepEqual(r.get(4820), ['gained post: Opposition post: Shadow Minister (Health and Social Care)']);
});

test('an MP losing a post is fetched in full', () => {
  const live = liveAsStored();
  live.posts.delete(1446);
  const r = membersToRefresh([1446, 4820], stored(), live, RECENT, NOW);
  assert.deepEqual([...r.keys()], [1446]);
  assert.deepEqual(r.get(1446), ['lost post: Government post: Secretary of State for Northern Ireland']);
});

test('an MP changing party is fetched in full', () => {
  const live = liveAsStored();
  live.members.set(4820, { party: 'Independent', seat: 'Erith and Thamesmead' });
  assert.deepEqual(membersToRefresh([1446, 4820], stored(), live, RECENT, NOW).get(4820), ['party: Labour to Independent']);
});

test('an MP changing seat is fetched in full', () => {
  const live = liveAsStored();
  live.members.set(1446, { party: 'Labour', seat: 'Rhondda' });
  assert.deepEqual(membersToRefresh([1446, 4820], stored(), live, RECENT, NOW).get(1446), ['seat: Rhondda and Ogmore to Rhondda']);
});

test('an MP who is no longer a current member is fetched in full', () => {
  const live = liveAsStored();
  live.members.delete(4820);
  assert.match(membersToRefresh([1446, 4820], stored(), live, RECENT, NOW).get(4820)![0], /^membership: no longer a current Commons member/);
});

test('a new MP (no stored record) is fetched in full', () => {
  const live = liveAsStored();
  live.members.set(5500, { party: 'Reform UK', seat: 'Runcorn and Helsby' });
  const s = stored(); s.set(5500, null);
  assert.deepEqual(membersToRefresh([1446, 4820, 5500], s, live, { ...RECENT, '5500': '2026-11-08T04:00:00Z' }, NOW).get(5500), ['new: no stored record']);
});

test('"Labour (Co-op)" in the members list is the stored "Labour", not a change of party', () => {
  const live = liveAsStored();
  live.members.set(1446, { party: 'Labour (Co-op)', seat: 'Rhondda and Ogmore' });
  assert.equal(membersToRefresh([1446, 4820], stored(), live, RECENT, NOW).size, 0);
  live.members.set(4820, { party: 'Labour Independent', seat: 'Erith and Thamesmead' });
  assert.deepEqual([...membersToRefresh([1446, 4820], stored(), live, RECENT, NOW).keys()], [4820]);
});

test('differences in case and spacing are not changes', () => {
  const live = liveAsStored();
  live.members.set(1446, { party: 'labour', seat: 'Rhondda  and Ogmore ' });
  assert.equal(membersToRefresh([1446, 4820], stored(), live, RECENT, NOW).size, 0);
});

test('safety net: a record fetched in full over 30 days ago, or never, at most 25 a night, oldest first', () => {
  const ids = Array.from({ length: 40 }, (_, i) => 6000 + i);
  const s = new Map<number, CareerEntry[] | null>(ids.map((id) => [id, abena]));
  const live: LiveState = { members: new Map(ids.map((id) => [id, { party: 'Labour', seat: 'Erith and Thamesmead' }])), posts: new Map() };
  const fullAt: Record<string, string> = {};
  ids.forEach((id, i) => { if (i >= 5) fullAt[String(id)] = new Date(Date.UTC(2026, 8, 1 + i)).toISOString(); }); // 5 never; the rest from 6 Sep
  const r = membersToRefresh(ids, s, live, fullAt, NOW);
  assert.equal(r.size, SAFETY_MAX);
  assert.deepEqual([...r.keys()].slice(0, 6), [6000, 6001, 6002, 6003, 6004, 6005]); // never fetched first, then the oldest
  assert.match(r.get(6005)![0], /^safety net: last full fetch 2026-09-06/);
  // A record fetched in full 29 days ago is left alone.
  assert.equal(membersToRefresh([4820], stored(), liveAsStored(), { '4820': '2026-10-11T04:00:00Z' }, NOW).size, 0);
  assert.equal(membersToRefresh([4820], stored(), liveAsStored(), { '4820': '2026-10-09T04:00:00Z' }, NOW).size, 1);
});

test('a bill updated after the cursor is rebuilt; paging stops at the first older bill', () => {
  const page = [{ billId: 4305, lastUpdate: '2026-11-09T18:49:56' }, { billId: 4001, lastUpdate: '2026-11-09T01:00:00' }, { billId: 3999, lastUpdate: '2026-11-07T10:00:00' }];
  const r = billsSince(page, '2026-11-08T03:57:00Z');
  assert.deepEqual(r.changed.map((b) => b.billId), [4305, 4001]);
  assert.equal(r.done, true);
  const full = billsSince(page.slice(0, 2), '2026-11-08T03:57:00Z');
  assert.equal(full.done, false); // every bill on the page is newer: read the next page
  assert.equal(billsSince([], '2026-11-08T03:57:00Z').done, true);
});

test('a known bill is found in the records that hold it, and replaced there; a new bill is added; nothing else changes', () => {
  assert.deepEqual(billHolders(stored()).get(4001), [1446]);
  const updated = bill(4001, 'Example Bill', '2026-11-09');
  const added = bill(4305, 'Building Safety Bill', '2026-11-09');
  const out = withBills(bryant, new Map([[4001, updated], [4305, added]]));
  assert.equal(out.length, bryant.length + 1);
  assert.deepEqual(out.slice(0, 5), bryant.slice(0, 5));
  assert.deepEqual(out[5], updated);
  assert.deepEqual(out[6], added);
});
