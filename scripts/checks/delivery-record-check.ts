// MP delivery record check (owner approved the format, 8 Nov 2026, DR1). No network or database: validates the approved
// pilot fixture (scripts/background/fixtures/delivery-4820.json) with lib/delivery-record.ts, compares computePanel() with
// the fixture's expected_panel for every figure worked out from the record, makes sure each broken record below fails
// validate(), checks the paragraph label stripping used by the RSS feed (lib/bio-labels.ts, DR2 and DR3), the source
// link texts (sourceLinkTexts, DR3) and the attribution label wording (DR3). Runs before every build (package.json "prebuild"); exit code 1 on any failure stops the build.
// Run by hand: npx tsx --tsconfig tsconfig.json scripts/checks/delivery-record-check.ts
import fs from 'node:fs';
import path from 'node:path';
import { validate, computePanel, sourceLinkTexts, ATTRIBUTION_LABEL, type DeliveryRecord } from '../../lib/delivery-record';
import { stripParagraphLabels, withoutLeadingLabel } from '../../lib/bio-labels';

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'background', 'fixtures', 'delivery-4820.json'), 'utf8')) as {
  delivery_record: DeliveryRecord;
  expected_panel: Record<string, unknown>;
};
const record = fixture.delivery_record;
const failures: string[] = [];

// 1. The fixture is valid.
const problems = validate(record);
if (problems.length) failures.push(`fixture fails validate(): ${problems.join('; ')}`);
else console.log('ok   fixture passes validate()');

// 2. The panel matches the fixture for every figure worked out from the record. Parliament's figures (bills, written
// answers and statements) come from the database on the page, so they are null here and not compared.
const panel = computePanel(record);
const fromRecord = ['delivered', 'delivered_with_role', 'in_development', 'in_development_with_role', 'attribution', 'pledges'] as const;
for (const k of fromRecord) {
  const want = JSON.stringify(fixture.expected_panel[k]);
  const got = JSON.stringify(panel[k]);
  if (want !== got) failures.push(`panel ${k}: expected ${want}, got ${got}`);
  else console.log(`ok   panel ${k} = ${got}`);
}
for (const k of ['bills_introduced', 'bills_passed', 'minister_written_answers', 'minister_written_statements'] as const) {
  if (panel[k] !== null) failures.push(`panel ${k}: must be null when no figure is given, got ${panel[k]}`);
}
const given = computePanel(record, { bills_introduced: 1, bills_passed: 0 });
if (given.bills_introduced !== 1 || given.bills_passed !== 0 || given.minister_written_statements !== null) failures.push('panel: Parliament figures given are not passed through as given');
else console.log('ok   panel passes through Parliament figures given, null for the rest');

// 3. Broken records, one rule each: every one must fail validate().
const copy = (): DeliveryRecord & Record<string, unknown> => JSON.parse(JSON.stringify(record));
type Item = Record<string, unknown>;
const item = (r: DeliveryRecord, i = 0) => r.items[i] as unknown as Item;
const legislation = (r: DeliveryRecord) => r.items.findIndex((i) => i.area === 'Legislation');
const negatives: Array<[string, (r: DeliveryRecord & Record<string, unknown>) => void]> = [
  ['unknown field on an item', (r) => { item(r).colour = 'red'; }],
  ['unknown field on the record', (r) => { r.notes = 'x'; }],
  ['unknown field on a pledge', (r) => { (r.pledges[0] as unknown as Item).kept = true; }],
  ['unknown stage', (r) => { item(r).stage = 'finished'; }],
  ['unknown attribution', (r) => { item(r).attribution = 'helped'; }],
  ['unknown scope', (r) => { item(r).scope = 'regional'; }],
  ['empty claim', (r) => { item(r).claim = ''; }],
  ['blank mp_role (spaces only)', (r) => { item(r).mp_role = '   '; }],
  ['empty pledge wording', (r) => { (r.pledges[0] as unknown as Item).wording = ''; }],
  ['bad start date', (r) => { item(r).start = '2025-13-01'; }],
  ['bad end date (words)', (r) => { item(r).end = 'September 2025'; }],
  ['end before start', (r) => { item(r).start = '2026-03-01'; item(r).end = '2025-12'; }],
  ['http source url', (r) => { r.items[0].sources[0].url = 'http://www.gov.uk/alerts/7-sep-2025'; }],
  ['no sources', (r) => { r.items[0].sources = []; }],
  ['pledge source not https', (r) => { r.pledges[0].source.url = 'ftp://example.com/x'; }],
  ['pledge year not YYYY', (r) => { (r.pledges[0] as unknown as Item).made = '19'; }],
  ['null attribution outside Legislation', (r) => { item(r).attribution = null; }],
  ['missing attribution outside Legislation', (r) => { delete item(r).attribution; }],
  ['field named measure on an item', (r) => { item(r).measure = 4; }],
  ['field named measure on the record', (r) => { r.measure = { delivered: 4 }; }],
  ['field named measure inside a source', (r) => { (r.items[0].sources[0] as unknown as Item).measure = 1; }],
  ['items not an array', (r) => { (r as Item).items = {}; }],
  ['record not an object', () => { /* replaced below */ }],
];
let negOk = 0;
for (const [name, breakIt] of negatives) {
  const r = copy();
  breakIt(r);
  const errs = name === 'record not an object' ? validate([record]) : validate(r);
  if (errs.length === 0) failures.push(`negative case passed validate() but must fail: ${name}`);
  else { negOk++; console.log(`ok   rejects ${name}: ${errs[0]}`); }
}
// And the one allowed null: attribution null on a Legislation item is valid.
{
  const r = copy();
  const li = legislation(r);
  if (li < 0) failures.push('fixture has no Legislation item to test the null attribution rule');
  else if (item(r, li).attribution !== null || validate(r).length) failures.push('a Legislation item with null attribution must pass');
  else console.log('ok   accepts null attribution on a Legislation item');
}

console.log(`${negOk} of ${negatives.length} negative cases rejected`);

// 4. Paragraph labels in plain text (the RSS feed): stripped only at the very start of a paragraph.
const bio = (fixture as unknown as { political_bio: string }).political_bio;
const stripped = stripParagraphLabels(bio);
const labelCases: Array<[string, string, string]> = [
  ['the fixture: no "**" left', String(stripped.includes('**')), 'false'],
  ['the fixture: first paragraph starts "Minister. Parliamentary"', String(stripped.startsWith('Minister. Parliamentary Secretary')), 'true'],
  ['the fixture: same paragraphs', String(stripped.split('\n\n').length), String(bio.split('\n\n').length)],
  ['no labels: unchanged', stripParagraphLabels('Plain text. Second sentence.\n\nAnother paragraph.'), 'Plain text. Second sentence.\n\nAnother paragraph.'],
  ['asterisks mid paragraph: unchanged', stripParagraphLabels('Text with **bold.** inside'), 'Text with **bold.** inside'],
  ['label without a full stop: unchanged', stripParagraphLabels('**Minister** text'), '**Minister** text'],
  ['label not followed by a space: unchanged', stripParagraphLabels('**A.**B'), '**A.**B'],
  ['second paragraph label: stripped', stripParagraphLabels('One.\n\n**Two.** Text'), 'One.\n\nTwo. Text'],
  ['label later in a paragraph: unchanged', stripParagraphLabels('One.\n**Two.** Text'), 'One.\n**Two.** Text'],
];
// The feed's lead skips a leading label (DR3); a biography without labels is unchanged.
const firstSentence = (t: string) => { const c = t.replace(/\s+/g, ' ').trim(); const i = c.indexOf('.'); return i > 0 ? c.slice(0, i + 1) : c; };
labelCases.push(
  ['feed lead skips a leading label (fixture)', firstSentence(withoutLeadingLabel(bio)), 'Parliamentary Secretary, Cabinet Office, 9 July 2024 to 6 September 2025, responsible for national resilience.'],
  ['feed lead: a label paragraph alone is skipped', firstSentence(withoutLeadingLabel('**Only.**\n\nNext text here.')), 'Next text here.'],
  ['feed: no labels unchanged', withoutLeadingLabel('Plain. Text.\n\nMore.'), 'Plain. Text.\n\nMore.'],
  ['feed: later labels plain', withoutLeadingLabel('**A.** One.\n\n**B.** Two.'), 'One.\n\nB. Two.'],
);

// 5. Source link texts (DR3) and the attribution wording.
const T = (title: string) => ({ title });
labelCases.push(
  ['link a) publisher', JSON.stringify(sourceLinkTexts([T('Transport for London: Superloop')])), JSON.stringify(['Transport for London'])],
  ['link b) publisher and bracketed date', JSON.stringify(sourceLinkTexts([T('Royal Borough of Greenwich: Pride in Place funding announced (20 March 2026)')])), JSON.stringify(['Royal Borough of Greenwich, 20 March 2026'])],
  ['link b) a date not at the end is not added', JSON.stringify(sourceLinkTexts([T('GOV.UK: Emergency alert, 7 September 2025')])), JSON.stringify(['GOV.UK'])],
  ['link c) same publisher twice: title after the colon', JSON.stringify(sourceLinkTexts([T('Transport for London: Superloop'), T('Transport for London: Extending the DLR to Beckton Riverside and Thamesmead')])), JSON.stringify(['Superloop', 'Extending the DLR to Beckton Riverside and Thamesmead'])],
  ['link c) shortened at a word boundary with three full stops', JSON.stringify(sourceLinkTexts([T('Royal Borough of Greenwich: Pride in Place programme for Thamesmead Birchmere Park and the wider area'), T('Royal Borough of Greenwich: Contact')])), JSON.stringify(['Pride in Place programme for Thamesmead Birchmere Park and...', 'Contact'])],
  ['link c) different dates keep b)', JSON.stringify(sourceLinkTexts([T('Royal Borough of Greenwich: A (20 March 2026)'), T('Royal Borough of Greenwich: B (8 September 2026)')])), JSON.stringify(['Royal Borough of Greenwich, 20 March 2026', 'Royal Borough of Greenwich, 8 September 2026'])],
  ['link: identical titles still differ', JSON.stringify(sourceLinkTexts([T('X: Same'), T('X: Same')])), JSON.stringify(['Same', 'Same (2)'])],
  ['attribution label wording', ATTRIBUTION_LABEL.documented_contribution, 'Credited by a council or delivering body'],
);
// Every item in the fixture: no two links in one card read the same, and no shortened text over 60 characters plus "...".
record.items.forEach((it, i) => {
  const texts = sourceLinkTexts(it.sources);
  if (new Set(texts).size !== texts.length) failures.push(`links: item ${i + 1} has two links with the same text: ${JSON.stringify(texts)}`);
  for (const t of texts) if (t.endsWith('...') && t.length > 63) failures.push(`links: item ${i + 1}: "${t}" is over 60 characters`);
  if (/[\u2013\u2014\u2026]/.test(texts.join(''))) failures.push(`links: item ${i + 1}: a dash or ellipsis character`);
});
console.log('ok   links: every fixture card has distinct link texts');

for (const [name, got, want] of labelCases) {
  if (got !== want) failures.push(`labels, ${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  else console.log(`ok   labels: ${name}`);
}
if (failures.length) {
  console.error(`delivery-record-check failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('delivery-record-check passed');
