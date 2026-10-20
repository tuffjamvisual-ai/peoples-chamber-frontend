#!/usr/bin/env node
// Government Major Projects Portfolio data from GOV.UK into major_projects (migration 2026-10-20d-major-projects.sql).
// Owner's approval and decisions, 20 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. --sql=file.sql --sql-tag=<suffix> writes one guarded
// transaction that replaces every row (backing up the rows already there). Rerunnable.
//
// Sources (robots.txt checked on every run; assets.publishing.service.gov.uk has none; one request every 5 seconds,
// redirects checked first). One CSV per annual report:
//   March 2024  IPA Annual Report 2023-24           Government_Major_Projects_Portofolio_AR_Data_March_2024.csv
//   March 2025  NISTA Annual Report 2024-25          nista_annual_report_data_2425.csv
//   March 2026  NISTA Major Projects AR 2025-26      NISTA_Major_Projects_Annual_Report_2025-2026_Data.csv
//   --cache=dir   read gmpp-<year>.csv from there if present, and save downloads there (default: a fresh temp folder)
//   --json=file   also write the rows as JSON (for checking)
//
// Rules:
//   - One row per project per report. The key is the file's project ID; the 2 rows in March 2026 with no ID get
//     'no-id:<DEPT>:<name>' (they are new programmes, not renamed ones; checked by hand in step 1).
//   - Rating: whichever of the IPA and SRO columns holds Red, Amber or Green (the other is blank or "Not
//     Applicable"); the column is kept. Where neither does, rating is NULL and the file's wording is kept as
//     rating_withheld (an exemption, "still at the planning stage", "Not Applicable").
//   - Cost: a single figure (commas and £ removed) goes in whole_life_cost_m; anything else (Low/Mid/High ranges,
//     exemptions, "Not Available") is kept word for word in cost_text. Nothing is picked from a range.
//   - Price basis: 'real 2024/25' for March 2026, from its column header "Whole Life Cost (£m, Presented in 2024/25
//     Real Prices)"; 'not stated' for March 2024 and 2025, whose files and reports give no basis.
//   - Dates: 2024-03-31, 2024-03-31 00:00:00 and 31/03/2024 are read as dates; anything else (ranges, exemptions,
//     "No") is kept word for word in start_text / end_text.
//   - Evaluation plan (owner's approval, 20 Oct 2026): word for word from "Does the project have an evaluation plan?
//     (self reported)" (March 2025) and "Evaluation Plan and Registry Link" (March 2026); the March 2024 file has no
//     such column (NULL).
//   - Department: the code as published; dept_slug from DEPT (case ignored). HMRC and VOA go on the Treasury tab
//     (owner's decision). DSIT was split in the July 2026 reshuffle, so its projects get no department page until
//     GOV.UK shows where each went (DSIT_TODAY); HMLR, ONS and NCA have none either. Those appear on
//     /transparency/major-projects only.

const fs = require('fs');
const os = require('os');
const path = require('path');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const UA = 'opengovt.uk-major-projects/1.0 (https://opengovt.uk; major projects; one request every 5 seconds)';
const CACHE = arg('cache') || fs.mkdtempSync(path.join(os.tmpdir(), 'major-projects-'));
fs.mkdirSync(CACHE, { recursive: true });

const REPORTS = [
  { year: 2024, basis: 'not stated', url: 'https://assets.publishing.service.gov.uk/media/6787e8ee1124a2c3ceb646be/Government_Major_Projects_Portofolio_AR_Data_March_2024.csv',
    cols: { id: 'GMPP ID Number', name: 'Project Name', dept: 'Department', ipa: 'IPA Delivery Confidence Assessment', sro: 'SRO Delivery Confidence Assessment',
      ratingNarr: 'Departmental commentary on actions planned or taken on the IPA RAG rating.', start: 'Project - Start Date', end: 'Project - End Date',
      schedNarr: 'Departmental narrative on schedule', wlc: 'TOTAL Baseline Whole Life Costs (£m)', costNarr: 'Departmental Narrative on Budgeted Whole Life Costs' } },
  { year: 2025, basis: 'not stated', url: 'https://assets.publishing.service.gov.uk/media/6895fbb63080e72710b2e2ef/nista_annual_report_data_2425.csv',
    cols: { id: 'GMPP ID', name: 'Project Name', dept: 'Department', ipa: 'IPA Delivery Confidence Assessment', sro: 'SRO Delivery Confidence Assessment',
      ratingNarr: 'Departmental Commentary on Delivery Confidence Assessment Rating', start: 'Start Date', end: 'End Date',
      schedNarr: 'Schedule Narrative', wlc: 'Whole Life Cost (£m)', costNarr: 'Costs Narrative',
      evalPlan: 'Does the project have an evaluation plan?' } },
  { year: 2026, basis: 'real 2024/25', url: 'https://assets.publishing.service.gov.uk/media/6a4fb28da6586e258d371bfd/NISTA_Major_Projects_Annual_Report_2025-2026_Data.csv',
    cols: { id: 'Major Projects ID', name: 'Project Name', dept: 'Department', ipa: 'IPA Delivery Confidence Assessment', sro: 'SRO Delivery Confidence Assessment',
      ratingNarr: 'Departmental Commentary on Delivery Confidence Assessment Rating', start: 'Start Date', end: 'End Date',
      schedNarr: 'Schedule Narrative', wlc: 'Whole Life Cost (£m, Presented in 2024/25 Real Prices)', costNarr: 'Costs Narrative',
      evalPlan: 'Evaluation Plan and Registry Link' } },
];

// Department code (upper case) -> /departments/<slug>. No entry: no department page (non-ministerial departments).
const DEPT = {
  CO: 'cabinet-office', DBT: 'business-trade', DCMS: 'culture', DEFRA: 'environment', DESNZ: 'energy', DFE: 'education',
  DFT: 'transport', DHSC: 'health', DLUHC: 'housing', MHCLG: 'housing', DWP: 'work-pensions', FCDO: 'foreign-office',
  HMT: 'treasury', HO: 'home-office', MOD: 'defence', MOJ: 'justice',
  HMRC: 'treasury', VOA: 'treasury', // owner's decision, 20 Oct 2026: shown on the Treasury tab with their own label
};
// DSIT was split in the July 2026 reshuffle: digital and telecoms to DCMS, science and innovation to Business,
// Innovation, Science and Trade. Owner's decision (20 Oct 2026): no department page for these until GOV.UK shows
// which department each project is now under; null = /transparency/major-projects only.
const DSIT_TODAY = {
  'DCMS_0019_2021-Q4': null, // Project Gigabit
  'DCMS_0020_2122-Q1': null, // Shared Rural Network
  'DCMS_0107_2223-Q1': null, // Open Networks Programme
  'BEIS_0005_1920-Q4': null, // Met Office Supercomputer Programme
  'BEIS_0079_2122-Q4': null, // MATRIX CLUSTER TRANSFORMATION PROGRAMME
  'CO_0014_2122-Q2': null,   // National Underground Asset Register (NUAR)
  'CO_0033_2122-Q1': null,   // GOV.UK One Login
};

// ---------- polite fetching ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const robotsCache = new Map();
async function robotsAllow(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.host)) {
    const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
    robotsCache.set(u.host, r.ok ? await r.text() : r.status === 404 ? '' : 'User-agent: *\nDisallow: /');
    await sleep(5000);
  }
  let inStar = false; let best = { len: -1, allow: true };
  for (const line of robotsCache.get(u.host).split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(); const v = m[2].trim();
    if (k === 'user-agent') { inStar = v === '*'; continue; }
    if (!inStar || (k !== 'allow' && k !== 'disallow') || !v) continue;
    const re = new RegExp('^' + v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(u.pathname + u.search) && v.length > best.len) best = { len: v.length, allow: k === 'allow' };
  }
  return best.allow;
}
async function get(url, file, hops = 3) {
  if (fs.existsSync(file)) return fs.readFileSync(file);
  if (!(await robotsAllow(url))) fail(`robots.txt disallows ${url}`);
  const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
  await sleep(5000);
  if ([301, 302, 303, 307, 308].includes(r.status) && hops) return get(new URL(r.headers.get('location'), url).href, file, hops - 1);
  if (!r.ok) fail(`HTTP ${r.status} for ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (/just a moment|cf-chl|captcha/i.test(b.subarray(0, 4000).toString())) fail(`bot check at ${url}; stopping`);
  fs.writeFileSync(file, b);
  return b;
}

// ---------- reading the files ----------
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
const tidy = (s) => (s ?? '').replace(/​/g, '').trim();
const orNull = (s) => (tidy(s) === '' ? null : tidy(s));
const RAG = ['RED', 'AMBER', 'GREEN'];
function readDate(s) {
  const t = tidy(s);
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?: 00:00:00)?$/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, text: null };
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return { date: `${m[3]}-${m[2]}-${m[1]}`, text: null };
  return { date: null, text: t || null };
}
function readCost(s) {
  const t = tidy(s);
  if (/^£?-?[\d,]+(\.\d+)?$/.test(t)) return { cost: Number(t.replace(/[£,]/g, '')), text: null };
  return { cost: null, text: t || null };
}
const slugName = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const rows = []; const problems = [];
  for (const rep of REPORTS) {
    const buf = await get(rep.url, path.join(CACHE, `gmpp-${rep.year}.csv`));
    const [head, ...body] = parseCsv(buf.toString('utf8').replace(/^﻿/, ''));
    const col = {};
    for (const [k, start] of Object.entries(rep.cols)) {
      const i = head.findIndex((h) => tidy(h).replace(/\s+/g, ' ').startsWith(start));
      if (i < 0) fail(`${rep.year}: no column starting "${start}"`);
      col[k] = i;
    }
    const seen = new Set();
    for (const r of body) {
      if (!r.some((x) => tidy(x))) continue;
      const v = (k) => tidy(r[col[k]]);
      const id = orNull(v('id'));
      if (id && !/^[A-Za-z]+_\d{4}_\d{4}-Q[1-4]$/.test(id)) fail(`${rep.year}: unexpected ID "${id}"`);
      const code = v('dept');
      const key = id ?? `no-id:${code.toUpperCase()}:${slugName(v('name'))}`;
      if (seen.has(key)) fail(`${rep.year}: ${key} twice`);
      seen.add(key);

      const ipa = v('ipa'); const sro = v('sro');
      const ragIpa = RAG.includes(ipa.toUpperCase()); const ragSro = RAG.includes(sro.toUpperCase());
      if (ragIpa && ragSro) problems.push(`${rep.year} ${key}: both columns rated (${ipa} / ${sro}); IPA used`);
      const ratingColumn = ragIpa ? 'IPA' : ragSro ? 'SRO' : null;
      const rating = ratingColumn ? (ragIpa ? ipa : sro).toUpperCase() : null;
      const withheld = rating ? null : [...new Set([ipa, sro].filter(Boolean))].join(' / ') || null;

      const { cost, text: costText } = readCost(v('wlc'));
      const s = readDate(v('start')); const e = readDate(v('end'));
      const upper = code.toUpperCase();
      const deptSlug = upper === 'DSIT' ? (DSIT_TODAY[id] ?? null) : (DEPT[upper] ?? null);
      if (upper === 'DSIT' && !(id in DSIT_TODAY)) problems.push(`${rep.year} ${key}: DSIT project not in DSIT_TODAY`);

      rows.push({
        project_key: key, project_id: id, report_year: rep.year, data_as_at: `March ${rep.year}`, name: v('name'),
        department_code: code, dept_slug: deptSlug, rating, rating_column: ratingColumn, rating_withheld: withheld,
        whole_life_cost_m: cost, cost_text: costText, price_basis: rep.basis,
        start_date: s.date, start_text: s.text, end_date: e.date, end_text: e.text,
        cost_narrative: orNull(v('costNarr')), schedule_narrative: orNull(v('schedNarr')), rating_narrative: orNull(v('ratingNarr')),
        evaluation_plan: col.evalPlan === undefined ? null : orNull(v('evalPlan')),
        source_url: rep.url,
      });
    }
  }

  // ---------- report ----------
  const by = (f) => rows.reduce((m, r) => m.set(f(r), (m.get(f(r)) || 0) + 1), new Map());
  console.log('Rows per report:', Object.fromEntries(by((r) => r.report_year)));
  console.log('Projects (distinct keys):', new Set(rows.map((r) => r.project_key)).size);
  console.log('Rating:', Object.fromEntries(by((r) => `${r.report_year} ${r.rating ? `${r.rating} (${r.rating_column})` : 'withheld/none'}`)));
  console.log('Cost single figure / text / blank:', REPORTS.map((x) => `${x.year} ${rows.filter((r) => r.report_year === x.year && r.whole_life_cost_m != null).length}/${rows.filter((r) => r.report_year === x.year && r.cost_text).length}/${rows.filter((r) => r.report_year === x.year && r.whole_life_cost_m == null && !r.cost_text).length}`).join(', '));
  console.log('End date single / text / blank:', REPORTS.map((x) => `${x.year} ${rows.filter((r) => r.report_year === x.year && r.end_date).length}/${rows.filter((r) => r.report_year === x.year && r.end_text).length}/${rows.filter((r) => r.report_year === x.year && !r.end_date && !r.end_text).length}`).join(', '));
  console.log('Rows with no department page:', Object.fromEntries(by((r) => (r.dept_slug ? null : r.department_code.toUpperCase()))), '(the null key counts rows that have one)');
  if (problems.length) { console.log('\nProblems:'); for (const p of problems) console.log('  ' + p); }
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(rows, null, 1));

  // ---------- SQL ----------
  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql --sql-tag=<suffix> to write the transaction.'); return; }
  const tag = arg('sql-tag');
  if (!/^[a-z0-9_]+$/.test(tag)) fail('give --sql-tag=<backup table suffix>, e.g. 20261021a');
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const C = ['project_key', 'project_id', 'report_year', 'data_as_at', 'name', 'department_code', 'dept_slug', 'rating', 'rating_column', 'rating_withheld',
    'whole_life_cost_m', 'cost_text', 'price_basis', 'start_date', 'start_text', 'end_date', 'end_text', 'cost_narrative', 'schedule_narrative', 'rating_narrative', 'evaluation_plan', 'source_url'];
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '',
    'DO $$ BEGIN',
    `  IF EXISTS (SELECT 1 FROM public.major_projects) THEN EXECUTE 'CREATE TABLE public.major_projects_backup_${tag} AS SELECT * FROM public.major_projects'; EXECUTE 'ALTER TABLE public.major_projects_backup_${tag} ENABLE ROW LEVEL SECURITY'; END IF;`,
    'END $$;',
    'DELETE FROM public.major_projects;'];
  for (const r of rows) L.push(`INSERT INTO public.major_projects (${C.join(', ')}) VALUES (${C.map((c) => q(r[c])).join(', ')});`);
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN');
  for (const x of REPORTS) {
    const n = rows.filter((r) => r.report_year === x.year).length;
    L.push(`  SELECT count(*) INTO n FROM public.major_projects WHERE report_year = ${x.year};`,
      `  IF n <> ${n} THEN RAISE EXCEPTION 'expected ${n} rows for ${x.year}, found %', n; END IF;`);
  }
  for (const x of REPORTS) {
    const e = rows.filter((r) => r.report_year === x.year && r.evaluation_plan != null).length;
    L.push(`  SELECT count(*) INTO n FROM public.major_projects WHERE report_year = ${x.year} AND evaluation_plan IS NOT NULL;`,
      `  IF n <> ${e} THEN RAISE EXCEPTION 'expected ${e} evaluation plan entries for ${x.year}, found %', n; END IF;`);
  }
  L.push(`  SELECT count(*) INTO n FROM public.major_projects;`,
    `  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} rows, found %', n; END IF;`,
    `  SELECT count(DISTINCT project_key) INTO n FROM public.major_projects;`,
    `  IF n <> ${new Set(rows.map((r) => r.project_key)).size} THEN RAISE EXCEPTION 'expected ${new Set(rows.map((r) => r.project_key)).size} projects, found %', n; END IF;`);
  L.push('END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${rows.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
