// QA1 A2 time words (scripts/checks/qa/rendered-checks.mjs timeWords) with its allowed phrases (house-style-exceptions.json): the
// phrase 'net present value' is a financial term and passes; 'present' as a time word still fails (Cowork ENTRY 765, 27 Nov 2026).
//   node --test scripts/checks/a2-time-words.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeWords } from './qa/rendered-checks.mjs';

test("'net present value' is allowed: the department's own negative net present value", () => {
  assert.deepEqual(timeWords("The appraisal omits the department's own negative net present value. Continue to full article"), []);
});

test("'at present' and 'present' as time words still fail, beside the allowed phrase too", () => {
  assert.equal(timeWords('At present the council has no plan.').length, 1);
  assert.equal(timeWords('The scheme is at present paused.').length, 1);
  assert.equal(timeWords('A negative net present value; at present nothing is published.').length, 1);
});

test("'Present Value' with capitals stays allowed", () => {
  assert.deepEqual(timeWords('Net Present Value of the scheme'), []);
});
