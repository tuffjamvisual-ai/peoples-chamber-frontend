// Unit tests for lib/mp-written-question-counts.ts (JF2d, 9 Nov 2026): per MP written question totals and top five
// departments counted from parliament_written_questions rows. No network or database.
// Run: npx tsx --test scripts/checks/mp-written-question-counts.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countByMember, WQ_COUNT_FROM, type ArchiveQuestion } from '../../lib/mp-written-question-counts';

const q = (id: number | null, dept: string | null, date = '2025-01-10'): ArchiveQuestion => ({ asking_member_id: id, answering_body: dept, date_tabled: date });

test('counts every question an MP tabled, including those with no department', () => {
  const r = countByMember([q(1, 'Treasury'), q(1, 'Treasury'), q(1, null), q(2, 'Home Office')], [1, 2]);
  assert.equal(r.get(1)!.written_questions, 3);
  assert.deepEqual(r.get(1)!.wq_top_departments, [{ dept: 'Treasury', count: 2 }]);
  assert.equal(r.get(2)!.written_questions, 1);
});

test('an MP with no questions gets 0 and no departments', () => {
  const r = countByMember([q(1, 'Treasury')], [1, 7]);
  assert.deepEqual(r.get(7), { written_questions: 0, wq_top_departments: [] });
});

test('members outside the list and rows with no asking member are ignored', () => {
  const r = countByMember([q(1, 'Treasury'), q(9, 'Treasury'), q(null, 'Treasury')], [1]);
  assert.equal(r.size, 1);
  assert.equal(r.get(1)!.written_questions, 1);
});

test('questions tabled before the start date are not counted', () => {
  const r = countByMember([q(1, 'Treasury', '2024-07-03'), q(1, 'Treasury', WQ_COUNT_FROM)], [1]);
  assert.equal(r.get(1)!.written_questions, 1);
});

test('top departments: five at most, most asked first, ties by name, names trimmed', () => {
  const rows = [
    ...['B', 'B', 'B', 'A', 'A', 'C', 'C', 'D', 'E', 'F'].map((d) => q(1, d)),
    q(1, ' A '),
  ];
  const top = countByMember(rows, [1]).get(1)!.wq_top_departments;
  assert.deepEqual(top, [
    { dept: 'A', count: 3 }, { dept: 'B', count: 3 }, { dept: 'C', count: 2 }, { dept: 'D', count: 1 }, { dept: 'E', count: 1 },
  ]);
});
