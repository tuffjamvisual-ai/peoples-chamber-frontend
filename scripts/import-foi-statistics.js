#!/usr/bin/env node
// Cabinet Office Freedom of Information statistics into foi_statistics (migration 2026-10-20m-foi-statistics.sql).
// Owner's approval, 20 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. --sql=file.sql writes one guarded transaction that
// replaces every row. Rerunnable.
//
// Source: "Freedom of Information statistics: April to June 2026" (accredited official statistics, published
// 16 Sep 2026), its "data" CSV, which holds the whole series: quarters Q1 2010 to Q2 2026 and calendar years 2010 to
// 2025 (it agrees cell for cell with the January to March 2026 and annual 2025 files where they overlap, checked
// 20 Oct 2026). Open Government Licence v3.0.
//   One request: robots.txt is read first, then the CSV, 10 seconds apart (GOV.UK's Crawl-delay).
//   --file=path   read the CSV from disk instead of downloading it
//
// Rules: the headers used must be exactly as checked on 20 Oct 2026; "-" or a blank cell is NULL; commas are removed
// from counts ("1,104" in some 2014 rows); percentages are stored as published (unrounded).
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), quiet: true });
const { parse } = require('csv-parse/sync');
const { UA } = require('./lib/polite-fetch');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const PAGE_URL = 'https://www.gov.uk/government/statistics/freedom-of-information-statistics-april-to-june-2026';
const CSV_URL = 'https://assets.publishing.service.gov.uk/media/6aa2be9b9f95f408139c6637/foi-statistics-q2-2026-published-data.csv';
const LATEST = 'Q2 2026';

// Our column -> the file's header, word for word.
const COLS = {
  received: 'Total requests received',
  processed: 'Requests Processed',
  on_hold_lapsed: 'Requests on-hold or lapsed',
  still_processing: 'Requests still being processed',
  handled_under_eirs: 'Requests handled under EIRs',
  received_ex: 'Total requests received (excluding on-hold and lapsed)',
  met_20_days: '20-day deadline met',
  permitted_extension: 'Permitted extension to 20-day deadline',
  late: 'Late response (i.e. 20-day deadline missed)',
  pct_met_20_days: 'Percentage of requests meeting 20-day deadline',
  pct_in_time: 'Percentage of requests "in time" (i.e. meeting deadline or with permitted extension)',
  advice_given: 'Requests where advice and assistance provided',
  info_not_held: 'Requests where information not held',
  resolvable: 'Total "resolvable" requests',
  granted_full: 'Initial Outcome Granted in full',
  partially_withheld: 'Initial Outcome  Partially withheld',
  fully_withheld: 'Initial Outcome  Fully withheld',
  not_yet_provided: 'Initial Outcome Response not yet provided',
  pct_granted_full: 'Percentage of resolvable requests granted in full',
  pct_withheld_full: 'Percentage of resolvable requests withheld in full',
  internal_reviews: 'Total Internal Reviews',
  ir_outcome_known: 'Internal Reviews with outcome known',
  ir_upheld_full: 'IR number upheld in full',
  ir_upheld_part: 'IR number upheld in part',
  ir_overturned: 'IR number overturned',
  pct_ir_upheld_full: 'IR percentage upheld in full',
  ico_complaints: 'ICO Total Complaints',
  ico_outcome_known: 'ICO Complaints with known outcome',
  ico_upheld_full: 'ICO Number upheld in full',
  ico_upheld_part: 'ICO Number upheld in part',
  ico_overturned: 'ICO Number overturned',
  pct_ico_upheld_full: 'ICO Percentage upheld in full',
};

function value(col, v, where) {
  const s = String(v ?? '').trim().replace(/,/g, '');
  if (s === '' || s === '-') return null;
  if (col.startsWith('pct_')) {
    if (!/^\d+(\.\d+)?$/.test(s) || Number(s) > 100) fail(`${where}: "${v}" is not a percentage`);
    return Number(s);
  }
  if (!/^\d+$/.test(s)) fail(`${where}: "${v}" is not a whole number`);
  return Number(s);
}

(async () => {
  let bytes;
  if (arg('file')) bytes = fs.readFileSync(arg('file'));
  else {
    // robots.txt first (assets.publishing.service.gov.uk had none on 20 Oct 2026: a 404 means no rules).
    const robots = await fetch('https://assets.publishing.service.gov.uk/robots.txt', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const rules = robots.ok ? await robots.text() : robots.status === 404 ? '' : 'Disallow: /';
    if (/^Disallow:\s*\/(media)?\s*$/im.test(rules)) fail('robots.txt disallows the file');
    await new Promise((r) => setTimeout(r, 10000));
    const res = await fetch(CSV_URL, { headers: { 'User-Agent': UA }, redirect: 'manual' });
    if (!res.ok) fail(`CSV: HTTP ${res.status}`);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  const records = parse(bytes, { bom: true, columns: true, relax_column_count: false });
  const headers = Object.keys(records[0] || {});
  const missing = ['Quarter', 'Government body', ...Object.values(COLS)].filter((h) => !headers.includes(h));
  if (missing.length) fail(`headers not found (file changed?): ${JSON.stringify(missing)}`);

  const out = []; const seen = new Set();
  for (const r of records) {
    const period = r['Quarter'].trim(), body = r['Government body'].trim();
    const m = period.match(/^(?:Q([1-4]) )?(20\d{2})$/);
    if (!m || !body) fail(`unexpected row: "${period}" / "${body}"`);
    const key = `${body}|${period}`;
    if (seen.has(key)) fail(`duplicate row ${key}`);
    seen.add(key);
    const row = { body, period, period_year: Number(m[2]), period_quarter: m[1] ? Number(m[1]) : null };
    for (const [col, h] of Object.entries(COLS)) row[col] = value(col, r[h], `${period} ${body} ${h}`);
    out.push(row);
  }
  const latest = out.filter((r) => r.period === LATEST);
  const periods = new Set(out.map((r) => r.period));
  console.log(`rows: ${out.length}; periods: ${periods.size} (${[...periods].filter((p) => p.startsWith('Q')).length} quarters, ${[...periods].filter((p) => !p.startsWith('Q')).length} years); bodies in ${LATEST}: ${latest.length}`);
  if (latest.length !== 39) fail(`expected 39 bodies in ${LATEST}, found ${latest.length}`);
  for (const b of ['Home Office', 'Department for Work and Pensions', 'Cabinet Office']) {
    const r = latest.find((x) => x.body === b);
    console.log(`  ${LATEST} ${b}: received ${r.received}, 20 days ${r.met_20_days} of ${r.received_ex} (${r.pct_met_20_days}%), extension ${r.permitted_extension}, late ${r.late}, granted ${r.granted_full} / partly ${r.partially_withheld} / fully ${r.fully_withheld} of ${r.resolvable}`);
  }

  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  const C = ['body', 'period', 'period_year', 'period_quarter', ...Object.keys(COLS)];
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '', 'DELETE FROM public.foi_statistics;'];
  for (let i = 0; i < out.length; i += 500) {
    L.push(`INSERT INTO public.foi_statistics (${C.join(', ')}, source_url) VALUES`,
      out.slice(i, i + 500).map((r) => `(${C.map((c) => q(r[c])).join(', ')}, ${q(PAGE_URL)})`).join(',\n') + ';');
  }
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN',
    `  SELECT count(*) INTO n FROM public.foi_statistics; IF n <> ${out.length} THEN RAISE EXCEPTION 'expected ${out.length} rows, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.foi_statistics WHERE period = '${LATEST}'; IF n <> ${latest.length} THEN RAISE EXCEPTION 'expected ${latest.length} rows for ${LATEST}, found %', n; END IF;`,
    `  SELECT count(DISTINCT period) INTO n FROM public.foi_statistics; IF n <> ${periods.size} THEN RAISE EXCEPTION 'expected ${periods.size} periods, found %', n; END IF;`,
    'END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${out.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
