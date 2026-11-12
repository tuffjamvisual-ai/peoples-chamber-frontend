// T1-PR: the 'Checked GOV.UK at' line, in UK time.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/press-checked-line.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkedLine } from '../../lib/press-checked-line';

test('GMT in winter, BST in summer, house style', () => {
  assert.equal(checkedLine('2026-11-12T09:17:04Z'), 'Checked GOV.UK at 09:17, 12 November');
  assert.equal(checkedLine('2026-07-01T23:16:00Z'), 'Checked GOV.UK at 00:16, 2 July');
});
