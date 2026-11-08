// Unit tests for lib/written-questions-details.ts and the shared url builder (WQ1, 8 Nov 2026): validate(), the url, the
// month windows and halves, and the minister answers count across both tables. No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/written-questions-details.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, monthWindows, halves, countAnswersInPeriods, apiDay } from '../../lib/written-questions-details';
import { writtenQuestionUrl, questionRow } from '../../lib/written-question-row';
import { answersFrom, coverageLabel, ministerialPeriods } from '../../lib/written-statements';

// Question 442640 as Parliament's list returns it (8 Nov 2026), less the fields we do not use.
const Q = {
  id: 442640, askingMemberId: 4408, house: 'Commons', dateTabled: '2016-01-05T00:00:00', uin: '21063', answeringBodyId: 16,
  answeringBodyName: 'Foreign and Commonwealth Office', answeringMemberId: 1408, dateAnswered: '2016-05-12T00:00:00',
  heading: 'Colombia: Capital Punishment', questionText: 'not stored', answerText: 'not stored',
};

test('validate: a complete record, details only, with its url', () => {
  const { row, problems } = validate(Q);
  assert.deepEqual(problems, []);
  assert.deepEqual(row, {
    id: 442640, uin: '21063', house: 'Commons', date_tabled: '2016-01-05', date_answered: '2016-05-12', asking_member_id: 4408,
    answering_member_id: 1408, answering_body_id: 16, answering_body: 'Foreign and Commonwealth Office',
    heading: 'Colombia: Capital Punishment', url: 'https://questions-statements.parliament.uk/written-questions/detail/2016-01-05/21063',
  });
  assert.ok(!('question_text' in row!) && !('answer_text' in row!));
});

test('validate: id, uin and dateTabled are required', () => {
  assert.match(validate({ ...Q, id: undefined }).problems.join(), /id missing/);
  assert.match(validate({ ...Q, uin: '' }).problems.join(), /uin missing/);
  assert.match(validate({ ...Q, dateTabled: null }).problems.join(), /dateTabled missing/);
  assert.equal(validate({ ...Q, id: -3 }).row, null);
});

test('validate: impossible dates are refused; a missing answer date is allowed', () => {
  assert.equal(validate({ ...Q, dateTabled: '2016-02-30T00:00:00' }).row, null);
  assert.match(validate({ ...Q, dateAnswered: 'May 2016' }).problems.join(), /dateAnswered/);
  assert.equal(validate({ ...Q, dateAnswered: null }).row?.date_answered, null);
  assert.equal(apiDay('2016-01-05T00:00:00'), '2016-01-05');
});

test('url: the same as the full text archive builds it', () => {
  assert.equal(writtenQuestionUrl('2016-01-05', '21063'), 'https://questions-statements.parliament.uk/written-questions/detail/2016-01-05/21063');
  assert.equal(writtenQuestionUrl(null, '21063'), null);
  const archiveRow = questionRow({ id: 1, uin: 'HL123', house: 'Lords', dateTabled: '2024-07-10T00:00:00', dateAnswered: null, askingMemberId: 1, answeringMemberId: null, answeringBodyId: null, answeringBodyName: null, heading: null, questionText: null, answerText: null, isWithdrawn: false });
  assert.equal(archiveRow.url, 'https://questions-statements.parliament.uk/written-questions/detail/2024-07-10/HL123');
});

test('months: every calendar month from 2014 to 3 July 2024, clipped at both ends', () => {
  const w = monthWindows('2014-01-01', '2024-07-03');
  assert.equal(w.length, 127);
  assert.deepEqual(w[0], { from: '2014-01-01', to: '2014-01-31' });
  assert.deepEqual(w[w.length - 1], { from: '2024-07-01', to: '2024-07-03' });
  assert.deepEqual(monthWindows('2016-02-10', '2016-03-05'), [{ from: '2016-02-10', to: '2016-02-29' }, { from: '2016-03-01', to: '2016-03-05' }]);
});

test('months: no gaps or overlaps between windows', () => {
  const w = monthWindows('2019-11-15', '2020-02-10');
  for (let i = 1; i < w.length; i++) {
    const prev = new Date(`${w[i - 1].to}T00:00:00Z`); prev.setUTCDate(prev.getUTCDate() + 1);
    assert.equal(prev.toISOString().slice(0, 10), w[i].from);
  }
});

test('halves: a window cut in two by date, again if need be; a single day left alone', () => {
  assert.deepEqual(halves({ from: '2016-01-01', to: '2016-01-31' }), [{ from: '2016-01-01', to: '2016-01-15' }, { from: '2016-01-16', to: '2016-01-31' }]);
  assert.deepEqual(halves({ from: '2016-01-16', to: '2016-01-31' }), [{ from: '2016-01-16', to: '2016-01-23' }, { from: '2016-01-24', to: '2016-01-31' }]);
  assert.deepEqual(halves({ from: '2024-07-01', to: '2024-07-03' }), [{ from: '2024-07-01', to: '2024-07-01' }, { from: '2024-07-02', to: '2024-07-03' }]);
  assert.deepEqual(halves({ from: '2016-02-29', to: '2016-02-29' }), [{ from: '2016-02-29', to: '2016-02-29' }]);
});

test('count: both tables, each question once, only inside a ministerial post', () => {
  const periods = ministerialPeriods([{ startDate: '2015-05-08', endDate: '2016-07-14' }, { startDate: '2020-02-13', endDate: '2021-09-16' }], '2026-11-08');
  const archive = [{ id: 1, date_answered: '2024-07-10' }, { id: 2, date_answered: '2021-09-16' }];
  const details = [{ id: 2, date_answered: '2021-09-16' }, { id: 3, date_answered: '2015-05-08' }, { id: 4, date_answered: '2016-07-15' }, { id: 5, date_answered: null }, { id: 6, date_answered: '2020-02-13T00:00:00' }];
  assert.equal(countAnswersInPeriods([...archive, ...details], periods), 3); // ids 2 (in both tables, once), 3 and 6
  assert.equal(countAnswersInPeriods([], periods), 0);
});

test('since: 2014 once the details table holds rows, July 2024 until then', () => {
  const before2014 = ministerialPeriods([{ startDate: '2010-05-13', endDate: '2012-09-04' }, { startDate: '2015-05-08', endDate: '2016-07-14' }], '2026-11-08');
  const from2015 = ministerialPeriods([{ startDate: '2015-05-08', endDate: '2016-07-14' }], '2026-11-08');
  assert.equal(coverageLabel(before2014, answersFrom(true)), 'since 2014');
  assert.equal(coverageLabel(from2015, answersFrom(true)), null);
  assert.equal(coverageLabel(from2015, answersFrom(false)), 'since July 2024');
});
