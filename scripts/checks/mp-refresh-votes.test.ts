// F03 (ENTRY 134; T2's audit/t2-prep/f03-exact.md, tests 1 and 2): a new division refreshes exactly its voters' pages and
// vote tags, nothing site-wide; the voters come from the sync's own rows.
// Run: npx tsx --tsconfig tsconfig.json --test scripts/checks/mp-refresh-votes.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mpRefreshPlan } from '../../lib/mp-refresh-plan';
import { divisionRows } from '../../lib/division-rows';

const votesTag = (id: number) => `mp-votes:${id}`; // as lib/mp-cache.ts mpVotesTag

test('a refresh plan names each voter once: their page and their votes tag, nothing else', () => {
  const plan = mpRefreshPlan([4504, 172, 172], votesTag);
  assert.deepEqual(plan.paths, ['/mps/4504', '/mps/172']);
  assert.deepEqual(plan.tags, ['mp-votes:4504', 'mp-votes:172']);
  for (const t of [...plan.paths, ...plan.tags]) assert.ok(!['mp-pages', 'mp-vote-counts', 'data-freshness', '/mps/[id]'].includes(t), t);
});

test('no voters, nothing refreshed', () => {
  assert.deepEqual(mpRefreshPlan([], votesTag), { ids: [], paths: [], tags: [] });
});

test('bad ids are dropped', () => {
  assert.deepEqual(mpRefreshPlan([0, -3, 1.5, NaN, 12], votesTag).ids, [12]);
});

test('the voters come from the division rows: Ayes, Noes, a teller and a both-lobby member, each once', () => {
  const m = (id: number) => ({ MemberId: id, Party: 'Labour' });
  const det = { DivisionId: 9, Number: 123, Title: 'Test', Ayes: [m(1), m(2), m(3)], AyeTellers: [m(3)], Noes: [m(4), m(5), m(1)], NoTellers: [m(6)] };
  const { rows, bothLobby } = divisionRows(det, '2026-11-16');
  const voters = new Set(rows.map((r) => r.member_id));
  assert.deepEqual([...voters].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.equal(rows.length, 6);
  assert.equal(rows.find((r) => r.member_id === 1)?.vote_type, 'both');
  assert.deepEqual(bothLobby, [1]);
  assert.equal(rows.find((r) => r.member_id === 3)?.vote_type, 'aye'); // listed in Ayes and AyeTellers: kept once
  assert.equal(rows.find((r) => r.member_id === 6)?.is_teller, true);
  assert.equal(rows[0].division_date, '2026-11-16 00:00:00');
});
