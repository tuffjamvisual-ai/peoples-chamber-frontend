// MP name matching ignores titles (owner approved, Cowork ENTRY 361, 19 Nov 2026): lib/name-titles.js and the places
// that use it.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/name-titles.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bareName, nameMatchKey, isPeerName, notPresentedAsMp, pickMp } from '../../lib/name-titles';
import { matchMinisters, type MpName } from '../../lib/spad-roster';

// A few MPs as our table holds them (name, display name, current or not).
const MPS: MpName[] = [
  { member_id: 5072, name: 'Andrew Snowden', display_name: 'Andrew Snowden', current_member: true },
  { member_id: 4462, name: 'Tom Tugendhat', display_name: 'Tom Tugendhat', current_member: true },
  { member_id: 4514, name: 'Keir Starmer', display_name: 'Keir Starmer', current_member: true },
  { member_id: 4850, name: 'Gareth Davies', display_name: 'Gareth Davies', current_member: true },
  { member_id: 491, name: 'Angela Eagle', display_name: 'Dame Angela Eagle', current_member: true },
  { member_id: 1, name: 'Peter Lilley', display_name: 'Peter Lilley', current_member: false },
  // Two people of one name: one sitting, one former.
  { member_id: 10, name: 'John Smith', display_name: 'John Smith', current_member: true },
  { member_id: 11, name: 'John Smith', display_name: 'John Smith', current_member: false },
  // Two sitting MPs of one name: neither may be guessed.
  { member_id: 20, name: 'Jane Doe', display_name: 'Jane Doe', current_member: true },
  { member_id: 21, name: 'Jane Doe', display_name: 'Jane Doe', current_member: true },
];
const find = (name: string) => {
  const k = nameMatchKey(name);
  return (pickMp(name, MPS.filter((m) => nameMatchKey(m.name || '') === k || nameMatchKey(m.display_name || '') === k)) as MpName | null)?.member_id ?? null;
};

test("'Mr Andrew Snowden' is Andrew Snowden MP (/mps/5072)", () => {
  assert.equal(nameMatchKey('Mr Andrew Snowden'), 'andrew snowden');
  assert.equal(find('Mr Andrew Snowden'), 5072);
});

test('every listed title and the letters after a name are left out', () => {
  for (const t of ['Mr', 'Mrs', 'Ms', 'Miss', 'Mx', 'Dr', 'Dr.', 'Sir', 'Dame', 'Professor', 'Prof', 'Rev', 'Reverend', 'Cllr', 'Councillor', 'Rt Hon', 'The Rt Hon', 'The Rt', 'Hon', 'Right Honourable', 'The Rt Hon Sir']) {
    assert.equal(nameMatchKey(`${t} Andrew Snowden`), 'andrew snowden', t);
  }
  for (const p of ['MP', 'KC', 'QC', 'PC', 'CBE', 'OBE', 'MBE', 'KBE', 'DBE', 'CB', 'KCB', 'MBE VR MP', 'KCB KC MP', 'DBE MP']) {
    assert.equal(nameMatchKey(`Andrew Snowden ${p}`), 'andrew snowden', p);
  }
  assert.equal(bareName('The Rt Hon Sir Keir Starmer KCB KC MP'), 'Keir Starmer');
});

test('cases found in the data (LIST.md) link to the right MP', () => {
  assert.equal(find('The Rt Hon Tom Tugendhat MBE VR MP'), 4462);
  assert.equal(find('The Rt Hon Sir Keir Starmer KCB KC MP'), 4514);
  assert.equal(find('The Rt Hon Dame Angela Eagle DBE MP'), 491);
});

test('a peer is never linked to an MP', () => {
  for (const n of ['Lord Lilley', 'The Lord Lilley', 'Baroness Smith', 'The Rt Hon Lord True CBE', 'The Earl of Kinnoull', 'Lady Hermon', 'Viscount Younger']) {
    assert.equal(isPeerName(n), true, n);
  }
  assert.equal(find('Lord Peter Lilley'), null);
  assert.equal(pickMp('Lord Andrew Snowden', [MPS[0]]), null);
});

test("letters after a name without MP are not an MP: 'Gareth Davies CB' (head of the National Audit Office)", () => {
  assert.equal(notPresentedAsMp('Gareth Davies CB'), true);
  assert.equal(notPresentedAsMp('Sir Keir Starmer KCB KC MP'), false);
  assert.equal(notPresentedAsMp('Gareth Davies'), false);
});

test('two people of one name: the single sitting MP, never a guess between two sitting MPs', () => {
  assert.equal(find('Mr John Smith'), 10);
  assert.equal(find('Dr Jane Doe'), null);
});

test('the special advisers list matches ministers through the shared rule', () => {
  const rows = [
    { minister_name: 'The Rt Hon Tom Tugendhat MBE VR MP', minister_title: 'Minister for Security' },
    { minister_name: 'The Rt Ed Miliband MP', minister_title: 'Secretary of State' },
    { minister_name: 'The Rt Hon Lord True CBE', minister_title: 'Leader of the House of Lords' },
    { minister_name: 'The Rt Hon Jane Doe MP', minister_title: 'Minister' },
  ] as unknown as Parameters<typeof matchMinisters>[0];
  const { ids, unmatched } = matchMinisters(rows, MPS);
  assert.equal(ids.get('The Rt Hon Tom Tugendhat MBE VR MP'), 4462);
  assert.equal(ids.has('The Rt Hon Lord True CBE'), false);
  assert.equal(ids.has('The Rt Hon Jane Doe MP'), false);
  assert.ok(unmatched.some((u) => u.startsWith('The Rt Hon Jane Doe MP') && u.includes('2 MPs of that name')));
});

test('the secretariat page keys its MP lookup on the ids, not on a Set (which always gives {})', () => {
  assert.equal(JSON.stringify([new Set([5072])]), '[{}]');
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'secretariats', '[slug]', 'page.tsx'), 'utf8');
  assert.ok(src.includes('JSON.stringify([[...allOfficerIds].sort((a, b) => a - b)])'));
  assert.ok(!src.includes('JSON.stringify([allOfficerIds])'));
});
