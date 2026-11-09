#!/usr/bin/env node
// Imports the party make-up of every GB council from Open Council Data UK's compositions file
// (history2016-26.csv, public domain CC0, captured shortly after each May election) into
// council_composition, and fills councils.political_control where we have none.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. Pass --write to save, only after
// the dry-run report has been approved.
//
// Rules:
//   - The latest year in the file is used for each council (matched on GSS code).
//   - Control comes from seats: a party with more than half the seats has control; otherwise
//     "No overall control", with the largest party noted, in the same style as existing rows.
//   - Northern Ireland (NI2, 9 Nov 2026) does not come from that file (it has no columns for NI parties, so DUP, Sinn
//     Féin and the rest all land in "other"). Its 11 councils are counted instead from Open Council Data's UK
//     councillors file for May 2026 (one row per councillor, public domain CC0; --ni-file), matched by name to the fixed
//     list NI_COUNCILS below. Seats are counted by party. Every NI council shows "No overall control" with its largest
//     party: councils there share power between the parties, and no administration line is given.
//   - Ties (NI2): when two or more parties share the most seats and none has a majority, the status names them all
//     ("NOC (largest tie: Sinn Féin and DUP 12/40)", shown as "Largest parties: Sinn Féin and DUP, 12 seats each"),
//     never one picked silently. This applies to GB councils too.
//   - Existing political_control values are not changed unless --adopt is given. With --adopt,
//     a value that disagrees with the May snapshot is replaced by it, except for councils run by
//     a directly elected mayor (control there is not decided by seats), which are only listed.
//
// The files are downloaded by hand from https://opencouncildata.co.uk/productsAndDownloads.php into
// data/opencouncildata/: "GB Compositions 2016-2026" (history2016-26.csv) and the 2026 councillors file (csv2.php?y=2026,
// saved as councillors2026.csv).
//
// Usage:
//   node scripts/import-council-composition.js > council-composition-dryrun.txt 2>&1
//   node scripts/import-council-composition.js --adopt > council-composition-dryrun.txt 2>&1
//   node scripts/import-council-composition.js --adopt --write > council-composition-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const ADOPT = process.argv.includes('--adopt');
// GSS codes that changed after a boundary review: the file's new code -> the code we hold.
const GSS_ALIAS = { E08000038: 'E08000016' /* Barnsley */, E08000039: 'E08000019' /* Sheffield */ };
const FILE = (process.argv.find((a) => a.startsWith('--file=')) || '').slice(7) || 'data/opencouncildata/history2016-26.csv';
const NI_FILE = (process.argv.find((a) => a.startsWith('--ni-file=')) || '').slice(10) || 'data/opencouncildata/councillors2026.csv';
const PARTIES = ['con', 'lab', 'ld', 'green', 'ukip', 'ref', 'pc', 'snp', 'other'];
const NAME = {
  con: 'Conservative', lab: 'Labour', ld: 'Liberal Democrats', green: 'Green', ukip: 'UKIP', ref: 'Reform UK', pc: 'Plaid Cymru', snp: 'SNP', other: 'Independents and others',
  // Northern Ireland (NI2)
  sf: 'Sinn Féin', dup: 'DUP', alliance: 'Alliance', uup: 'UUP', sdlp: 'SDLP', tuv: 'TUV', pbp: 'People Before Profit', pup: 'PUP',
};
// The 11 councils of Northern Ireland, by their name in the councillors file, and their GSS codes.
const NI_COUNCILS = {
  'Antrim and Newtownabbey': 'N09000001', 'Armagh City, Banbridge and Craigavon': 'N09000002', Belfast: 'N09000003',
  'Causeway Coast and Glens': 'N09000004', 'Derry City and Strabane': 'N09000005', 'Fermanagh and Omagh': 'N09000006',
  'Lisburn and Castlereagh': 'N09000007', 'Mid and East Antrim': 'N09000008', 'Mid Ulster': 'N09000009',
  'Newry, Mourne and Down': 'N09000010', 'Ards and North Down': 'N09000011',
};
const NI_YEAR = 2026;
// The councillors file's party names (May 2026) -> our codes. A name not listed is counted as "other" and reported.
function niParty(name) {
  const n = name.trim().toLowerCase();
  if (n === 'sinn féin' || n === 'sinn fein') return 'sf';
  if (n.startsWith('democratic unionist')) return 'dup';
  if (n.startsWith('alliance')) return 'alliance';
  if (n.startsWith('ulster unionist')) return 'uup';
  if (n.startsWith('sdlp') || n.startsWith('social democratic and labour')) return 'sdlp';
  if (n.startsWith('traditional unionist')) return 'tuv';
  if (n.startsWith('people before profit')) return 'pbp';
  if (n.startsWith('progressive unionist')) return 'pup';
  if (n.startsWith('green party')) return 'green';
  if (n === 'independent / other' || n.startsWith('independent')) return 'other';
  return null;
}
// The parties with the most seats (ties kept), and the status line for a council without a majority.
function largestOf(seats) {
  const top = Math.max(0, ...Object.values(seats));
  return { top, parties: Object.keys(seats).filter((p) => seats[p] === top && top > 0) };
}
function nocStatus(seats, total) {
  const { top, parties } = largestOf(seats);
  if (parties.length > 1) {
    const names = parties.map((p) => NAME[p] || p);
    return `NOC (largest tie: ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} ${top}/${total})`;
  }
  return `NOC (largest: ${NAME[parties[0]] || parties[0]} ${top}/${total})`;
}

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((c) => c !== '')) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

(async () => {
  if (!fs.existsSync(FILE)) fail(`${FILE} not found`);
  const rows = parseCsv(fs.readFileSync(FILE, 'utf8').replace(/^﻿/, ''));
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  for (const n of ['authority', 'year', 'total', ...PARTIES, 'majority']) if (col(n) < 0) fail(`column "${n}" missing; headings are: ${head.join(', ')}`);
  // The GSS code sits in the last (unnamed) column.
  const gssCol = head.length - 1;

  // Latest row per GSS code.
  const latest = new Map();
  let noGss = 0;
  for (const r of rows.slice(1)) {
    const raw = (r[gssCol] || '').trim();
    const gss = GSS_ALIAS[raw] || raw;
    const year = Number(r[col('year')]);
    if (/^N\d{8}$/.test(gss)) { noGss++; continue; } // Northern Ireland: see the note at the top
    if (!/^[ESW]\d{8}$/.test(gss)) { noGss++; continue; }
    if (!Number.isFinite(year)) continue;
    const prev = latest.get(gss);
    if (!prev || year > prev.year) latest.set(gss, { r, year });
  }
  const years = {};
  for (const { year } of latest.values()) years[year] = (years[year] || 0) + 1;
  console.log(`${FILE}: ${rows.length - 1} rows; ${latest.size} councils with a GSS code (rows without one skipped: ${noGss}); latest year per council: ${JSON.stringify(years)}`);

  const { data: councils, error } = await db.from('councils').select('slug, name, gss_code, political_control, political_control_status').order('slug');
  if (error) fail(`councils: ${error.message}`);
  const byGss = new Map(councils.map((c) => [c.gss_code, c]));

  const out = [];
  const fills = [];
  const disagree = [];
  const adopt = [];
  const problems = [];
  const unmatched = [];
  const ties = [];
  for (const [gss, { r, year }] of latest) {
    const seats = Object.fromEntries(PARTIES.map((p) => [p, Number(r[col(p)]) || 0]));
    const total = Number(r[col('total')]) || 0;
    const sum = PARTIES.reduce((s, p) => s + seats[p], 0);
    if (!total || sum !== total) problems.push(`${r[col('authority')]} ${year}: seats add up to ${sum}, total says ${total}`);
    const ranked = PARTIES.map((p) => [p, seats[p]]).sort((a, b) => b[1] - a[1]);
    const [largest, largestSeats] = ranked[0];
    // "other" lumps independents and local parties together, so it can never be one group's
    // majority (Broxtowe and Tandridge were wrongly shown as majority-controlled, 17 Oct 2026).
    const majority = largestSeats * 2 > total && largest !== 'other' ? largest : null;
    const admin = (r[col('majority')] || '').trim();
    const council = byGss.get(gss);
    if (!council) unmatched.push(`${r[col('authority')]} (${gss})`);
    out.push({
      gss_code: gss, council_slug: council ? council.slug : null, authority_name: r[col('authority')].trim(), snapshot_year: year,
      total_seats: total, seats, largest_party: largest, largest_seats: largestSeats, majority_party: majority,
      administration_code: admin && admin.toUpperCase() !== 'NULL' ? admin : null,
    });
    if (!council) continue;
    const control = majority ? NAME[majority] : 'No overall control';
    const status = majority ? 'majority' : nocStatus(seats, total);
    if (!majority && largestOf(seats).parties.length > 1) ties.push(`${r[col('authority')].trim()}: ${nocStatus(seats, total)}`);
    if (!council.political_control) fills.push({ slug: council.slug, name: council.name, control, status });
    else {
      const have = council.political_control.trim().toLowerCase();
      const want = control.toLowerCase();
      const same = have === want || (have.startsWith('no overall') && !majority) || (have === 'independent' && majority === 'other');
      const mayor = /mayor/i.test(admin) || /mayor/i.test(council.political_control_status || '');
      if (!same && ADOPT && !mayor) adopt.push({ slug: council.slug, name: council.name, control, status, was: council.political_control });
      if (!same) disagree.push(`${mayor ? '[mayor, kept] ' : ADOPT ? '[replaced] ' : ''}${council.name}: we have "${council.political_control}"${council.political_control_status ? ` (${council.political_control_status})` : ''}; seats say "${control}" (${ranked.filter(([, n]) => n > 0).map(([p, n]) => `${NAME[p]} ${n}`).join(', ')} of ${total}; administration ${admin || 'not given'})`);
    }
  }

  // Northern Ireland (NI2): the councillors file, one row per councillor, for the 11 councils only.
  const niOut = [];
  const niUnknownParties = {};
  if (!fs.existsSync(NI_FILE)) fail(`${NI_FILE} not found`);
  const niRows = parseCsv(fs.readFileSync(NI_FILE, 'utf8').replace(/^\uFEFF/, ''));
  const niHead = niRows[0].map((h) => h.trim().toLowerCase());
  const niCol = (n) => niHead.indexOf(n);
  for (const n of ['council', 'party name']) if (niCol(n) < 0) fail(`${NI_FILE}: column "${n}" missing; headings are: ${niHead.join(', ')}`);
  const niCounts = new Map(Object.keys(NI_COUNCILS).map((n) => [n, {}]));
  for (const r of niRows.slice(1)) {
    const council = (r[niCol('council')] || '').trim();
    if (!niCounts.has(council)) continue;
    const party = (r[niCol('party name')] || '').trim();
    let code = niParty(party);
    if (!code) { code = 'other'; niUnknownParties[party] = (niUnknownParties[party] || 0) + 1; }
    const seats = niCounts.get(council);
    seats[code] = (seats[code] || 0) + 1;
  }
  console.log(`\nNorthern Ireland, from ${NI_FILE} (May ${NI_YEAR}):`);
  if (Object.keys(niUnknownParties).length) console.log(`  party names not recognised, counted as Independents and others: ${JSON.stringify(niUnknownParties)}`);
  const niDiff = [];
  for (const [name, gss] of Object.entries(NI_COUNCILS)) {
    const seats = niCounts.get(name);
    const total = Object.values(seats).reduce((a, b) => a + b, 0);
    if (!total) { problems.push(`${name}: no councillors found in ${NI_FILE}`); continue; }
    const { top, parties } = largestOf(seats);
    const council = byGss.get(gss);
    if (!council) unmatched.push(`${name} (${gss})`);
    const status = nocStatus(seats, total);
    if (parties.length > 1) ties.push(`${name}: ${status}`);
    niOut.push({
      gss_code: gss, council_slug: council ? council.slug : null, authority_name: name, snapshot_year: NI_YEAR,
      total_seats: total, seats, largest_party: parties[0], largest_seats: top, majority_party: null, administration_code: null,
    });
    const line = Object.entries(seats).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${NAME[p] || p} ${n}`).join(', ');
    const over = top * 2 > total ? ` [${NAME[parties[0]]} holds ${top} of ${total}, more than half; shown as No overall control under the NI rule]` : '';
    console.log(`  ${name} (${gss}${council ? `, ${council.slug}` : ', NOT IN OUR councils TABLE'}): ${total} seats: ${line}; status "${status}"${over}`);
    if (!council) continue;
    const was = `${council.political_control || '(none)'}${council.political_control_status ? ` (${council.political_control_status})` : ''}`;
    const now = `No overall control (${status})`;
    if (council.political_control !== 'No overall control' || council.political_control_status !== status) {
      niDiff.push(`  ${council.name}: we have ${was}; would be ${now}`);
      if (!council.political_control) fills.push({ slug: council.slug, name: council.name, control: 'No overall control', status });
      else if (ADOPT) adopt.push({ slug: council.slug, name: council.name, control: 'No overall control', status, was: council.political_control });
    }
  }
  console.log(`  political control that would change for NI councils (${niDiff.length})${ADOPT ? '' : ', with --adopt'}:`);
  for (const d of niDiff) console.log(d);
  out.push(...niOut);
  console.log(`\nties for the largest party, no majority (GB and NI): ${ties.length}`);
  for (const t of ties) console.log(`  ${t}`);

  const missingFromFile = councils.filter((c) => !latest.has(c.gss_code) && !Object.values(NI_COUNCILS).includes(c.gss_code));
  console.log(`matched to our councils: ${out.filter((o) => o.council_slug).length}; in the file but not ours: ${unmatched.length}; ours but not in the file: ${missingFromFile.length}`);
  if (unmatched.length) console.log(`  not ours: ${unmatched.slice(0, 20).join('; ')}`);
  const missingByCountry = {};
  for (const c of missingFromFile) { const k = c.gss_code ? c.gss_code[0] : '?'; missingByCountry[k] = (missingByCountry[k] || 0) + 1; }
  console.log(`  ours not in either file, by GSS prefix: ${JSON.stringify(missingByCountry)}`);
  if (problems.length) { console.log(`\nseat totals that do not add up (${problems.length}):`); for (const p of problems.slice(0, 20)) console.log(`  ${p}`); }
  console.log(`\npolitical control to fill where we have none: ${fills.length}`);
  for (const f of fills.slice(0, 30)) console.log(`  ${f.name}: ${f.control}${f.status !== 'majority' ? ` (${f.status})` : ''}`);
  if (fills.length > 30) console.log(`  ... and ${fills.length - 30} more`);
  console.log(`\nexisting political control that disagrees with the seat count (${disagree.length}); ${ADOPT ? `${adopt.length} replaced by the May snapshot, the rest kept` : 'NOT changed, for a person to check'}:`);
  for (const d of disagree) console.log(`  ${d}`);

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  if (problems.length > 10) fail('more than 10 councils whose seats do not add up; nothing written');

  console.log('\n--- Writing ---');
  const builtAt = new Date().toISOString();
  for (let i = 0; i < out.length; i += 500) {
    const { error: e } = await db.from('council_composition').upsert(out.slice(i, i + 500).map((o) => ({ ...o, built_at: builtAt })), { onConflict: 'gss_code' });
    if (e) fail(`council_composition upsert: ${e.message}`);
  }
  let filled = 0;
  for (const f of fills) {
    const { error: e } = await db.from('councils').update({ political_control: f.control, political_control_status: f.status, updated_at: builtAt }).eq('slug', f.slug).is('political_control', null);
    if (e) fail(`councils update ${f.slug}: ${e.message}`);
    filled++;
  }
  let replaced = 0;
  for (const a of adopt) {
    const { error: e } = await db.from('councils').update({ political_control: a.control, political_control_status: a.status, updated_at: builtAt }).eq('slug', a.slug).eq('political_control', a.was);
    if (e) fail(`councils update ${a.slug}: ${e.message}`);
    replaced++;
  }
  console.log(`  council_composition: ${out.length} saved; councils.political_control filled: ${filled}; replaced: ${replaced}`);
  // The council pages keep for a week: refresh them now (owner, 30 Oct 2026; scripts/lib/refresh-site.js).
  if ((out.length) > 0) { const site = require('./lib/refresh-site'); await site.recordRefresh('import-council-composition', { changed: out.length, ...(await site.refreshCouncilPages()) }); }
  console.log('\nWRITE complete.');
})().catch((e) => fail(e.message));
