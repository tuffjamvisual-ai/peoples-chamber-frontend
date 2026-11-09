// QA1 A1 (owner approved, 9 Nov 2026): bill status agreement. No network or database (the stored data is checked by
// scripts/checks/qa/bill-status-data.ts in the weekly live check). Run: npx tsx --test scripts/checks/bill-status-agreement.test.ts
//
// EXPECTED FAILURE until UX1a: the status is still worked out in several places (the bill page and its layout, the
// bill grids, the session archive, This week, the search route). The code rule is marked todo, so it is reported but
// does not fail the run. When UX1a is merged, set BILL_STATUS_MODULE in scripts/checks/qa/bill-status-rules.ts and
// remove the todo option below: from then on any second place that reads the raw flags fails the test run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { codeOffenders, flagReads, stagesAfterEnd, usesFlags, BILL_STATUS_MODULE, type StoredBill } from './qa/bill-status-rules';

const ROOT = path.join(__dirname, '..', '..');

test('one status function: no reader facing file reads the raw bill flags except the status module',
  { todo: BILL_STATUS_MODULE ? undefined : 'expected failure until UX1a sets the one bill status function' },
  () => {
    const offenders = codeOffenders(ROOT);
    assert.deepEqual(offenders, [], `these files work out a bill status themselves:\n  ${offenders.join('\n  ')}`);
  });

test('the scan ignores flags in select strings, comments and type members', () => {
  assert.equal(usesFlags(`const q = supabase.from('bill').select('id, is_act, bill_withdrawn');`), false);
  assert.equal(usesFlags(`// is_act is the Royal Assent flag\nconst x = 1;`), false);
  assert.equal(usesFlags(`type B = {\n  is_act: boolean;\n  bill_withdrawn: string | null;\n};`), false);
  assert.equal(usesFlags(`if (!bill.is_act && !bill.bill_withdrawn) show();`), true);
  assert.equal(usesFlags(`const closed = b.isDefeated === true;`), true);
  assert.deepEqual(flagReads(`const { is_act, bill_withdrawn: w } = bill;`), ['bill_withdrawn', 'is_act']);
  assert.equal(usesFlags(`const el = <p>The MP's bill is_act stays text</p>;`, 'x.tsx'), false);
});

const bill = (over: Partial<StoredBill>, sittings: [string, string][]): StoredBill => ({
  id: 1, bill_withdrawn: null, is_act: false, current_stage: null,
  stages: { items: sittings.map(([description, date]) => ({ description, stageSittings: [{ date: `${date}T00:00:00` }] })) },
  ...over,
});

test('a withdrawn bill lists no stage after the withdrawal', () => {
  assert.deepEqual(stagesAfterEnd(bill({ bill_withdrawn: '2026-05-01T00:00:00' }, [['1st reading', '2026-03-01'], ['2nd reading', '2026-04-30']])), []);
  assert.deepEqual(stagesAfterEnd(bill({ bill_withdrawn: '2026-05-01T00:00:00' }, [['1st reading', '2026-03-01'], ['2nd reading', '2026-06-12']])), ['2nd reading 2026-06-12']);
});

test('an Act lists no stage after Royal Assent', () => {
  assert.deepEqual(stagesAfterEnd(bill({ is_act: true }, [['3rd reading', '2026-01-10'], ['Royal Assent', '2026-02-01']])), []);
  assert.deepEqual(stagesAfterEnd(bill({ is_act: true }, [['Royal Assent', '2026-02-01'], ['Consideration of amendments', '2026-02-20']])), ['Consideration of amendments 2026-02-20']);
});

test('a live bill, or an Act with no Royal Assent sitting, is not judged', () => {
  assert.deepEqual(stagesAfterEnd(bill({}, [['1st reading', '2026-03-01'], ['2nd reading', '2027-01-01']])), []);
  assert.deepEqual(stagesAfterEnd(bill({ is_act: true }, [['3rd reading', '2026-01-10']])), []);
});
