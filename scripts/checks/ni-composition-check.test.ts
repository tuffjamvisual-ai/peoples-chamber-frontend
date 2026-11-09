// Northern Ireland seats against Open Council Data's page (NI2): parsing the page, our columns, the differences.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/ni-composition-check.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseNiPage, toNiColumns, compareNi, niCheckDue } from '../../lib/ni-composition-check';

const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'opencouncildata-nicouncils-2026-11-09.html'), 'utf8');

test('the page gives the 11 councils, not the totals row', () => {
  const t = parseNiPage(html);
  assert.equal(t.size, 11);
  assert.ok(!t.has('Totals:'));
  assert.deepEqual(t.get('Belfast'), { sf: 22, dup: 14, alliance: 10, uup: 2, sdlp: 4, others: 8, total: 60 });
  assert.equal([...t.values()].reduce((s, c) => s + c.total, 0), 462);
});

test('our party codes fold into the page\'s columns, with TUV, PBP, PUP, Green and independents as others', () => {
  // Belfast as counted from the May 2026 councillors file.
  const belfast = { sf: 22, dup: 14, alliance: 11, sdlp: 4, green: 3, other: 2, uup: 2, tuv: 1, pbp: 1 };
  assert.deepEqual(toNiColumns(belfast, 60), { sf: 22, dup: 14, alliance: 11, uup: 2, sdlp: 4, others: 7, total: 60 });
});

test('differences are listed per council; matching councils are not', () => {
  const theirs = parseNiPage(html);
  const ours = new Map([
    ['Belfast', toNiColumns({ sf: 22, dup: 14, alliance: 11, sdlp: 4, green: 3, other: 2, uup: 2, tuv: 1, pbp: 1 }, 60)],
    ['Fermanagh and Omagh', toNiColumns({ sf: 21, uup: 7, dup: 6, other: 2, alliance: 2, sdlp: 2 }, 40)],
  ]);
  const d = compareNi(ours, theirs);
  assert.ok(d.includes('Belfast: Alliance 11 here, 10 there; others 7 here, 8 there'));
  assert.ok(!d.some((l) => l.startsWith('Fermanagh and Omagh:')));
  assert.ok(d.some((l) => l === 'Mid Ulster: on the page, not held here'));
});

test('due on the first of the month only', () => {
  assert.equal(niCheckDue(new Date('2026-12-01T17:03:00Z')), true);
  assert.equal(niCheckDue(new Date('2026-12-02T17:03:00Z')), false);
});
