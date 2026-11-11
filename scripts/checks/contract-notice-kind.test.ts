// T1-AUD3 (1): change notices that change nothing are not shown as value changes.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/contract-notice-kind.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeKind } from '../../lib/contract-notice-kind';

const NESO = 'This notice does not describe a modification of the contract. Instead this notice is being used as an addendum to contract detail notice. This notice has a copy of the redacted contract included, which is a requirement of the Procurement Act.';

test('the NESO addendum is an addendum with the contract document, not a change', () => {
  assert.deepEqual(changeKind(NESO, 16799683, 16799683), { kind: 'addendum', label: 'Addendum: contract document attached' });
  assert.equal(changeKind(NESO, 16799683, null).kind, 'addendum');
});
test('a correction that keeps the value is a correction', () => {
  assert.equal(changeKind('Correction to the supplier address in the previous notice.', 500000, 500000).kind, 'correction');
});
test('the same value with no explanation is shown as unchanged', () => {
  assert.equal(changeKind('Extension of term by six months.', 100, 100).kind, 'unchanged');
});
test('a new value is a value change', () => {
  assert.equal(changeKind('Extension of term by six months.', 120, 100).kind, 'value_change');
  assert.equal(changeKind(null, 120, null).kind, 'value_change');
});

test('a contract details notice that updates a contract is an update, not a value change', () => {
  assert.deepEqual(changeKind('Inclusion of Lot B', 500000, null, 'UK7'), { kind: 'update', label: 'Contract details updated' });
  assert.equal(changeKind('Extension of term.', 120, 100, 'UK10').kind, 'value_change');
  assert.equal(changeKind('Extension of term.', 120, 100, null).kind, 'value_change'); // older rules: no form code
});
