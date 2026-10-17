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
//   - Northern Ireland is left out: the file has no columns for NI parties (DUP, Sinn Féin and
//     others all land in "other"), so its NI rows are wrong. NI control stays as we hold it.
//   - Existing political_control values are not changed unless --adopt is given. With --adopt,
//     a value that disagrees with the May snapshot is replaced by it, except for councils run by
//     a directly elected mayor (control there is not decided by seats), which are only listed.
//
// The file is downloaded by hand from https://opencouncildata.co.uk/productsAndDownloads.php
// ("GB Compositions 2016-2026") into data/opencouncildata/.
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
const PARTIES = ['con', 'lab', 'ld', 'green', 'ukip', 'ref', 'pc', 'snp', 'other'];
const NAME = { con: 'Conservative', lab: 'Labour', ld: 'Liberal Democrats', green: 'Green', ukip: 'UKIP', ref: 'Reform UK', pc: 'Plaid Cymru', snp: 'SNP', other: 'Independents and others' };

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

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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
    const status = majority ? 'majority' : `NOC (largest: ${NAME[largest]} ${largestSeats}/${total})`;
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

  const missingFromFile = councils.filter((c) => !latest.has(c.gss_code));
  console.log(`matched to our councils: ${out.filter((o) => o.council_slug).length}; in the file but not ours: ${unmatched.length}; ours but not in the file: ${missingFromFile.length}`);
  if (unmatched.length) console.log(`  not ours: ${unmatched.slice(0, 20).join('; ')}`);
  const missingByCountry = {};
  for (const c of missingFromFile) { const k = c.gss_code ? c.gss_code[0] : '?'; missingByCountry[k] = (missingByCountry[k] || 0) + 1; }
  console.log(`  ours not in the file, by GSS prefix: ${JSON.stringify(missingByCountry)} (N = Northern Ireland, published separately)`);
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
  console.log('\nWRITE complete.');
})().catch((e) => fail(e.message));
