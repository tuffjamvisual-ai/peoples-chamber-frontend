// Layout lock: run with node --test scripts/checks/layout-lock.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approval, markedText, lockList, checkRange } from './layout-lock.mjs';

test('approval needs the words and a job id that is in JOBS.md', () => {
  assert.equal(approval('Back arrow lower\n\nLayout change approved (T1-768b)', '| T1-768b | ...').ok, true);
  assert.equal(approval('Back arrow lower', '| T1-768b |').ok, false);
  assert.equal(approval('Layout change approved', '| T1-768b |').ok, false);
  assert.equal(approval('Layout change approved (T9-ZZ)', '| T1-768b |').ok, false);
  assert.equal(approval('Layout change approved: T9-ZZ', null).ok, true); // JOBS.md not mounted: the id is not checked
});

test('marked text and the list', () => {
  assert.equal(markedText('a /* LAYOUT-LOCK START x */ b { c } /* LAYOUT-LOCK END */ d'), ' b { c } ');
  assert.equal(markedText('no markers'), null);
  assert.deepEqual(lockList('# c\nlib/breakpoints.ts\napp/globals.css#LAYOUT-LOCK\n'), [{ file: 'lib/breakpoints.ts', marked: false }, { file: 'app/globals.css', marked: true }]);
});

test('history: dc984080 (T1-768b) changed the shell without the words, so it would be refused; d6de49fd (T1-5c) touched none', () => {
  assert.equal(checkRange('dc984080~1', 'dc984080').length, 1);
  assert.equal(checkRange('d6de49fd~1', 'd6de49fd').length, 0);
});
