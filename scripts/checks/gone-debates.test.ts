// npx tsx --test scripts/checks/gone-debates.test.ts (ENTRY 649 (4))
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bothCases, leaveOut, MAX_LEFT_OUT } from '../../lib/gone-debates-core';

test('each guid is asked for in both cases, once', () => {
  assert.deepEqual(bothCases(['2444BAA7-F2F7', '2444baa7-f2f7', 'X']), ['2444BAA7-F2F7', '2444baa7-f2f7', 'X', 'x']);
});
test('the list of ids is a bracketed list, nothing when there is none', () => {
  assert.equal(leaveOut([]), null); assert.equal(leaveOut([3, 10]), '(3,10)');
});
test('too many ids: none is left out, never an address that is too long', () => {
  const was = console.error; let said = ''; console.error = (m: string) => { said = m; };
  try { assert.equal(leaveOut(Array.from({ length: MAX_LEFT_OUT + 1 }, (_, i) => i + 1)), null); } finally { console.error = was; }
  assert.match(said, /none left out/);
  assert.ok(String(leaveOut(Array.from({ length: MAX_LEFT_OUT }, (_, i) => 44000 + i))).length < 7000);
});
