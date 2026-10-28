#!/usr/bin/env node
// Import council financial health into public.council_finance_events and
// public.council_reserves (migration scripts/migrations/2026-10-13c-council-finance.sql).
//
// DRY RUN BY DEFAULT: reads every source, prints what it would store and anything
// unmatched or unclear, writes NOTHING. Pass --write to save, only after the dry-run
// report has been approved.
//
// Sources:
//   * Section 114 reports: verified list below, from the Commons Levelling Up, Housing and
//     Communities Committee report "Financial distress in local authorities" (HC 56, 2024),
//     footnote 3, which lists every notice since 2018. Exact dates where the published record
//     gives a day; Northumberland is given by month only (May 2022), so it has no day.
//     Warnings that a notice might be needed are NOT included.
//   * Exceptional financial support: GOV.UK pages "Exceptional financial support for local
//     authorities for <year>" (Open Government Licence). Councils are matched by name;
//     an amount is stored only when exactly one clear figure follows the council's name.
//   * Interventions and best value inspections: GOV.UK "Statutory best value inspections
//     and interventions in England" (current list, updated 15 September 2026); start years
//     from the House of Commons Library briefing SN07104 (May 2026).
//   * Usable reserves: MHCLG "Local authority revenue expenditure and financing England:
//     2024 to 2025 individual local authority data - outturn", RS file (reserves) and RSX
//     file (net current expenditure), Open Government Licence. £ thousands.
//
// Usage:
//   node scripts/import-council-finance.js > council-finance-dryrun.txt 2>&1
//   node scripts/import-council-finance.js --write > council-finance-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const UA = { 'User-Agent': 'opengovt-import/1.0' };
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019' };
const S114_SOURCE = 'https://publications.parliament.uk/pa/cm5804/cmselect/cmcomloc/56/report.html';
const S114_SOURCE_TEXT = 'House of Commons Levelling Up, Housing and Communities Committee, Financial distress in local authorities (HC 56, 2024), footnote 3';
// name used to find the council in our table, and the date of each section 114 report
const SECTION_114 = [
  ['Croydon', '2020-11-11'], ['Croydon', '2020-12-02'], ['Croydon', '2022-11-22'],
  ['Slough', '2021-07-02'],
  ['Nottingham', '2021-12-15'], ['Nottingham', '2023-11-29'],
  ['Northumberland', '2022-05'],
  ['Thurrock', '2022-12-19'],
  ['Woking', '2023-06-07'],
  ['Birmingham', '2023-09-05'],
];
const INTERVENTIONS_URL = 'https://www.gov.uk/government/collections/statutory-best-value-inspections-and-interventions-in-england';
const LIBRARY_URL = 'https://researchbriefings.files.parliament.uk/documents/SN07104/SN07104.pdf';
// [name, type, start year (Commons Library) or inspection date (GOV.UK)]
const INTERVENTIONS = [
  ['Slough', 'intervention', '2021'], ['Nottingham', 'intervention', '2022'], ['Thurrock', 'intervention', '2022'],
  ['Croydon', 'intervention', '2023'], ['Woking', 'intervention', '2023'], ['Birmingham', 'intervention', '2023'],
  ['Tower Hamlets', 'intervention', '2025'], ['Spelthorne', 'intervention', '2025'], ['Warrington', 'intervention', '2025'],
  ['Bedford', 'best_value_inspection', '2026'],
];
const EFS_COLLECTION = '/government/collections/exceptional-financial-support-for-local-authorities';
const OUTTURN_PAGE = '/government/statistics/local-authority-revenue-expenditure-and-financing-england-2024-to-2025-individual-local-authority-data-outturn';

const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const num = (v) => { if (typeof v === 'number') return v; const s = cell(v).replace(/,/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&pound;/g, '£').replace(/\s+/g, ' ');
const nameKey = (x) => String(x || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(the|of|council|borough|metropolitan|city|county|district|london|royal|corporation)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
async function get(url, kind = 'text') {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (kind === 'buf') return Buffer.from(await res.arrayBuffer());
  if (kind === 'json') return res.json();
  return res.text();
}
const content = (path) => get(`https://www.gov.uk/api/content${path}`, 'json');

(async () => {
  console.log(`=== Council finance import (${WRITE ? 'WRITE' : 'DRY RUN - nothing will be written'}) ===`);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data: cs, error } = await db.from('councils').select('gss_code, name, short_name, type, country, section_114_year').limit(1000);
  if (error) throw new Error(`councils read: ${error.message}`);
  const eng = cs.filter((c) => c.country === 'England' && c.gss_code);
  const codes = new Set(eng.map((c) => c.gss_code));
  const byKey = new Map();
  for (const c of eng) for (const k of new Set([nameKey(c.name), nameKey(c.short_name)])) if (k) byKey.set(k, [...(byKey.get(k) || []), c]);
  const find = (name) => {
    const list = (byKey.get(nameKey(name)) || []).filter((c) => c.type !== 'county' || /county/i.test(name));
    if (list.length !== 1) throw new Error(`"${name}" matched ${list.length} councils: ${list.map((c) => c.name).join(', ')}`);
    return list[0];
  };
  const events = [], reserves = [];

  console.log('\n--- 1. Section 114 reports (verified list) ---');
  for (const [n, date] of SECTION_114) {
    const c = find(n);
    events.push({ council_gss_code: c.gss_code, event_type: 'section_114', period: date, event_date: date.length === 10 ? date : null, amount_gbp: null, detail: { council: c.name }, source: S114_SOURCE_TEXT, source_url: S114_SOURCE });
    console.log(`  ${c.name}: ${date}`);
  }
  const tableYears = eng.filter((c) => c.section_114_year).map((c) => `${c.name} ${c.section_114_year}`);
  console.log(`  councils table section_114_year now: ${tableYears.join('; ')} (Barnet is cleared by the migration)`);

  console.log('\n--- 2. Interventions and best value inspections (GOV.UK current list) ---');
  for (const [n, type, year] of INTERVENTIONS) {
    const c = find(n);
    events.push({ council_gss_code: c.gss_code, event_type: type, period: year, event_date: null, amount_gbp: null, detail: { council: c.name, start_year: year, status: 'current' }, source: 'GOV.UK, Statutory best value inspections and interventions in England; start years: House of Commons Library SN07104', source_url: INTERVENTIONS_URL });
    console.log(`  ${c.name}: ${type} since ${year}`);
  }

  console.log('\n--- 3. Exceptional financial support (GOV.UK yearly pages) ---');
  const coll = await content(EFS_COLLECTION);
  const pages = ((coll.links && coll.links.documents) || []).map((d) => d.base_path).filter((p) => /exceptional-financial-support-for-local-authorities-for-\d{4}-\d{2}$/.test(p));
  if (!pages.includes('/guidance/exceptional-financial-support-for-local-authorities-for-2026-27')) pages.unshift('/guidance/exceptional-financial-support-for-local-authorities-for-2026-27');
  const unclear = [];
  for (const p of [...new Set(pages)].sort().reverse()) {
    const c = await content(p);
    const year = p.match(/(\d{4}-\d{2})$/)[1];
    const body = plain(c.details && (c.details.body || (c.details.parts || []).map((x) => x.body).join(' ')));
    const lower = body.toLowerCase().replace(/&/g, ' and ');
    const named = [];
    for (const [k, list] of byKey) {
      if (k.length < 4) continue;
      const re = new RegExp(`\\b${k.replace(/ /g, '\\s+')}\\b`, 'gi');
      let m; while ((m = re.exec(lower))) { for (const council of list) named.push({ council, at: m.index }); }
    }
    // keep one entry per council (first mention), counties only when the page says "county"
    const seen = new Map();
    for (const n of named.sort((a, b) => a.at - b.at)) {
      if (n.council.type === 'county' && !/county/.test(lower.slice(n.at, n.at + 60))) continue;
      if (!seen.has(n.council.gss_code)) seen.set(n.council.gss_code, n);
    }
    let withAmount = 0;
    for (const { council, at } of seen.values()) {
      const after = body.slice(at, at + 220);
      const nextName = [...seen.values()].map((x) => x.at).filter((x) => x > at).sort((a, b) => a - b)[0];
      const span = nextName ? body.slice(at, Math.min(nextName, at + 220)) : after;
      const amounts = [...span.matchAll(/£\s?([\d,.]+)\s?(million|m|billion|bn)\b/gi)].map((m) => Number(m[1].replace(/,/g, '')) * (/^b/i.test(m[2]) ? 1e9 : 1e6));
      const amount = amounts.length === 1 ? amounts[0] : null;
      if (amount !== null) withAmount++; else unclear.push(`${year} ${council.name}: ${amounts.length} amounts near the name`);
      events.push({ council_gss_code: council.gss_code, event_type: 'exceptional_support', period: year, event_date: null, amount_gbp: amount, detail: { council: council.name, text: span.slice(0, 300) }, source: `GOV.UK, ${c.title}`, source_url: `https://www.gov.uk${p}` });
    }
    console.log(`  ${year}: ${seen.size} councils (${withAmount} with one clear amount) - ${[...seen.values()].map((x) => x.council.short_name || x.council.name).sort().join(', ')}`);
  }
  console.log(`  amounts left blank (not one clear figure): ${unclear.length}`);
  for (const u of unclear.slice(0, 40)) console.log(`    ${u}`);

  console.log('\n--- 4. Usable reserves 2024-25 (MHCLG revenue outturn RS and RSX) ---');
  try {
    const page = await content(OUTTURN_PAGE);
    const atts = ((page.details && page.details.attachments) || []).map((a) => ({ title: a.title, url: a.url }));
    const rs = atts.find((a) => /\(RS\)/.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
    const rsx = atts.find((a) => /\(RSX\)/.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
    if (!rs) throw new Error('RS file not found');
    console.log(`  RS: ${rs.title} | ${rs.url}\n  RSX: ${rsx ? `${rsx.title} | ${rsx.url}` : 'not found'}`);
    const readSheet = async (url, sheetRe) => {
      const wb = XLSX.read(await get(url, 'buf'), { type: 'buffer' });
      const s = wb.SheetNames.find((n) => sheetRe.test(n));
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
      let hi = -1, codeCol = -1;
      for (let i = 0; i < Math.min(rows.length - 1, 30); i++) { const j = rows[i + 1].findIndex((x) => /^E(06|07|08|09|10)\d{6}$/.test(cell(x))); if (j >= 0) { hi = i; codeCol = j; break; } }
      return { sheet: s, h: rows[hi].map(cell), data: rows.slice(hi + 1).filter((r) => /^E\d{8}$/.test(cell(r[codeCol]))), codeCol };
    };
    const R = await readSheet(rs.url, /^RS_LA_Data/i);
    // Every column that could hold a reserves or balance level, so the right ones can be confirmed.
    console.log('  RS columns mentioning reserves, unallocated, general fund or balances:');
    R.h.forEach((x, i) => { if (/reserve|unallocat|general fund|balance/i.test(x)) console.log(`    ${i}: ${x.slice(0, 200)}`); });
    const col = (re, label) => { const i = R.h.findIndex((x) => re.test(x)); if (i < 0) throw new Error(`RS column not found: ${label}`); console.log(`  ${label}: column ${i} "${R.h[i].slice(0, 140)}"`); return i; };
    const C = {
      unStart: col(/unallocated financial reserves level at 1 April/i, 'unallocated, 1 April'),
      emStart: col(/^Reserves at 1 April.*Estimated other earmarked financial reserves level/i, 'other earmarked, 1 April'),
      unEnd: col(/unallocated financial reserves level at 31 March/i, 'unallocated, 31 March'),
      emEnd: col(/^Reserves at 31 March.*Estimated other earmarked financial reserves level/i, 'other earmarked, 31 March'),
    };
    // Prior year adjustments: stored for reference only, not added into usable reserves.
    const pyaCol = R.h.findIndex((x) => /^Reserves \(continued\).*Prior Year Adjustments/i.test(x));
    console.log(`  prior year adjustments (reference only): ${pyaCol >= 0 ? `column ${pyaCol} "${R.h[pyaCol].slice(0, 140)}"` : 'not found'}`);
    // Spending base for the ratio: RSX total service expenditure (net current expenditure).
    // Net revenue expenditure is kept for reference only: it is the figure left after
    // specific grants and can be tiny or negative (Woking -21.6m), giving false percentages.
    const nreRs = R.h.findIndex((x) => /net revenue expenditure/i.test(x));
    const nreBy = new Map();
    if (nreRs >= 0) { console.log(`  net revenue expenditure (reference only): RS column ${nreRs} "${R.h[nreRs].slice(0, 140)}"`); for (const r of R.data) nreBy.set(cell(r[R.codeCol]), num(r[nreRs])); }
    if (!rsx) throw new Error('RSX file not found, so there is no spending base');
    const X = await readSheet(rsx.url, /^RSX_LA_Data/i);
    const tseCol = X.h.findIndex((x) => /^Total Service Expenditure.*Net Current Expenditure/i.test(x));
    if (tseCol < 0) throw new Error('RSX total service expenditure column not found');
    const baseLabel = `RSX column ${tseCol} "${X.h[tseCol].slice(0, 140)}"`;
    const tseBy = new Map(); for (const r of X.data) tseBy.set(cell(r[X.codeCol]), num(r[tseCol]));
    console.log(`  spending base: ${baseLabel}`);
    const unmatched = [];
    for (const r of R.data) {
      const raw = cell(r[R.codeCol]); const code = CODE_ALIASES[raw] || raw;
      if (!codes.has(code)) { if (/^E(06|07|08|09|10)/.test(raw)) unmatched.push(raw); continue; }
      const v = Object.fromEntries(Object.entries(C).map(([k, i]) => [k, num(r[i])]));
      const usableStart = v.unStart != null && v.emStart != null ? v.unStart + v.emStart : null;
      const usableEnd = v.unEnd != null && v.emEnd != null ? v.unEnd + v.emEnd : null;
      const nre = nreBy.get(raw) ?? null;
      const tse = tseBy.get(raw) ?? null;
      reserves.push({
        council_gss_code: code, financial_year: '2024-25',
        unallocated_start: v.unStart, earmarked_start: v.emStart, unallocated_end: v.unEnd, earmarked_end: v.emEnd,
        usable_start: usableStart, usable_end: usableEnd, usable_change: usableStart != null && usableEnd != null ? usableEnd - usableStart : null,
        net_revenue_expenditure: nre,
        usable_end_pct_of_spending: usableEnd != null && tse != null && tse > 0 ? Math.round((usableEnd / tse) * 1000) / 10 : null,
        detail: { spending_base: baseLabel, total_service_expenditure: tse, prior_year_adjustments: pyaCol >= 0 ? num(r[pyaCol]) : null },
        source: 'MHCLG, Local authority revenue expenditure and financing England: 2024 to 2025 individual local authority data - outturn (RS, RSX)', source_url: `https://www.gov.uk${OUTTURN_PAGE}`,
      });
    }
    const pct = reserves.map((x) => x.usable_end_pct_of_spending).filter((x) => x != null).sort((a, b) => a - b);
    console.log(`  councils: ${reserves.length}; with a spending base: ${pct.length}; codes not matched: ${unmatched.length}${unmatched.length ? ` (${unmatched.join(', ')})` : ''}`);
    console.log(`  usable reserves at 31 March 2025 as % of spending: min ${pct[0]}, median ${pct[Math.floor(pct.length / 2)]}, max ${pct[pct.length - 1]}`);
    const low = reserves.filter((x) => x.usable_end_pct_of_spending != null).sort((a, b) => a.usable_end_pct_of_spending - b.usable_end_pct_of_spending);
    const nm = (code) => (eng.find((c) => c.gss_code === code) || {}).name;
    console.log(`  lowest 10: ${low.slice(0, 10).map((x) => `${nm(x.council_gss_code)} ${x.usable_end_pct_of_spending}%`).join('; ')}`);
    const fall = reserves.filter((x) => x.usable_change != null && x.usable_start).sort((a, b) => a.usable_change / a.usable_start - b.usable_change / b.usable_start);
    console.log(`  biggest falls in the year: ${fall.slice(0, 10).map((x) => `${nm(x.council_gss_code)} ${Math.round((x.usable_change / x.usable_start) * 100)}%`).join('; ')}`);
    const neg = reserves.filter((x) => x.usable_end != null && x.usable_end < 0);
    console.log(`  councils with negative usable reserves: ${neg.length}${neg.length ? ` - ${neg.map((x) => nm(x.council_gss_code)).join(', ')}` : ''}`);
    // Warning signs to sit beside section 114, exceptional support and intervention flags.
    const warn = reserves.filter((x) => (x.usable_end != null && x.usable_end < 0) || (x.usable_change != null && x.usable_start > 0 && x.usable_change / x.usable_start <= -0.5));
    console.log(`  warning signs (usable reserves negative, or fell by half or more in the year): ${warn.length}`);
    for (const x of warn) console.log(`    ${nm(x.council_gss_code)}: usable ${x.usable_start} -> ${x.usable_end} (GBP thousands)${x.usable_start > 0 ? `, change ${Math.round((x.usable_change / x.usable_start) * 100)}%` : ''}`);
    const noFig = reserves.filter((x) => x.usable_end == null);
    console.log(`  councils with no usable reserves figure: ${noFig.length}${noFig.length ? ` - ${noFig.map((x) => nm(x.council_gss_code)).join(', ')}` : ''}`);
  } catch (e) {
    console.log(`  RESERVES SKIPPED: ${e.message}. The other sources are unaffected; reserves need a column decision before writing.`);
    reserves.length = 0;
  }

  console.log(`\nTotals: ${events.length} events (${['section_114', 'exceptional_support', 'intervention', 'best_value_inspection'].map((t) => `${t} ${events.filter((e) => e.event_type === t).length}`).join(', ')}); ${reserves.length} reserves rows`);
  const dupes = events.map((e) => `${e.council_gss_code}|${e.event_type}|${e.period}`).filter((k, i, a) => a.indexOf(k) !== i);
  if (dupes.length) console.log(`  DUPLICATE event keys (must be fixed before writing): ${dupes.join(', ')}`);
  if (!WRITE) { console.log('DRY RUN complete. Nothing was written.'); return; }
  if (dupes.length) throw new Error('duplicate event keys');

  console.log('\n--- Writing ---');
  const runStart = new Date().toISOString();
  const up = async (table, rows, conflict) => {
    for (let i = 0; i < rows.length; i += 500) {
      const { error: e } = await db.from(table).upsert(rows.slice(i, i + 500).map((r) => ({ ...r, synced_at: new Date().toISOString() })), { onConflict: conflict });
      if (e) throw new Error(`${table} upsert: ${e.message}`);
    }
    const { error: d, count } = await db.from(table).delete({ count: 'exact' }).lt('synced_at', runStart);
    if (d) throw new Error(`${table} stale delete: ${d.message}`);
    console.log(`  ${table}: ${rows.length} saved; ${count || 0} no longer in the sources removed`);
  };
  await up('council_finance_events', events, 'council_gss_code,event_type,period');
  await up('council_reserves', reserves, 'council_gss_code,financial_year');
  // Rebuild the site's cached council league data now rather than within 6 hours.
  await require('./lib/refresh-site').refreshCouncilPages();
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
