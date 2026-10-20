#!/usr/bin/env node
// DfE EHC plan timeliness into council_ehcp (migration 2026-10-20e-council-ehcp.sql). Owner's approval, 20 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. --sql=file.sql writes one guarded transaction that
// replaces every row. Rerunnable.
//
// Source: DfE, Education, health and care plans, 2026 release, data set "Timeliness of new education, health and
// care plans" (90d7c9d3-d811-46f1-ae61-39ea674d4654). explore-education-statistics.service.gov.uk's robots.txt allows
// the data catalogue; the CSV link redirects to content.explore-education-statistics.service.gov.uk (no robots.txt).
//   --file=path   read the CSV from disk instead of downloading it (one request, redirects checked)
//
// Rules:
//   - Calendar years 2023 to 2025, local authority rows, breakdown "All EHC plans" only; the counts excluding
//     exceptions (columns ending _ex), and DfE's own percentage and average as published.
//   - Matched to councils.gss_code by DfE's new_la_code. Buckinghamshire, North Yorkshire and Somerset are filed by
//     DfE under their old county codes, so they are matched by name (NAME_MATCHES) with a note.
//   - "x" in DfE's file (not available) is stored as NULL with a note. Leicester has no rows for 2023 or 2025, and
//     the Isle of Wight none for 2023 (EXPECTED_GAPS); their other rows carry the note.
//   - Any DfE authority that matches no council, or any of our education authorities with no rows, stops the run
//     unless listed in EXPECTED_GAPS.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), quiet: true });
const { createClient } = require('@supabase/supabase-js');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const UA = 'opengovt.uk-ehcp/1.0 (https://opengovt.uk; EHC plan timeliness; one request)';
const DATA_SET = '90d7c9d3-d811-46f1-ae61-39ea674d4654';
const SOURCE_URL = `https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/${DATA_SET}`;
const YEARS = ['2023', '2024', '2025'];

// DfE's old county codes for three councils re-created as unitaries; matched by name.
const NAME_MATCHES = {
  Buckinghamshire: 'E06000060',
  'North Yorkshire': 'E06000065',
  Somerset: 'E06000066',
};
// Our education authorities that DfE gives no row for in some years: gss -> the missing years and the note shown.
const EXPECTED_GAPS = {
  E06000016: { years: ['2023', '2025'], note: "DfE's file has no figures for Leicester for 2023 or 2025." }, // owner's wording
  E06000046: { years: ['2023'], note: "DfE's file has no figures for the Isle of Wight for 2023." },
};

async function download() {
  const robots = await fetch('https://explore-education-statistics.service.gov.uk/robots.txt', { headers: { 'User-Agent': UA } }).then((r) => r.text());
  if (/Disallow:\s*\/data-catalogue/i.test(robots)) fail('robots.txt disallows the data catalogue');
  let url = `${SOURCE_URL}/csv`;
  for (let hop = 0; hop < 3; hop++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
    if ([301, 302, 303, 307, 308].includes(r.status)) { url = new URL(r.headers.get('location'), url).href; continue; }
    if (!r.ok) fail(`HTTP ${r.status} for ${url}`);
    return Buffer.from(await r.arrayBuffer()).toString('utf8');
  }
  fail('too many redirects');
}

function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const num = (s) => (/^\d+(\.\d+)?$/.test(s) ? Number(s) : null);

(async () => {
  const text = arg('file') ? fs.readFileSync(arg('file'), 'utf8') : await download();
  const [head, ...body] = parseCsv(text.replace(/^﻿/, ''));
  const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
  for (const c of ['time_period', 'geographic_level', 'new_la_code', 'la_name', 'breakdown_topic', 'plans_issued_den_ex', 'plans_issued_20_weeks_ex', 'pc_plans_issued_20_weeks_ex', 'plans_issued_gt_1_year_ex', 'avg_weeks_issue_plan_exc']) {
    if (!(c in col)) fail(`no column ${c}`);
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim(), { auth: { persistSession: false } });
  const { data: councils, error } = await db.from('councils').select('slug, name, type, gss_code').eq('country', 'England');
  if (error) fail(error.message);
  const byGss = new Map(councils.map((c) => [c.gss_code, c]));
  const educationAuthorities = councils.filter((c) => c.type !== 'district');

  const rows = []; const unmatched = []; const notes = [];
  for (const r of body) {
    const v = (c) => (r[col[c]] ?? '').trim();
    if (v('geographic_level') !== 'Local authority' || v('breakdown_topic') !== 'All EHC plans' || !YEARS.includes(v('time_period'))) continue;
    let gss = v('new_la_code'); const note = [];
    if (!byGss.has(gss)) {
      if (NAME_MATCHES[v('la_name')]) {
        note.push(`DfE lists ${v('la_name')} under its old county code ${gss}; matched by name.`);
        gss = NAME_MATCHES[v('la_name')];
      } else { unmatched.push(`${v('time_period')} ${gss} ${v('la_name')}`); continue; }
    }
    const vals = {
      plans_issued_ex: num(v('plans_issued_den_ex')), within_20_weeks_ex: num(v('plans_issued_20_weeks_ex')),
      pc_within_20_weeks_ex: num(v('pc_plans_issued_20_weeks_ex')), over_1_year_ex: num(v('plans_issued_gt_1_year_ex')),
      avg_weeks_ex: num(v('avg_weeks_issue_plan_exc')),
    };
    const xs = Object.entries(vals).filter(([, x]) => x == null).map(([k]) => k);
    if (xs.length === 5) note.push(`DfE's file shows x (not available) for ${v('time_period')}.`);
    else if (xs.length) note.push(`DfE's file shows x (not available) for ${xs.join(', ')} in ${v('time_period')}.`);
    if (EXPECTED_GAPS[gss]) note.push(EXPECTED_GAPS[gss].note);
    if (note.length) notes.push(`${v('time_period')} ${byGss.get(gss).slug}: ${note.join(' ')}`);
    rows.push({ gss, year: Number(v('time_period')), ...vals, notes: note.join(' ') || null });
  }
  if (unmatched.length) fail(`DfE authorities with no council:\n  ${unmatched.join('\n  ')}`);
  const keys = new Set(rows.map((r) => `${r.gss}|${r.year}`));
  if (keys.size !== rows.length) fail('duplicate council and year');
  const gaps = [];
  for (const c of educationAuthorities) for (const y of YEARS) if (!keys.has(`${c.gss_code}|${y}`) && !EXPECTED_GAPS[c.gss_code]?.years.includes(y)) gaps.push(`${y} ${c.slug}`);
  if (gaps.length) fail(`Education authorities with no row:\n  ${gaps.join('\n  ')}`);

  // ---------- report ----------
  const perYear = Object.fromEntries(YEARS.map((y) => [y, rows.filter((r) => r.year === Number(y)).length]));
  console.log('Rows per year:', perYear, '| total', rows.length);
  console.log('Councils with a row:', new Set(rows.map((r) => r.gss)).size, 'of', educationAuthorities.length, 'education authorities');
  console.log('Notes:'); for (const n of notes) console.log('  ' + n);
  for (const slug of ['kent', 'derbyshire']) {
    const g = councils.find((c) => c.slug === slug).gss_code;
    console.log(`${slug}:`, rows.filter((r) => r.gss === g).map((r) => `${r.year} issued ${r.plans_issued_ex}, within 20 weeks ${r.within_20_weeks_ex} (${r.pc_within_20_weeks_ex}%), over a year ${r.over_1_year_ex}`).join('; '));
  }

  // ---------- SQL ----------
  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const C = ['gss', 'year', 'plans_issued_ex', 'within_20_weeks_ex', 'pc_within_20_weeks_ex', 'over_1_year_ex', 'avg_weeks_ex', 'source_url', 'notes'];
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '', 'DELETE FROM public.council_ehcp;'];
  for (const r of rows) L.push(`INSERT INTO public.council_ehcp (${C.join(', ')}) VALUES (${C.map((c) => q(c === 'source_url' ? SOURCE_URL : r[c])).join(', ')});`);
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN');
  for (const y of YEARS) L.push(`  SELECT count(*) INTO n FROM public.council_ehcp WHERE year = ${y};`, `  IF n <> ${perYear[y]} THEN RAISE EXCEPTION 'expected ${perYear[y]} rows for ${y}, found %', n; END IF;`);
  L.push(`  SELECT count(*) INTO n FROM public.council_ehcp;`, `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`);
  L.push(`  SELECT count(*) INTO n FROM public.council_ehcp e LEFT JOIN public.councils c ON c.gss_code = e.gss WHERE c.slug IS NULL;`, `  IF n <> 0 THEN RAISE EXCEPTION '% rows match no council', n; END IF;`);
  L.push('END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${rows.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
