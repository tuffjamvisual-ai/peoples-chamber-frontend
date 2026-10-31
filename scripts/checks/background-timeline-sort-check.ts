// MP Background timeline display check (owner, 31 Oct 2026). Unit checks for sortTimeline and yearsLabel in
// lib/background-timeline.ts, on fixtures copied from the stored timelines of four MPs (phase, dates, title and
// organisation as stored on 31 Oct 2026; sources replaced by a placeholder). Reads no database and no network.
// The repo's Playwright runner starts a dev server for every run, so this is a plain script. Exits 1 on a failure.
//
// Usage: npx tsx --tsconfig tsconfig.json scripts/checks/background-timeline-sort-check.ts

import { sortTimeline, yearsLabel, type BackgroundEntry, type BackgroundPhase } from '../../lib/background-timeline';

type Row = [BackgroundPhase, string | null, string | null, string, string | null];
const SRC = { title: 'fixture', url: 'https://example.org/' };
const build = (rows: Row[]): BackgroundEntry[] =>
  rows.map(([phase, start, end, title, organisation]) => ({ phase, start, end, title, organisation, detail: null, source: SRC }));
const order = (rows: Row[]) => sortTimeline(build(rows)).map((e) => `${e.title}${e.organisation ? ` (${e.organisation})` : ''}`);

// John Healey (400)
const HEALEY: Row[] = [
  ['education', null, null, 'Secondary school', "Lady Lumley's School, Pickering"],
  ['education', null, null, 'Secondary school', "St Peter's School, York"],
  ['education', '1979', null, 'Social and Political Science', "Christ's College, Cambridge"],
  ['career', '1984', '1990', 'Disability rights campaigner', 'Royal National Institute for the Deaf'],
  ['career', '1990', '1994', 'Communications', 'Issue Communications and the MSF union'],
  ['career', '1994', '1997', 'Campaigns director', 'Trades Union Congress'],
  ['career', null, null, 'Tutor', 'Open University Business School'],
  ['politics', '1992', '1992', 'Labour candidate, Ryedale', 'Labour Party'],
];

// Debbie Abrahams (4212)
const ABRAHAMS: Row[] = [
  ['education', null, null, 'Secondary school', 'Kent College, Pembury'],
  ['education', null, null, 'BSc Biochemistry and Physiology', 'University of Salford'],
  ['career', null, null, 'Community worker', null],
  ['career', null, null, 'Head of Healthy Cities', 'Knowsley'],
  ['career', null, '2002', 'Non executive director', 'Bury and Rochdale Health Authority'],
  ['career', '2002', null, 'Chair', 'Rochdale Primary Care Trust'],
  ['career', null, null, 'Director of public health research', 'University of Liverpool'],
  ['career', null, null, 'Public health consultant', null],
  ['politics', '2006', null, 'Joined the Labour Party', 'Labour Party'],
  ['politics', '2008', null, "Health adviser to Simon Danczuk's campaign", 'Labour Party'],
  ['politics', '2010', '2010', 'Labour candidate, Colne Valley', 'Labour Party'],
  ['politics', '2010-12', '2011-01', 'Labour candidate, Oldham East and Saddleworth byelection', 'Labour Party'],
];

// Sir Edward Leigh (345)
const LEIGH: Row[] = [
  ['education', null, null, 'Secondary school', 'The Oratory School'],
  ['education', null, null, 'Secondary school', 'Lycée Français, London'],
  ['education', null, '1972', 'BA History', 'Durham University'],
  ['career', null, null, 'Barrister', 'Inner Temple'],
  ['career', '1976', '1977', 'Private secretary', 'Private Office of the Leader of the Opposition'],
  ['politics', null, null, 'Councillor', 'Richmond Borough Council'],
  ['politics', '1974-10', '1974-10', 'Parliamentary candidate, Middlesbrough', 'Conservative Party'],
  ['politics', null, '1981', 'Member of the Greater London Council', 'Greater London Council'],
];

let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) { passes++; console.log(`ok   ${name}`); return; }
  failures++;
  console.log(`FAIL ${name}`);
  if (detail !== undefined) console.log(`     ${JSON.stringify(detail)}`);
}
const before = (list: string[], a: string, b: string) => list.indexOf(a) >= 0 && list.indexOf(b) >= 0 && list.indexOf(a) < list.indexOf(b);
const directlyAfter = (list: string[], prev: string, next: string) => list.indexOf(prev) >= 0 && list.indexOf(next) === list.indexOf(prev) + 1;

// yearsLabel
check('yearsLabel: same year shows once ("2016")', yearsLabel('2016', '2016') === '2016', yearsLabel('2016', '2016'));
check('yearsLabel: same month shows once ("Oct 1974")', yearsLabel('1974-10', '1974-10') === 'Oct 1974', yearsLabel('1974-10', '1974-10'));
check('yearsLabel: range unchanged ("2003 to 2007")', yearsLabel('2003', '2007') === '2003 to 2007');
check('yearsLabel: months unchanged ("Dec 2010 to Jan 2011")', yearsLabel('2010-12', '2011-01') === 'Dec 2010 to Jan 2011');
check('yearsLabel: "2019 to today" unchanged', yearsLabel('2019', 'present') === '2019 to today');
check('yearsLabel: "From 1979" unchanged', yearsLabel('1979', null) === 'From 1979');
check('yearsLabel: "Until 1981" unchanged', yearsLabel(null, '1981') === 'Until 1981');
check('yearsLabel: "To today" unchanged', yearsLabel(null, 'present') === 'To today');
check('yearsLabel: both null is empty', yearsLabel(null, null) === '');

// Michael Shanks (4998): stored as start 2016, end 2016
check('Shanks (4998): Glasgow Kelvin candidacy reads "2016", not "2016 to 2016"', yearsLabel('2016', '2016') === '2016');

// John Healey (400)
const healey = order(HEALEY);
check("Healey (400): both schools come before the 1979 Cambridge degree",
  before(healey, "Secondary school (Lady Lumley's School, Pickering)", "Social and Political Science (Christ's College, Cambridge)")
  && before(healey, "Secondary school (St Peter's School, York)", "Social and Political Science (Christ's College, Cambridge)"), healey);
check('Healey (400): Open University tutor stays directly after the TUC',
  directlyAfter(healey, 'Campaigns director (Trades Union Congress)', 'Tutor (Open University Business School)'), healey);

// Debbie Abrahams (4212)
const abrahams = order(ABRAHAMS);
check('Abrahams (4212): "Director of public health research" stays directly after "Chair, Rochdale Primary Care Trust"',
  directlyAfter(abrahams, 'Chair (Rochdale Primary Care Trust)', 'Director of public health research (University of Liverpool)'), abrahams);
check('Abrahams (4212): the whole timeline keeps its stored order',
  JSON.stringify(abrahams) === JSON.stringify(ABRAHAMS.map(([, , , t, o]) => `${t}${o ? ` (${o})` : ''}`)), abrahams);

// Sir Edward Leigh (345)
const leigh = order(LEIGH);
check('Leigh (345): "Until 1981" Greater London Council stays after the 1974 Middlesbrough candidacy',
  before(leigh, 'Parliamentary candidate, Middlesbrough (Conservative Party)', 'Member of the Greater London Council (Greater London Council)'), leigh);
check('Leigh (345): schools come before the BA ending 1972',
  before(leigh, 'Secondary school (Lycée Français, London)', 'BA History (Durham University)'), leigh);

// Phase order and stability
const mixed = order([
  ['politics', '2001', null, 'P', null],
  ['career', null, null, 'C undated', null],
  ['education', '1990', null, 'E', null],
  ['career', '1995', null, 'C dated', null],
]);
check('phases: education, then career, then politics', JSON.stringify(mixed) === JSON.stringify(['E', 'C undated', 'C dated', 'P']), mixed);
const ties = order([
  ['career', '2000', null, 'A', null],
  ['career', '2000', null, 'B', null],
  ['career', null, null, 'C', null],
  ['career', '2000', null, 'D', null],
]);
check('stable: equal keys keep the stored order', JSON.stringify(ties) === JSON.stringify(['A', 'B', 'C', 'D']), ties);

console.log(`${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
