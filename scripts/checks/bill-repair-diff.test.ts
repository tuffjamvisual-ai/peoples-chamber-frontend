// The weekly bills repair's change test (JF1b): re-read only a bill new to us or whose list row differs from the stored one.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/bill-repair-diff.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { repairReason } = require('../bill-repair-diff.js') as { repairReason: (listed: Record<string, unknown>, held?: Record<string, unknown>) => string | null };

// Bill 4305 as the list gives it, and as we store it.
const listed = { billId: 4305, shortTitle: 'Building Safety (Remediation of Unsafe Cladding etc) Bill', lastUpdate: '2026-11-09T18:49:56.9439171', isAct: false, isDefeated: false, billWithdrawn: null, currentStage: { description: 'Committee stage' } };
const held = { last_update: '2026-11-09T18:49:56.943+00:00', title: 'Building Safety (Remediation of Unsafe Cladding etc) Bill', status: 'Committee stage', is_act: false, is_defeated: false, bill_withdrawn: null };

test('an unchanged bill is not re-read (stored time to the millisecond, the list to a tenth of a microsecond)', () => {
  assert.equal(repairReason(listed, { ...held, last_update: '2026-11-09T18:49:56.9439171Z' }), null);
});

test('a bill updated after the stored lastUpdate is re-read; so is one Parliament dated earlier than ours', () => {
  assert.equal(repairReason({ ...listed, lastUpdate: '2026-11-10T09:00:00' }, held), 'updated after the stored lastUpdate');
  assert.equal(repairReason({ ...listed, lastUpdate: '2026-11-01T09:00:00' }, held), 'lastUpdate earlier than the stored one');
});

test('a new bill, and list fields that differ at the same lastUpdate, are re-read', () => {
  const same = { ...held, last_update: '2026-11-09T18:49:56.9439171Z' };
  assert.equal(repairReason(listed, undefined), 'new');
  assert.equal(repairReason({ ...listed, shortTitle: 'Building Safety Bill' }, same), 'title differs');
  assert.equal(repairReason({ ...listed, currentStage: { description: 'Report stage' } }, same), 'stage differs');
  assert.equal(repairReason({ ...listed, isAct: true }, same), 'Act flag differs');
  assert.equal(repairReason({ ...listed, isDefeated: true }, same), 'defeated flag differs');
  assert.equal(repairReason({ ...listed, billWithdrawn: '2026-11-09T00:00:00' }, same), 'withdrawn differs');
});

test('a placeholder short title does not count as a change when we hold a real one', () => {
  const same = { ...held, last_update: '2026-11-09T18:49:56.9439171Z' };
  assert.equal(repairReason({ ...listed, shortTitle: '. Bill' }, same), null);
});
