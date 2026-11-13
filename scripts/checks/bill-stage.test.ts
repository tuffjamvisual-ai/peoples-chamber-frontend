// T1-A3 (1): the House of a bill's current stage (lib/bill-stage.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/bill-stage.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentStageHouse, stageWithHouse, startedIn } from '../../lib/bill-stage';

const st = (sortOrder: number, house: string, description: string, ...dates: string[]) => ({ sortOrder, house, description, stageSittings: dates.map((date) => ({ date: `${date}T00:00:00` })) });
const TODAY = '2026-11-13';

// A Commons bill now at committee in the Lords (the case T1-A1 found).
const courts = {
  originating_house: 'Commons', current_stage: 'Committee stage',
  stages: { items: [st(1, 'Commons', '1st reading', '2026-02-25'), st(2, 'Commons', '2nd reading', '2026-03-10'), st(3, 'Commons', 'Committee stage', '2026-04-28'), st(4, 'Commons', '3rd reading', '2026-10-20'), st(5, 'Lords', '1st reading', '2026-10-21'), st(6, 'Lords', '2nd reading', '2026-11-03'), st(7, 'Lords', 'Committee stage', '2026-11-11', '2026-11-16')] },
};

test('the House of the stage the bill is at, not the House it started in', () => {
  assert.equal(currentStageHouse(courts, TODAY), 'Lords');
  assert.equal(stageWithHouse(courts, TODAY), 'Lords committee stage');
  assert.equal(startedIn(courts), 'Started in the Commons');
});

test('a stage whose name both Houses have, before the second House reaches it, stays in the first', () => {
  const b = { ...courts, stages: { items: courts.stages.items.slice(0, 6).concat([st(7, 'Lords', 'Committee stage', '2026-12-01')]) } };
  assert.equal(stageWithHouse(b, TODAY), 'Commons committee stage');
});

test('a stage only scheduled (nothing of that name has sat): the next one due', () => {
  const b = { current_stage: '2nd reading', stages: { items: [st(1, 'Commons', '1st reading', '2026-11-12'), st(2, 'Commons', '2nd reading', '2027-02-26')] } };
  assert.equal(stageWithHouse(b, TODAY), 'Commons 2nd reading');
});

test('Royal Assent, a private bill\'s unassigned stages, and no stages are shown as they are', () => {
  assert.equal(stageWithHouse({ current_stage: 'Royal Assent', stages: { items: [st(9, 'Unassigned', 'Royal Assent', '2026-07-15')] } }, TODAY), 'Royal Assent');
  assert.equal(stageWithHouse({ current_stage: 'Examination for compliance with Standing Orders', stages: { items: [st(1, 'Unassigned', 'Examination for compliance with Standing Orders', '2025-12-18')] } }, TODAY), 'Examination for compliance with Standing Orders');
  assert.equal(stageWithHouse({ current_stage: 'Committee stage', stages: null }, TODAY), 'Committee stage');
  assert.equal(stageWithHouse({ current_stage: null }, TODAY), null);
  assert.equal(startedIn({ originating_house: 'Unassigned' }), null);
});
