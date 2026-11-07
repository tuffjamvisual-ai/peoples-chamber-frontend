// MP Political career display check (owner, 7 Nov 2026, PC1). Unit checks for lib/career-timeline.ts: validate(), the group
// and date order of careerTimeline(), the dates column and the bill outcome wording. Reads no database and no network.
// Exits 1 on a failure.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/career-timeline-sort-check.ts

import { validate, careerTimeline, careerDates, billOutcomeText, type CareerEntry } from '../../lib/career-timeline';

let passes = 0, failures = 0;
function check(name: string, ok: boolean, got?: unknown) {
  if (ok) { passes++; return; }
  failures++;
  console.log(`FAIL ${name}${got !== undefined ? `: got ${JSON.stringify(got)}` : ''}`);
}
const SRC = { title: 'fixture', url: 'https://example.org/' };
const e = (group: CareerEntry['group'], start: string | null, end: string | null, title: string, extra: Partial<CareerEntry> = {}): CareerEntry =>
  ({ group, start, end, title, organisation: null, detail: null, source: SRC, ...extra });

// validate
check('a valid entry passes', validate([e('posts', '2010-05-12', '2015-05-08', 'Minister')]).length === 0);
check('a day, a month and a year are all allowed', validate([e('committees', '2010', '2011-03', 'A'), e('committees', '2012-03-04', 'present', 'B')]).length === 0);
check('an unknown group fails', validate([{ ...e('posts', null, null, 'X'), group: 'roles' }]).length === 1);
check('end before start fails', validate([e('posts', '2015-01-01', '2014-12-31', 'X')]).length === 1);
check('a bill needs an outcome and a session', validate([e('bills', null, '2020-01-01', 'Bill')]).length === 2, validate([e('bills', null, '2020-01-01', 'Bill')]));
check('a withdrawn bill needs its date', validate([e('bills', null, null, 'Bill', { outcome: 'withdrawn', session: '2019-21', stage: '2nd reading' })]).length === 1);
check('a defeated bill needs its stage', validate([e('bills', null, '2020-01-01', 'Bill', { outcome: 'defeated', session: '2019-21', stage: null })]).length === 1);
check('only a bill has an outcome', validate([e('posts', null, null, 'X', { outcome: 'became_law' })]).length === 1);
check('the source must be https', validate([{ ...e('posts', null, null, 'X'), source: { title: 'x', url: 'http://example.org/' } }]).length === 1);
check('null is valid (no part)', validate(null).length === 0);

// order: groups in the set order, each by date, undated after dated, stored order kept for ties
const order = careerTimeline(
  [e('bills', null, '2021-05-04', 'Bill B'), e('elections', '2015-05-07', 'present', 'MP'), e('posts', '2017-07-01', '2024-05-30', 'Post later'), e('posts', '2010-05-12', '2012-09-04', 'Post earlier'), e('committees', null, null, 'Undated committee'), e('committees', '2015-07-06', '2016-12-05', 'Dated committee')],
  [e('findings', '2023-01-01', null, 'Finding'), e('pledges', null, null, 'Pledge'), e('elections', '2010-05-06', '2015-03-30', 'MP, first seat')],
).map((x) => x.title);
check('groups in order, each by date, undated last', JSON.stringify(order) === JSON.stringify(['MP, first seat', 'MP', 'Post earlier', 'Post later', 'Dated committee', 'Undated committee', 'Bill B', 'Finding', 'Pledge']), order);
const ties = careerTimeline([e('posts', '2010', null, 'A'), e('posts', '2010', null, 'B'), e('posts', '2010', null, 'C')], null).map((x) => x.title);
check('equal dates keep the stored order', JSON.stringify(ties) === '["A","B","C"]', ties);

// dates column
check('dates: day to today', careerDates({ start: '2024-07-04', end: 'present' }) === '4 July 2024 to today', careerDates({ start: '2024-07-04', end: 'present' }));
check('dates: month to year', careerDates({ start: '2010-05', end: '2015' }) === 'May 2010 to 2015', careerDates({ start: '2010-05', end: '2015' }));
check('dates: one date when start equals end', careerDates({ start: '2019-12-12', end: '2019-12-12' }) === '12 December 2019');
check('dates: until', careerDates({ start: null, end: '2019' }) === 'Until 2019');

// bill wording, Parliament's own terms
const b = (outcome: CareerEntry['outcome'], stage: string | null, end: string | null) => billOutcomeText({ outcome, stage, session: '2019-21', end });
check('became law', b('became_law', 'Royal Assent', '2021-04-29') === 'Became law', b('became_law', 'Royal Assent', '2021-04-29'));
check('defeated at a stage', b('defeated', '2nd reading', '2020-03-13') === 'Defeated at 2nd reading', b('defeated', '2nd reading', '2020-03-13'));
check('withdrawn on a date', b('withdrawn', '2nd reading', '2020-03-13') === 'Withdrawn on 13 March 2020', b('withdrawn', '2nd reading', '2020-03-13'));
check('no further stage', b('no_further_stage', '2nd reading', '2021-05-04') === 'No further stage after the 2019-21 session ended', b('no_further_stage', '2nd reading', '2021-05-04'));
check('in progress', b('in_progress', 'Committee stage', '2026-10-01') === 'In progress: Committee stage, as of 1 October 2026', b('in_progress', 'Committee stage', '2026-10-01'));

console.log(`${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
