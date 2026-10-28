#!/usr/bin/env node
// Cabinet Office Freedom of Information statistics into foi_statistics (migration 2026-10-20m-foi-statistics.sql).
// Owner's approval, 20 Oct 2026.
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. --sql=file.sql writes one guarded transaction that
// replaces every row. Rerunnable.
//
// Source: the Cabinet Office's "Freedom of Information statistics" (accredited official statistics). Each release's
// "published-data" CSV holds the whole series (quarters from Q1 2010 and calendar years from 2010), so each import
// replaces the table. Open Government Licence v3.0.
//
// Which release (--latest, used by the weekly workflow .github/workflows/weekly-foi-statistics.yml):
//   reads the collection (GOV.UK content API, /government/collections/freedom-of-information-statistics), takes the
//   newest release whose period is newer than the latest in foi_statistics ("April to June 2026", or "annual 2025"
//   when that year's row is missing), reads its page for the "published-data" CSV and downloads it. Nothing newer:
//   prints "no new release" and writes nothing. The file's newest period must match the release's title, or the run
//   stops (the April to June 2026 page's description named the previous quarter; the data did not).
//   Requests: robots.txt first for each host, one at a time, 10 seconds apart.
// Or --file=path (with --page=URL of its release page) to import a CSV already on disk.
//
// Rules: the headers used must be exactly as checked on 20 Oct 2026; "-" or a blank cell is NULL; commas are removed
// from counts ("1,104" in some 2014 rows); percentages are stored as published (unrounded). The transaction stops
// if the new file has fewer rows than the table, or the counts after loading differ from the file's.
const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), quiet: true }); } catch { /* CI sets the environment */ }
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
const { makePoliteFetch } = require('./lib/polite-fetch');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const fail = (m) => { console.error(m); process.exit(1); };
const GOVUK = 'https://www.gov.uk';
const COLLECTION = '/government/collections/freedom-of-information-statistics';
const QUARTER_TITLES = { 'january to march': 1, 'april to june': 2, 'july to september': 3, 'october to december': 4 };

// "Freedom of Information statistics: April to June 2026" -> { period: 'Q2 2026', key }; "...: annual 2025" -> { period: '2025' }.
function releasePeriod(title) {
  const t = String(title || '').toLowerCase();
  let m = t.match(/freedom of information statistics:\s*(january to march|april to june|july to september|october to december)\s+(20\d{2})$/);
  if (m) return { period: `Q${QUARTER_TITLES[m[1]]} ${m[2]}`, key: Number(m[2]) * 4 + QUARTER_TITLES[m[1]] - 1, annual: false };
  m = t.match(/freedom of information statistics:\s*annual\s+(20\d{2})$/);
  if (m) return { period: m[1], key: Number(m[1]) * 4 + 3, annual: true };
  return null;
}

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
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const { data: cur, error: curErr } = await sb.from('foi_statistics').select('period, period_year, period_quarter')
    .not('period_quarter', 'is', null).order('period_year', { ascending: false }).order('period_quarter', { ascending: false }).limit(1);
  if (curErr) fail(`reading foi_statistics: ${curErr.message}`);
  const curKey = cur && cur[0] ? cur[0].period_year * 4 + cur[0].period_quarter - 1 : -1;
  const { count: curRows } = await sb.from('foi_statistics').select('body', { count: 'exact', head: true });
  console.log(`foi_statistics now: latest quarter ${cur && cur[0] ? cur[0].period : 'none'}, ${curRows ?? 0} rows`);

  let bytes, pageUrl, expected;
  if (arg('file')) {
    bytes = fs.readFileSync(arg('file'));
    pageUrl = arg('page') || fail('--file needs --page=<the release page URL> for source_url');
    expected = null;
  } else if (process.argv.includes('--latest')) {
    const { getJson, getBytes } = makePoliteFetch({ delayMs: 10000, log: (m) => console.log(m) });
    const col = await getJson(`${GOVUK}/api/content${COLLECTION}`);
    if (col.status !== 200) fail(`collection: HTTP ${col.status}`);
    const docs = (col.json.links && col.json.links.documents) || [];
    const releases = docs.map((d) => ({ ...releasePeriod(d.title), title: d.title, path: d.base_path })).filter((r) => r.period);
    if (releases.length === 0) fail('no releases recognised in the collection (titles changed?)');
    const years = new Set();
    if (releases.some((r) => r.annual)) {
      const { data: yr } = await sb.from('foi_statistics').select('period').is('period_quarter', null).limit(1000);
      for (const y of yr || []) years.add(y.period);
    }
    const newer = releases.filter((r) => (r.annual ? !years.has(r.period) && r.key >= curKey : r.key > curKey)).sort((x, y) => y.key - x.key || Number(x.annual) - Number(y.annual));
    if (newer.length === 0) { console.log(`no new release (newest in the collection: ${releases.sort((x, y) => y.key - x.key)[0].title})`); return; }
    const rel = newer[0];
    console.log(`new release: ${rel.title} (${rel.path})`);
    const page = await getJson(`${GOVUK}/api/content${rel.path}`);
    if (page.status !== 200) fail(`release page: HTTP ${page.status}`);
    const csvs = ((page.json.details && page.json.details.attachments) || []).filter((x) => /published-data\.csv$/i.test(x.filename || x.url || ''));
    if (csvs.length !== 1) fail(`expected one published-data CSV on ${rel.path}, found ${csvs.length}`);
    const got = await getBytes(csvs[0].url);
    if (got.status !== 200) fail(`CSV: HTTP ${got.status}`);
    bytes = got.bytes; pageUrl = `${GOVUK}${rel.path}`; expected = rel;
  } else {
    fail('give --latest (find and import the newest release) or --file=path --page=URL');
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
  const quarters = out.filter((r) => r.period_quarter != null);
  const top = quarters.reduce((m, r) => Math.max(m, r.period_year * 4 + r.period_quarter - 1), -1);
  const LATEST = `Q${(top % 4) + 1} ${Math.floor(top / 4)}`;
  if (expected) {
    // The file must hold the release's own period: its newest quarter (or, for an annual release, that year's rows).
    if (!expected.annual && LATEST !== expected.period) fail(`the release is ${expected.period} but the file's newest quarter is ${LATEST}`);
    if (expected.annual && !out.some((r) => r.period === expected.period)) fail(`the release is annual ${expected.period} but the file has no ${expected.period} rows`);
  }
  if (top < curKey) fail(`the file's newest quarter (${LATEST}) is older than the table's`);
  const latest = out.filter((r) => r.period === LATEST);
  const periods = new Set(out.map((r) => r.period));
  console.log(`rows: ${out.length}; periods: ${periods.size} (${[...periods].filter((p) => p.startsWith('Q')).length} quarters, ${[...periods].filter((p) => !p.startsWith('Q')).length} years); bodies in ${LATEST}: ${latest.length}`);
  if (latest.length < 30) fail(`only ${latest.length} bodies in ${LATEST}; expected about 39`);
  for (const b of ['Home Office', 'Department for Work and Pensions', 'Cabinet Office']) {
    const r = latest.find((x) => x.body === b);
    if (!r) { console.log(`  ${LATEST} ${b}: not in the file`); continue; }
    console.log(`  ${LATEST} ${b}: received ${r.received}, 20 days ${r.met_20_days} of ${r.received_ex} (${r.pct_met_20_days}%), extension ${r.permitted_extension}, late ${r.late}, granted ${r.granted_full} / partly ${r.partially_withheld} / fully ${r.fully_withheld} of ${r.resolvable}`);
  }

  if (!arg('sql')) { console.log('\nDry run: nothing written. Give --sql=file.sql to write the transaction.'); return; }
  const C = ['body', 'period', 'period_year', 'period_quarter', ...Object.keys(COLS)];
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', '',
    // Never replace the table with a shorter series than it holds.
    'DO $$ DECLARE n int; BEGIN',
    `  SELECT count(*) INTO n FROM public.foi_statistics; IF n > ${out.length} THEN RAISE EXCEPTION 'the table has % rows, the new file only ${out.length}', n; END IF;`,
    'END $$;',
    'DELETE FROM public.foi_statistics;'];
  for (let i = 0; i < out.length; i += 500) {
    L.push(`INSERT INTO public.foi_statistics (${C.join(', ')}, source_url) VALUES`,
      out.slice(i, i + 500).map((r) => `(${C.map((c) => q(r[c])).join(', ')}, ${q(pageUrl)})`).join(',\n') + ';');
  }
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN',
    `  SELECT count(*) INTO n FROM public.foi_statistics; IF n <> ${out.length} THEN RAISE EXCEPTION 'expected ${out.length} rows, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.foi_statistics WHERE period = '${LATEST}'; IF n <> ${latest.length} THEN RAISE EXCEPTION 'expected ${latest.length} rows for ${LATEST}, found %', n; END IF;`,
    `  SELECT count(DISTINCT period) INTO n FROM public.foi_statistics; IF n <> ${periods.size} THEN RAISE EXCEPTION 'expected ${periods.size} periods, found %', n; END IF;`,
    'END $$;', '', 'COMMIT;');
  fs.writeFileSync(arg('sql'), L.join('\n') + '\n');
  console.log(`\nWrote ${arg('sql')} (${out.length} rows). Not run.`);
})().catch((e) => fail(e.stack || String(e)));
