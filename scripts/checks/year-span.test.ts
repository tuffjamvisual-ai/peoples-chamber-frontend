// House style: "2026-27" reads "2026 to 2027" (T1-5x, owner 10 Nov 2026).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/year-span.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yearSpan } from '../../lib/year-span';

test('year spans read "2026 to 2027"', () => {
  assert.equal(yearSpan('2026-27'), '2026 to 2027');
  assert.equal(yearSpan('1999-00'), '1999 to 2000');
  assert.equal(yearSpan('2024-2025'), '2024 to 2025');
  assert.equal(yearSpan('Session 2'), 'Session 2');
});
