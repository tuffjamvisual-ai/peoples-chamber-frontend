#!/usr/bin/env node
// Research data export (owner's brief, 3 Nov 2026): one CSV per dataset, a data dictionary and a README, written to
// <OPENGOVT_ARCHIVE_ROOT, default /Volumes/EDGE_SSD>/opengovt-research-data/<YYYY-MM-DD>/, each CSV also zipped. Read only on the database: every
// query runs in a read only transaction (default_transaction_read_only) with a statement timeout; nothing is written to
// the database or the site. Stops if the SSD is not mounted, and never writes into a dated folder that already has files.
//
//   node scripts/export-research-data.mjs
//
// Datasets: written questions, Commons votes (with each division's totals), members' interests, Standards findings,
// contracts (no buyer contact fields; the table holds none), ministers' meetings, ministers' hospitality. Every row keeps
// Parliament's member id where the table has one. political_donations is never exported.
// DATABASE_URL comes from .env.local and is never printed. Uses psql's \copy and the system zip (no new dependencies).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The drive that holds the research data and the evidence archive (owner, 4 Nov 2026: EDGE_SSD; GoliathSSD keeps a
// weekly copy). One setting for both scripts.
const VOLUME = process.env.OPENGOVT_ARCHIVE_ROOT || '/Volumes/EDGE_SSD';
const STAMP = new Date().toISOString().slice(0, 10);
const OUT = join(VOLUME, 'opengovt-research-data', STAMP);

function env(name) {
  if (process.env[name]) return process.env[name];
  const m = readFileSync('.env.local', 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
const DATABASE_URL = env('DATABASE_URL');
if (!DATABASE_URL) { console.error('STOP: DATABASE_URL is not set'); process.exit(2); }
let mounted = false;
try { mounted = statSync(VOLUME).dev !== statSync(dirname(VOLUME)).dev; } catch { mounted = false; }
if (!mounted) { console.error(`STOP: ${VOLUME} is not mounted`); process.exit(3); }
if (existsSync(OUT) && readdirSync(OUT).length) { console.error(`STOP: ${OUT} already has files; nothing written`); process.exit(4); }
mkdirSync(OUT, { recursive: true });

const OPL = 'Open Parliament Licence v3.0';
const OGL = 'Open Government Licence v3.0';

// Each dataset: its query (the columns in file order), the meaning and source of each column, and the date column that
// gives its range. The SQL is fixed text; nothing in it comes from outside the script.
const DATASETS = [
  {
    file: 'written-questions.csv',
    title: 'Written questions tabled by current and former MPs, with answers',
    source: 'UK Parliament written questions and answers',
    source_url: 'https://questions-statements.parliament.uk/',
    licence: OPL,
    date: 'date_tabled',
    sql: `select pq_id, uin, member_id, date_tabled, date_answered, department, heading, question_text, answer_text, is_withdrawn
          from mp_questions order by date_tabled, pq_id`,
    columns: {
      pq_id: ['integer', 'Parliament\'s id for the written question'],
      uin: ['text', 'The question\'s unique identification number as printed by Parliament'],
      member_id: ['integer', 'Parliament\'s member id of the MP who asked the question'],
      date_tabled: ['date', 'The date the question was tabled'],
      date_answered: ['date', 'The date it was answered (empty if not yet answered)'],
      department: ['text', 'The answering government department'],
      heading: ['text', 'The question\'s heading'],
      question_text: ['text', 'The text of the question'],
      answer_text: ['text', 'The text of the answer (empty if not yet answered)'],
      is_withdrawn: ['boolean', 'Whether the question was withdrawn'],
    },
  },
  {
    file: 'commons-votes.csv',
    title: 'How each MP voted in Commons divisions, with each division\'s totals',
    source: 'UK Parliament Commons Votes (Commons Votes API, commonsvotes-api.parliament.uk)',
    source_url: 'https://votes.parliament.uk/',
    licence: OPL,
    date: 'division_date',
    sql: `select v.division_id, t.division_number, t.division_date, t.title as division_title, v.member_id, v.party,
                 v.vote_type, v.is_teller, v.is_rebellion, t.aye_count, t.no_count, t.is_deferred,
                 b.parliament_id as bill_parliament_id
          from mp_division_votes v
          join commons_division_totals t using (division_id)
          left join bill b on b.id = v.bill_id
          order by t.division_date, v.division_id, v.member_id`,
    columns: {
      division_id: ['integer', 'Parliament\'s id for the division'],
      division_number: ['integer', 'The division\'s number in its session'],
      division_date: ['date', 'The date of the division'],
      division_title: ['text', 'The division\'s title as recorded by Parliament'],
      member_id: ['integer', 'Parliament\'s member id of the MP'],
      party: ['text', 'The MP\'s party on the day of the vote'],
      vote_type: ['text', 'How the MP voted (aye or no)'],
      is_teller: ['boolean', 'Whether the MP acted as a teller in this division'],
      is_rebellion: ['boolean', 'Compiled by opengovt: true when the MP voted against the majority of their own party in this division'],
      aye_count: ['integer', 'Total votes for the motion'],
      no_count: ['integer', 'Total votes against the motion'],
      is_deferred: ['boolean', 'Whether this was a deferred division'],
      bill_parliament_id: ['integer', 'Parliament\'s bill id when opengovt has linked the division to a bill (empty otherwise)'],
    },
  },
  {
    file: 'members-interests.csv',
    title: 'Entries in the Register of Members\' Financial Interests',
    source: 'UK Parliament Register of Members\' Financial Interests (interests API and Members API)',
    source_url: 'https://interests-api.parliament.uk/',
    licence: OPL,
    date: 'created_when',
    sql: `select interest_id, member_id, category_id, category_name, interest_text, created_when, last_amended_when,
                 is_correction, is_current, child_interests::text as child_interests, donor_name, donor_amount,
                 payment_type, received_date, accepted_date, first_seen_date, last_seen_date
          from mp_registered_interests order by member_id, category_sort_order, created_when, interest_id`,
    columns: {
      interest_id: ['integer', 'Parliament\'s id for the register entry'],
      member_id: ['integer', 'Parliament\'s member id of the MP'],
      category_id: ['integer', 'Parliament\'s id for the register category'],
      category_name: ['text', 'The register category'],
      interest_text: ['text', 'The text of the entry as published'],
      created_when: ['timestamp', 'When the entry was first registered'],
      last_amended_when: ['timestamp', 'When the entry was last amended'],
      is_correction: ['boolean', 'Whether the entry is a correction'],
      is_current: ['boolean', 'Whether the entry is in the current register'],
      child_interests: ['JSON text', 'Linked sub entries as published (for example individual payments under an employment entry)'],
      donor_name: ['text', 'Compiled by opengovt from the entry: the donor or payer named (empty where none)'],
      donor_amount: ['number', 'Compiled by opengovt from the entry: the amount in pounds (empty where none)'],
      payment_type: ['text', 'Compiled by opengovt from the entry: the kind of payment or support'],
      received_date: ['date', 'Compiled by opengovt from the entry: the date received'],
      accepted_date: ['date', 'Compiled by opengovt from the entry: the date accepted'],
      first_seen_date: ['date', 'The first date opengovt saw the entry in the register'],
      last_seen_date: ['date', 'The last date opengovt saw the entry in the register'],
    },
  },
  {
    file: 'standards-findings.csv',
    title: 'House of Commons Committee on Standards reports on named MPs',
    source: 'UK Parliament Committee on Standards publications',
    source_url: 'https://committees.parliament.uk/committee/290/committee-on-standards/publications/',
    licence: OPL,
    date: 'closed_date',
    sql: `select case_ref, member_id, mp_name_at_time, closed_date, outcome, rule_breached, penalty, summary, url
          from mp_conduct_findings order by closed_date, case_ref`,
    columns: {
      case_ref: ['text', 'opengovt\'s reference: the Committee\'s id followed by Parliament\'s publication id'],
      member_id: ['integer', 'Parliament\'s member id of the MP named (empty for reports that name no single MP)'],
      mp_name_at_time: ['text', 'The name as given in the report title'],
      closed_date: ['date', 'The date the report was published'],
      outcome: ['text', 'Compiled by opengovt from the report: upheld, partially_upheld, not_upheld or no_finding'],
      rule_breached: ['text', 'Compiled by opengovt from the report: the rule or paragraph of the Code considered'],
      penalty: ['text', 'Compiled by opengovt from the report: the sanction recommended'],
      summary: ['text', 'Compiled by opengovt from the report: a plain summary'],
      url: ['text', 'The report on Parliament\'s website'],
    },
  },
  {
    file: 'contracts.csv',
    title: 'Public contract notices published on Find a Tender',
    source: 'Find a Tender service (OCDS releases)',
    source_url: 'https://www.find-tender.service.gov.uk/',
    licence: OGL,
    date: 'published_at',
    // No buyer contact name, email or phone column is exported (the table holds none: the buyer is an organisation
    // name only); suppliers are their published ids and names.
    sql: `select ocid, release_id, notice_id, notice_type, array_to_string(tags, ';') as tags, published_at, title,
                 buyer_name, suppliers::text as suppliers, is_framework, value, currency, value_type, value_from_text,
                 status, end_date, change_description, change_reason, termination_reason, source_url
          from contract_notices order by published_at, ocid, release_id`,
    columns: {
      ocid: ['text', 'The Open Contracting id of the contracting process'],
      release_id: ['text', 'The id of this release (notice) within the process'],
      notice_id: ['text', 'Find a Tender\'s notice id'],
      notice_type: ['text', 'The notice type'],
      tags: ['text', 'The release tags, separated by semicolons'],
      published_at: ['timestamp', 'When the notice was published'],
      title: ['text', 'The notice title'],
      buyer_name: ['text', 'The buying organisation'],
      suppliers: ['JSON text', 'The suppliers named in the notice, each with its published id and name'],
      is_framework: ['boolean', 'Whether the contract is a framework agreement'],
      value: ['number', 'The contract value as published'],
      currency: ['text', 'The currency of the value'],
      value_type: ['text', 'Which value this is (for example the award or contract value)'],
      value_from_text: ['boolean', 'Compiled by opengovt: true when the value was read from the notice text rather than a value field'],
      status: ['text', 'The contract status as published'],
      end_date: ['date', 'The contract end date as published'],
      change_description: ['text', 'For a change notice: what changed'],
      change_reason: ['text', 'For a change notice: the reason given'],
      termination_reason: ['text', 'For a termination notice: the reason given'],
      source_url: ['text', 'The notice on Find a Tender'],
    },
  },
  {
    file: 'ministers-meetings.csv',
    title: 'Ministers\' meetings with external organisations, from departmental transparency returns',
    source: 'GOV.UK departmental transparency data (ministers\' meetings)',
    source_url: 'https://www.gov.uk/search/transparency-and-freedom-of-information-releases',
    licence: OGL,
    date: 'meeting_date',
    sql: `select minister_name, minister_dept, meeting_date, organisation, purpose, quarter, date_note,
                 source_publication_url, source_csv_url, source_published_on
          from ministers_meetings order by meeting_date nulls last, minister_name, organisation`,
    columns: {
      minister_name: ['text', 'The minister as named in the return (no member id in this data)'],
      minister_dept: ['text', 'The department that published the return'],
      meeting_date: ['text (yyyy-mm-dd)', 'The meeting date as given (empty where the return gives none)'],
      organisation: ['text', 'The organisations or people met, as published'],
      purpose: ['text', 'The purpose of the meeting, as published'],
      quarter: ['text', 'The reporting quarter of the return'],
      date_note: ['text', 'Compiled by opengovt: a note where the published date was unclear'],
      source_publication_url: ['text', 'The publication on GOV.UK'],
      source_csv_url: ['text', 'The data file on GOV.UK'],
      source_published_on: ['date', 'When the return was published'],
    },
  },
  {
    file: 'ministers-hospitality.csv',
    title: 'Hospitality received by ministers, from departmental transparency returns',
    source: 'GOV.UK departmental transparency data (ministers\' hospitality)',
    source_url: 'https://www.gov.uk/search/transparency-and-freedom-of-information-releases',
    licence: OGL,
    date: 'hospitality_date',
    sql: `select minister_name, minister_dept, hospitality_date, donor, description, value, quarter,
                 source_publication_slug
          from ministers_hospitality order by hospitality_date nulls last, minister_name, donor`,
    columns: {
      minister_name: ['text', 'The minister as named in the return (no member id in this data)'],
      minister_dept: ['text', 'The department that published the return'],
      hospitality_date: ['text (yyyy-mm-dd)', 'The date as given'],
      donor: ['text', 'Who provided the hospitality, as published'],
      description: ['text', 'The hospitality, as published'],
      value: ['text', 'The value as published (often a band or "not quantified")'],
      quarter: ['text', 'The reporting quarter of the return'],
      source_publication_slug: ['text', 'The publication on GOV.UK: https://www.gov.uk/government/publications/ followed by this'],
    },
  },
];

const PGENV = { ...process.env, PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=600000' };
// quiet: false keeps psql's "COPY n" line, which gives the row count of a \copy.
function psql(sql, { quiet = true } = {}) {
  const args = [DATABASE_URL, '-X', ...(quiet ? ['-q'] : []), '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql];
  const r = spawnSync('psql', args, { env: PGENV, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error((r.stderr || '').split(DATABASE_URL).join('<DATABASE_URL>').trim());
  return r.stdout.trim();
}
const oneLine = (sql) => sql.replace(/\s+/g, ' ').trim();
const csv = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const report = [];
for (const d of DATASETS) {
  const path = join(OUT, d.file);
  const t0 = Date.now();
  // \copy runs the query in the read only session and writes the file locally, UTF-8 with a header row.
  const copied = psql(`\\copy (${oneLine(d.sql)}) to '${path}' with (format csv, header true, encoding 'UTF8')`, { quiet: false });
  const rows = Number((copied.match(/COPY (\d+)/) || [])[1] ?? NaN);
  if (!Number.isFinite(rows)) throw new Error(`${d.file}: no row count from psql`);
  const header = readFileSync(path, 'utf8').split('\n', 1)[0].split(',');
  const missing = Object.keys(d.columns).filter((c) => !header.includes(c));
  const extra = header.filter((c) => !d.columns[c]);
  if (missing.length || extra.length) throw new Error(`${d.file}: dictionary and file differ (missing ${missing}, extra ${extra})`);
  const range = psql(`select min(${d.date})::date || ' to ' || max(${d.date})::date from (${oneLine(d.sql)}) q where ${d.date} is not null and ${d.date}::text <> ''`);
  const zip = spawnSync('zip', ['-j', '-q', '-X', `${path}.zip`, path]);
  if (zip.status !== 0) throw new Error(`${d.file}: zip failed`);
  const r = { ...d, rows, range, bytes: statSync(path).size, zipped: statSync(`${path}.zip`).size, seconds: Math.round((Date.now() - t0) / 1000) };
  report.push(r);
  console.log(`${d.file}: ${rows.toLocaleString('en-GB')} rows, ${range}, ${(r.bytes / 1048576).toFixed(1)} MB, zipped ${(r.zipped / 1048576).toFixed(1)} MB (${r.seconds} s)`);
}

// Data dictionary: file, column, type, meaning, source.
const dict = [['file', 'column', 'type', 'meaning', 'source'].join(',')];
for (const d of DATASETS) for (const [col, [type, meaning]] of Object.entries(d.columns)) dict.push([d.file, col, type, meaning, d.source].map(csv).join(','));
writeFileSync(join(OUT, 'data-dictionary.csv'), dict.join('\n') + '\n');

// README (no hyphens or dashes in our own wording).
const readme = [
  'opengovt research data',
  `Exported ${STAMP}. Compiled by opengovt (opengovt.uk).`,
  '',
  'Each dataset is a CSV file (UTF 8, with a header row) and the same file zipped. data-dictionary.csv describes every',
  'column: its type, what it means and where it comes from. Columns described as "Compiled by opengovt" are our own',
  'reading or linking of the source; everything else is as the source publishes it. Rows keep Parliament\'s member id',
  'wherever the data has one, so they can be joined to Parliament\'s Members API (https://members-api.parliament.uk/).',
  '',
  ...report.flatMap((r) => [
    `${r.file} (zipped: ${r.file}.zip)`,
    `  ${r.title}.`,
    `  Rows: ${r.rows.toLocaleString('en-GB')}. Dates (${r.date}): ${r.range}.`,
    `  Source: ${r.source}, ${r.source_url}`,
    `  Licence: ${r.licence}.`,
    '',
  ]),
  'Notes',
  '  contracts.csv has no buyer contact names, email addresses or phone numbers. Some suppliers are sole traders, so a',
  '  supplier name can be a person\'s name, as published by the buyer.',
  '  ministers-meetings.csv and ministers-hospitality.csv name ministers as the departments publish them; that data has',
  '  no member id.',
  '  Political donations are not included in this export.',
  '',
  'Licences',
  '  Parliament data (written questions, Commons votes, members\' interests, Standards findings): Open Parliament Licence v3.0,',
  '  https://www.parliament.uk/site-information/copyright/open-parliament-licence/',
  '  Contracts and ministers\' data: Open Government Licence v3.0,',
  '  https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  '',
  'Attribution',
  '  Contains Parliamentary information licensed under the Open Parliament Licence v3.0',
  '  Contains public sector information licensed under the Open Government Licence v3.0',
  '  Compiled by opengovt (opengovt.uk)',
  '',
];
writeFileSync(join(OUT, 'README.txt'), readme.join('\n'));
console.log(`written to ${OUT}`);
