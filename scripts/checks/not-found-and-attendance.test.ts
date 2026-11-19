// Search Console findings (owner approved 19 Nov 2026, Cowork ENTRY 364 items 1 and 4).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/not-found-and-attendance.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attendanceSince } from '../../lib/mp-attendance';

test('attendance counts from the later of 4 July 2024 and the MP taking their seat', () => {
  assert.equal(attendanceSince('2026-06-18T00:00:00'), 'since taking their seat on 18 June 2026'); // Lara Bird, /mps/5449
  assert.equal(attendanceSince('2025-05-01'), 'since taking their seat on 1 May 2025');
  assert.equal(attendanceSince('2024-07-04'), 'since July 2024');
  assert.equal(attendanceSince('2010-05-06'), 'since July 2024');
  assert.equal(attendanceSince(null), 'since July 2024');
});

const src = (p: string) => fs.readFileSync(p, 'utf8');
test('an unknown member: a server error from Parliament after History has no such member is a 404, not a 500', () => {
  const s = src('lib/former-mps.ts');
  assert.match(s, /memberRecord\(memberId\)\.catch\(\(e: Error\) => \{ if \(\/HTTP 5\\d\\d\/\.test\(e\.message\)\) return null; throw e; \}\)/);
});
test('unknown welfare areas and a Lords page past the end are 404s; an MP with no second jobs goes to their MP page', () => {
  for (const p of ['app/tools/welfare/local-authority/[gss]/page.tsx', 'app/tools/welfare/constituency/[gss]/page.tsx']) { assert.match(src(p), /if \(!name\) notFound\(\)/); assert.match(src(p), /if \(!\(await areaName\(gssCode\)\)\) notFound\(\)/); }
  assert.match(src('app/lords/LordsListing.tsx'), /if \(page > Math\.max\(1, Math\.ceil\(peers\.length \/ DATALIST_PER_PAGE\)\)\) notFound\(\);/);
  assert.equal((src('app/second-jobs/_lib/MemberDetail.tsx').match(/if \(await mpExists\(/g) ?? []).length, 2);
});
