#!/usr/bin/env node
// LGSCO (Local Government and Social Care Ombudsman) annual review data into council_ombudsman
// (migration 2026-10-20l-council-ombudsman.sql). Owner's approval, 20 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. --sql=file.sql writes one guarded transaction that
// replaces every row. Rerunnable. No web requests: the six CSVs are in scripts/data/lgsco/ (see its README; the
// site's robots.txt disallows the files' folder, so they were downloaded by hand).
//
// Rules:
//   - Title rows above "Authority Name" and the note rows below the data are skipped; the data ends at "Totals"/"Total".
//   - The headers must be exactly as checked on 20 Oct 2026, or the run stops.
//   - Numbers are trimmed and commas removed (" 2,777 "). A percentage cell must read like "83%"; text such as
//     "None upheld" or a blank cell is stored as NULL with the text in notes, never as a number.
//   - Matched by name to our 317 English councils. Three are filed under other names (FILE_NAMES). In 2024-25,
//     North Yorkshire and Somerset also have rows for the county councils abolished in 2023 (all zero); the new
//     councils' rows are used and the old ones ignored, as are the other abolished councils (ABOLISHED) and bodies that
//     are not councils (NOT_COUNCILS). Any other row that matches no council, or any council with no row, stops the run.
//   - Cross-checks: received total = sum of categories; decided total = sum of outcomes; the remedy file's upheld count
//     and uphold rate equal the decided file's.
//   - Per-100,000-resident rates and similar-authority averages are read but not stored.
//
// Usage: node scripts/import-lgsco.js [--sql=file.sql]
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), quiet: true });
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const DIR = path.join(__dirname, 'data', 'lgsco');
const SOURCE_URL = 'https://www.lgo.org.uk/information-centre/reports/annual-review-reports/local-government-complaint-reviews';
const YEARS = { '2024-25': '24-25', '2025-26': '25-26' };

// The file's name -> our council's name.
const FILE_NAMES = {
  'City of London': 'City of London Corporation',
  'Kingston upon Hull City Council': 'Hull City Council',
  'Newcastle upon Tyne City Council': 'Newcastle City Council',
};
// Councils abolished in 2023 that the 2024-25 files still list (complaints about their past actions).
const ABOLISHED = new Set([
  'Allerdale Borough Council', 'Barrow-in-Furness Borough Council', 'Carlisle City Council', 'Copeland Borough Council',
  'Craven District Council', 'Cumbria County Council', 'Eden District Council', 'Hambleton District Council',
  'Harrogate Borough Council', 'Mendip District Council', 'North Yorkshire County Council', 'Richmondshire District Council',
  'Ryedale District Council', 'Scarborough Borough Council', 'Sedgemoor District Council', 'Selby District Council',
  'Somerset County Council', 'Somerset West and Taunton Council', 'South Lakeland District Council',
  'South Somerset District Council',
]);
const NOT_COUNCILS = /Fire|National Park|Combined (County )?Authority|Greater London Authority|Transport for London|Environment Agency|Broads Authority/;

const HEADERS = {
  received: ['Authority Name', 'Adult Social Care', 'Benefits and Tax', 'Corporate and Other Services', "Education and Children's Services",
    'Environmental Services, Public Protection and Regulation', 'Highways and Transport', 'Housing', 'Planning and Development', 'Other', 'Total'],
  decided: ['Authority Name', 'Invalid or Incomplete', 'Advice Given', 'Referred Back for Local Resolution', 'Closed after Initial Enquiries',
    'Not Upheld', 'Upheld', 'Total', 'Upheld decisions per 100,000 residents',
    'Average no of upheld decisions per 100,000 residents of similar authorities', 'Uphold rate (%)', 'Average uphold rate (%) of similar authorities'],
  remedy: {
    '2024-25': ['Authority Name', 'Number of upheld complaints', 'Uphold Rate (%)', 'Average uphold rate (%) of similar authorities',
      'Upheld cases where the authority provided a satisfactory remedy before the complaint reached the Ombudsman (%)',
      'Average satisfactory remedy rate of similar authorities (%)', 'Number of cases with a compliance outcome recorded during the year',
      'Cases we were satisfied the authority successfully implemented our recommendations to remedy the complaint (compliance rate) (%)',
      'Average compliance rate of similar authorities (%)'],
    '2025-26': ['Authority Name', 'Number of upheld complaints', 'Uphold Rate (%)', 'Average uphold rate (%) of similar authorities',
      'Upheld cases where the authority provided a satisfactory remedy before the complaint reached the Ombudsman (%)',
      'Average satisfactory remedy rate of similar authorities (%)', 'Number of cases with a compliance outcome recorded during the year',
      'Number of compliance outcomes recorded as delivered on time',
      'Percentage of compliance outcomes recorded as delivered on time (timely compliance rate) (%)',
      'Average timely compliance rate in similar organisations (%)',
      'Cases we were satisfied the authority successfully implemented our recommendations to remedy the complaint (compliance rate) (%)',
      'Average compliance rate of similar authorities (%)'],
  },
};

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const norm = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/’/g, "'").replace(/[.,'()]/g, ' ')
  .replace(/\b(the|council|borough|district|county|metropolitan|city|of|royal|london|unitary|authority)\b/g, ' ')
  .replace(/[\s-]+/g, ' ').trim();
// Reads one datasheet: { name -> { header -> cell } }, checking the header row word for word.
function readSheet(file, expected) {
  const rows = parse(fs.readFileSync(file), { bom: true, relax_column_count: true });
  const h = rows.findIndex((r) => clean(r[0]) === 'Authority Name');
  if (h < 0) fail(`${file}: no "Authority Name" header row`);
  const header = rows[h].map(clean);
  const got = header.slice(0, expected.length);
  if (JSON.stringify(got) !== JSON.stringify(expected) || header.slice(expected.length).some(Boolean)) {
    fail(`${file}: header changed.\n  expected ${JSON.stringify(expected)}\n  found    ${JSON.stringify(header.filter(Boolean))}`);
  }
  const out = new Map();
  for (const r of rows.slice(h + 1)) {
    const name = clean(r[0]);
    if (/^Totals?$/.test(name)) break;
    if (!name) continue;
    if (out.has(name)) fail(`${file}: "${name}" appears twice`);
    out.set(name, Object.fromEntries(expected.map((col, i) => [col, clean(r[i])])));
  }
  return out;
}

const int = (v, where) => {
  const s = v.replace(/,/g, '');
  if (!/^\d+$/.test(s)) fail(`${where}: expected a whole number, found "${v}"`);
  return Number(s);
};
// A published percentage, or NULL with the text (or "blank") kept for notes.
function pct(v, column, notes) {
  const m = v.match(/^(\d{1,3}(?:\.\d+)?)%$/);
  if (m) return Number(m[1]);
  notes.push(`${column}: ${v ? `"${v}"` : 'blank in the file'}`);
  return null;
}

(async () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const { data: councils, error } = await sb.from('councils').select('slug, name, short_name, gss_code').eq('country', 'England');
  if (error) fail(error.message);
  if (councils.length !== 317) fail(`expected 317 English councils, found ${councils.length}`);
  // Names are matched after dropping words like "Council", "Borough", "City of" ("Barnsley Metropolitan Borough
  // Council" = our "Barnsley Council"). A form shared by two councils stops the run.
  const byName = new Map();
  for (const c of councils) {
    for (const k of new Set([norm(c.name), norm(c.short_name || '')].filter(Boolean))) {
      if (byName.has(k) && byName.get(k) !== c) fail(`two councils share the name form "${k}"`);
      byName.set(k, c);
    }
  }

  const out = [];
  for (const [year, tag] of Object.entries(YEARS)) {
    const rec = readSheet(path.join(DIR, `1 - Complaints Received ${tag}.csv`), HEADERS.received);
    const dec = readSheet(path.join(DIR, `2 - Complaints Decided ${tag}.csv`), HEADERS.decided);
    const rem = readSheet(path.join(DIR, `3 - Remedy & Compliance Outcomes ${tag}.csv`), HEADERS.remedy[year]);
    for (const [label, sheet] of [['decided', dec], ['remedy', rem]]) {
      const a = [...rec.keys()].sort().join('|'), b = [...sheet.keys()].sort().join('|');
      if (a !== b) fail(`${year}: the received and ${label} files list different authorities`);
    }
    const seen = new Set(); const ignored = [];
    for (const [fileName, r] of rec) {
      // Abolished councils first: "North Yorkshire County Council" would otherwise match the new North Yorkshire Council.
      if (ABOLISHED.has(fileName)) { ignored.push(fileName); continue; }
      const council = byName.get(norm(FILE_NAMES[fileName] || fileName));
      if (!council) {
        if (NOT_COUNCILS.test(fileName)) { ignored.push(fileName); continue; }
        fail(`${year}: "${fileName}" matches no council and is not on the ignore lists`);
      }
      if (seen.has(council.slug)) fail(`${year}: two rows for ${council.name}`);
      seen.add(council.slug);
      const d = dec.get(fileName), m = rem.get(fileName), w = `${year} ${fileName}`;
      const notes = [];
      const row = {
        gss: council.gss_code, year, name: council.name,
        received_adult_social_care: int(r['Adult Social Care'], w), received_benefits_tax: int(r['Benefits and Tax'], w),
        received_corporate_other: int(r['Corporate and Other Services'], w), received_education_children: int(r["Education and Children's Services"], w),
        received_environment: int(r['Environmental Services, Public Protection and Regulation'], w),
        received_highways_transport: int(r['Highways and Transport'], w), received_housing: int(r['Housing'], w),
        received_planning: int(r['Planning and Development'], w), received_other: int(r['Other'], w), received_total: int(r['Total'], w),
        decided_invalid_incomplete: int(d['Invalid or Incomplete'], w), decided_advice_given: int(d['Advice Given'], w),
        decided_referred_back: int(d['Referred Back for Local Resolution'], w), decided_closed_after_enquiries: int(d['Closed after Initial Enquiries'], w),
        not_upheld: int(d['Not Upheld'], w), upheld: int(d['Upheld'], w), decided_total: int(d['Total'], w),
      };
      row.uphold_pc = pct(d['Uphold rate (%)'], 'uphold_pc', notes);
      row.satisfactory_remedy_pc = pct(m['Upheld cases where the authority provided a satisfactory remedy before the complaint reached the Ombudsman (%)'], 'satisfactory_remedy_pc', notes);
      row.compliance_cases = int(m['Number of cases with a compliance outcome recorded during the year'], w);
      row.compliance_pc = pct(m['Cases we were satisfied the authority successfully implemented our recommendations to remedy the complaint (compliance rate) (%)'], 'compliance_pc', notes);
      if (year === '2025-26') {
        row.on_time_cases = int(m['Number of compliance outcomes recorded as delivered on time'], w);
        row.on_time_pc = pct(m['Percentage of compliance outcomes recorded as delivered on time (timely compliance rate) (%)'], 'on_time_pc', notes);
      } else { row.on_time_cases = null; row.on_time_pc = null; }
      if (FILE_NAMES[fileName]) notes.push(`filed by LGSCO as "${fileName}"`);
      row.notes = notes.length ? notes.join('; ') : null;

      const recSum = ['adult_social_care', 'benefits_tax', 'corporate_other', 'education_children', 'environment', 'highways_transport', 'housing', 'planning', 'other'].reduce((s, k) => s + row[`received_${k}`], 0);
      if (recSum !== row.received_total) fail(`${w}: received categories add to ${recSum}, total says ${row.received_total}`);
      const decSum = row.decided_invalid_incomplete + row.decided_advice_given + row.decided_referred_back + row.decided_closed_after_enquiries + row.not_upheld + row.upheld;
      if (decSum !== row.decided_total) fail(`${w}: decided outcomes add to ${decSum}, total says ${row.decided_total}`);
      if (int(m['Number of upheld complaints'], w) !== row.upheld) fail(`${w}: remedy file upheld ${m['Number of upheld complaints']} vs decided ${row.upheld}`);
      if (clean(m['Uphold Rate (%)']) !== clean(d['Uphold rate (%)']) && !(row.upheld + row.not_upheld === 0)) fail(`${w}: uphold rate differs between files ("${m['Uphold Rate (%)']}" vs "${d['Uphold rate (%)']}")`);
      if (row.on_time_cases != null && row.on_time_cases > row.compliance_cases) fail(`${w}: more on time than compliance cases`);
      out.push(row);
    }
    const missing = councils.filter((c) => !seen.has(c.slug)).map((c) => c.name);
    if (missing.length) fail(`${year}: no row for ${missing.join(', ')}`);
    const abolishedSeen = ignored.filter((n) => ABOLISHED.has(n));
    console.log(`${year}: ${rec.size} authority rows; ${seen.size} councils matched; ignored ${abolishedSeen.length} abolished councils and ${ignored.length - abolishedSeen.length} bodies that are not councils`);
  }

  const noteCount = out.filter((r) => r.notes).length;
  console.log(`rows: ${out.length}; with notes: ${noteCount}`);
  const texts = {};
  for (const r of out) for (const n of (r.notes || '').split('; ').filter(Boolean)) { const k = n.replace(/^[a-z_]+: /, '').replace(/^filed by.*/, 'filed under another name'); texts[k] = (texts[k] || 0) + 1; }
  console.log('notes by text:', JSON.stringify(texts));
  for (const name of ['Kent County Council', 'Erewash Borough Council', 'Birmingham City Council', 'City of London Corporation', 'North Yorkshire Council']) {
    for (const r of out.filter((x) => x.name === name)) {
      console.log(`  ${r.year} ${name}: received ${r.received_total}, decided ${r.decided_total}, investigated ${r.upheld + r.not_upheld}, upheld ${r.upheld} (${r.uphold_pc ?? '-'}%), remedy ${r.satisfactory_remedy_pc ?? '-'}%, compliance ${r.compliance_pc ?? '-'}% of ${r.compliance_cases}, on time ${r.on_time_cases ?? '-'} (${r.on_time_pc ?? '-'}%)${r.notes ? ` | notes: ${r.notes}` : ''}`);
    }
  }

  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  const C = ['gss', 'year', 'received_total', 'received_adult_social_care', 'received_benefits_tax', 'received_corporate_other', 'received_education_children',
    'received_environment', 'received_highways_transport', 'received_housing', 'received_planning', 'received_other', 'decided_total',
    'decided_invalid_incomplete', 'decided_advice_given', 'decided_referred_back', 'decided_closed_after_enquiries', 'not_upheld', 'upheld',
    'uphold_pc', 'satisfactory_remedy_pc', 'compliance_cases', 'compliance_pc', 'on_time_cases', 'on_time_pc', 'notes'];
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '', 'DELETE FROM public.council_ombudsman;',
    `INSERT INTO public.council_ombudsman (${C.join(', ')}, source_url) VALUES`,
    out.map((r) => `(${C.map((c) => q(r[c])).join(', ')}, ${q(SOURCE_URL)})`).join(',\n') + ';',
    '', 'DO $$', 'DECLARE n int;', 'BEGIN'];
  for (const y of Object.keys(YEARS)) {
    const n = out.filter((r) => r.year === y).length;
    L.push(`  SELECT count(*) INTO n FROM public.council_ombudsman WHERE year = '${y}';`, `  IF n <> ${n} THEN RAISE EXCEPTION 'expected ${n} rows for ${y}, found %', n; END IF;`);
  }
  L.push(`  SELECT count(*) INTO n FROM public.council_ombudsman;`, `  IF n <> ${out.length} THEN RAISE EXCEPTION 'expected ${out.length} rows, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.council_ombudsman o LEFT JOIN public.councils c ON c.gss_code = o.gss WHERE c.slug IS NULL;`,
    `  IF n <> 0 THEN RAISE EXCEPTION '% rows match no council', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.council_ombudsman WHERE notes IS NOT NULL;`, `  IF n <> ${noteCount} THEN RAISE EXCEPTION 'expected ${noteCount} rows with notes, found %', n; END IF;`,
    'END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${out.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
