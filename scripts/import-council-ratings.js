#!/usr/bin/env node
// Import council performance measures into public.council_ratings
// (migration scripts/migrations/2026-10-13b-council-ratings.sql). England.
//
// DRY RUN BY DEFAULT: downloads and parses everything, prints coverage and
// distributions, writes NOTHING (reads the councils table to match codes).
// Pass --write to save, only after the dry-run report has been approved.
//
// Sources (all Open Government Licence, found through GOV.UK's content API so a
// new edition is picked up from the same page):
//   1. Ofsted, "Local authority inspection outcomes as at 31 March 2026", sheet
//      Inspections_as_at_31_March: overall effectiveness of children's services per
//      council, with sub-judgements, dates and report link.
//   2. Defra, "Local authority collected waste management - annual results",
//      LA_and_Regional_Spreadsheet, Table_3: % of household waste sent for reuse,
//      recycling or composting (ex NI192), latest year. Stored as a percentage
//      (the file holds a fraction: 0.451 -> 45.1).
//   3. MHCLG, "Live tables on planning application statistics", Table P151a (major)
//      and Table P153 (non-major): MHCLG's published % of decisions made within the
//      statutory period or an agreed extension over 24 months (the period used when
//      the government assesses councils), including its estimates for missing
//      quarters and penalties for missing data. The 12-month % and our own
//      calculation from the counts are kept in detail; the report compares them.
//   4. CQC local authority assessments (adult social care, Open Government Licence):
//      each council's report page at
//      cqc.org.uk/care-services/local-authority-assessment-reports/<name>-council
//      (CQC's search pages are disallowed by its robots.txt, so addresses are built
//      from the council's name). Grade, publication date and the nine quality
//      statement scores. Councils: those Ofsted inspects (the same councils run
//      adult social care).
//   (Ombudsman complaint figures: the Ombudsman's site blocks automated reading, so
//   they will come from a spreadsheet requested from the Ombudsman instead.)
//      Off by default: only read with --with-cqc, one page at a time with a pause,
//      stopping at once if CQC refuses requests (HTTP 403). Results are saved to
//      data/council-ratings/cqc-assessments.json (not committed) and reused, so each
//      page is read at most once.
//
// Usage:
//   node scripts/import-council-ratings.js > council-ratings-dryrun.txt 2>&1
//   node scripts/import-council-ratings.js --write > council-ratings-write.txt 2>&1
//   add --with-cqc to read CQC pages not already saved

'use strict';
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
// CQC pages are only read when asked (--with-cqc); CQC's site blocks heavy automated
// reading. Whatever is found is saved to CQC_CACHE so no page is read twice.
const WITH_CQC = process.argv.includes('--with-cqc');
const fs = require('fs');
const path = require('path');
const CQC_CACHE = path.join(__dirname, '..', 'data', 'council-ratings', 'cqc-assessments.json');
const UA = { 'User-Agent': 'opengovt-import/1.0' };
// ONS codes used by the sources -> codes held in public.councils.
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019', E10000002: 'E06000060' };
// Defra joint collection figure -> the councils it covers.
const JOINT_CODES = { E50000008: ['E07000008', 'E07000012'] };
const CQC_BASE = 'https://www.cqc.org.uk/care-services/local-authority-assessment-reports/';
const LGO = 'https://www.lgo.org.uk';
const PAUSE_MS = 800;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (x) => String(x || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ');
const nameKey = (x) => String(x || '').toLowerCase().replace(/&/g, ' and ').replace(/\b(the|of|council|borough|metropolitan|city|county|district|london|royal)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const CQC_RANK = { Outstanding: 1, Good: 2, 'Requires improvement': 3, Inadequate: 4 };
const GRADE_RANK = { Outstanding: 1, Good: 2, 'Requires improvement to be good': 3, 'Requires improvement': 3, Inadequate: 4 };
const OFSTED_PAGE = '/government/statistics/local-authority-inspection-outcomes-as-at-31-march-2026';
const WASTE_PAGE = '/government/statistics/local-authority-collected-waste-management-annual-results';
const PLANNING_PAGE = '/government/statistical-data-sets/live-tables-on-planning-application-statistics';

async function get(url, kind = 'text') {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (kind === 'buf') return Buffer.from(await res.arrayBuffer());
  if (kind === 'json') return res.json();
  return res.text();
}
async function attachments(path) {
  const r = await get(`https://www.gov.uk/api/content${path}`, 'json');
  return { title: r.title, updated: r.public_updated_at, atts: ((r.details && r.details.attachments) || []).map((a) => ({ title: a.title, url: a.url })) };
}
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();
const alias = (c) => CODE_ALIASES[c] || c;
const num = (v) => { if (typeof v === 'number') return v; const s = cell(v).replace(/,/g, ''); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
function excelDate(v) {
  if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
  const s = cell(v); const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

(async () => {
  console.log(`=== Council ratings import (${WRITE ? 'WRITE' : 'DRY RUN - nothing will be written'}) ===`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase settings not found in .env.local');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: cs, error: cErr } = await db.from('councils').select('gss_code, name, short_name, type, country').limit(1000);
  if (cErr) throw new Error(`councils read: ${cErr.message}`);
  const councils = new Map((cs || []).filter((c) => c.gss_code).map((c) => [c.gss_code, c]));
  const rows = [];
  let ofstedCodes = [];
  const report = (label, list, unmatched) => {
    const t = {};
    for (const r of list) { const c = councils.get(r.council_gss_code); const k = `${c.country}/${c.type}`; t[k] = (t[k] || 0) + 1; }
    console.log(`  ${label}: ${list.length} councils -> ${Object.entries(t).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
    if (unmatched.length) console.log(`  codes not in the councils table (left out): ${unmatched.join('; ')}`);
  };

  // 1. Ofsted
  {
    console.log('\n--- 1. Ofsted children\'s services ---');
    const page = await attachments(OFSTED_PAGE);
    const att = page.atts.find((a) => /underlying data/i.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
    if (!att) throw new Error('Ofsted underlying data attachment not found');
    console.log(`  ${att.title}\n  ${att.url}`);
    const wb = XLSX.read(await get(att.url, 'buf'), { type: 'buffer' });
    const sheet = wb.SheetNames.find((s) => /^Inspections_as_at/i.test(s));
    const ws = wb.Sheets[sheet];
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: '' });
    const firstRow = XLSX.utils.decode_range(ws['!ref']).s.r;
    // The report link is a hyperlink on the cell; its text is just "Ofsted Local Authority Webpage".
    const linkOf = (rowIdx, colIdx) => {
      const c = ws[XLSX.utils.encode_cell({ r: firstRow + rowIdx, c: colIdx })];
      const t = c && c.l && (c.l.Target || c.l.target);
      return t && /^https?:/.test(t) ? t : null;
    };
    const hi = grid.findIndex((r) => r.some((c) => /^Local authority area code$/i.test(cell(c))));
    const h = grid[hi].map(cell);
    const col = (re) => h.findIndex((x) => re.test(x));
    const C = { link: col(/^Web link/i), code: col(/^Local authority area code/i), name: col(/^Local authority name/i), insp: col(/^Inspection date/i), pub: col(/^Publication date/i), overall: col(/^Overall effectiveness/i) };
    const subs = h.map((x, i) => [x, i]).filter(([x, i]) => i > C.overall && x);
    console.log(`  sheet "${sheet}", header row ${hi + 1}; sub-judgements: ${subs.map(([x]) => x).join(' | ')}`);
    const period = `as at ${(sheet.match(/as_at_(.+)$/i) || [, '31 March'])[1].replace(/_/g, ' ')} ${(att.title.match(/\d{4}/) || [''])[0]}`.trim();
    const list = [], unmatched = [], grades = {}, unknownGrades = new Set();
    let links = 0;
    for (let ri = hi + 1; ri < grid.length; ri++) {
      const r = grid[ri];
      const raw = cell(r[C.code]); if (!/^E\d{8}$/.test(raw)) continue;
      const code = alias(raw);
      if (!councils.has(code)) { unmatched.push(`${raw} ${cell(r[C.name])}`); continue; }
      const reportUrl = linkOf(ri, C.link);
      if (reportUrl) links++;
      const g = cell(r[C.overall]);
      if (g && !(g in GRADE_RANK)) unknownGrades.add(g);
      grades[g || '(none)'] = (grades[g || '(none)'] || 0) + 1;
      list.push({
        measure: 'ofsted_childrens_services', council_gss_code: code, period,
        value_num: null, value_grade: g || null, grade_rank: GRADE_RANK[g] ?? null,
        detail: { judgements: Object.fromEntries(subs.map(([x, i]) => [x, cell(r[i]) || null])), inspection_date: excelDate(r[C.insp]), report_url: reportUrl, ofsted_name: cell(r[C.name]) },
        source: 'Ofsted, Local authority inspection outcomes', source_url: `https://www.gov.uk${OFSTED_PAGE}`, published_date: excelDate(r[C.pub]),
      });
    }
    console.log(`  report links read: ${links}`);
    console.log(`  period: ${period}; grades: ${JSON.stringify(grades)}${unknownGrades.size ? `; UNKNOWN grade wording: ${[...unknownGrades].join(', ')}` : ''}`);
    report('Ofsted', list, unmatched);
    const sample = list[0]; if (sample) console.log(`  sample: ${JSON.stringify(sample).slice(0, 700)}`);
    rows.push(...list);
    ofstedCodes = list.map((r) => r.council_gss_code);
  }

  // 2. Defra recycling
  {
    console.log('\n--- 2. Household recycling rate ---');
    const page = await attachments(WASTE_PAGE);
    const att = page.atts.find((a) => /local authority data/i.test(a.title) && /\.(ods|xlsx)$/i.test(a.url));
    if (!att) throw new Error('Defra local authority data attachment not found');
    console.log(`  ${att.title}\n  ${att.url}`);
    const wb = XLSX.read(await get(att.url, 'buf'), { type: 'buffer' });
    const grid = XLSX.utils.sheet_to_json(wb.Sheets['Table_3'], { header: 1, blankrows: false, defval: '' });
    const hi = grid.findIndex((r) => r.some((c) => /^ONS code$/i.test(cell(c))));
    const h = grid[hi].map(cell);
    const C = { year: h.findIndex((x) => /^Year$/i.test(x)), code: h.findIndex((x) => /^ONS code$/i.test(x)), name: h.findIndex((x) => /^Authority$/i.test(x)), type: h.findIndex((x) => /^Authority type$/i.test(x)), rec: h.findIndex((x) => /reuse, recycling or composting/i.test(x)) };
    if (Object.values(C).some((i) => i < 0)) throw new Error(`Table_3 columns not found: ${JSON.stringify(C)}`);
    const data = grid.slice(hi + 1).filter((r) => /^E\d{8}$/.test(cell(r[C.code])));
    const latest = [...new Set(data.map((r) => cell(r[C.year])))].sort().pop();
    const list = [], unmatched = [], types = {};
    const values = [];
    let disposal = 0;
    for (const r of data.filter((x) => cell(x[C.year]) === latest)) {
      const raw = cell(r[C.code]);
      const type = cell(r[C.type]);
      // Disposal authorities (county councils and joint waste authorities) do not collect
      // household waste, so the collection-based recycling rate is not theirs.
      if (/^Disposal$/i.test(type)) { disposal++; continue; }
      const f = num(r[C.rec]);
      if (f === null) continue;
      const targets = JOINT_CODES[raw] || [alias(raw)];
      for (const code of targets) {
        if (!councils.has(code)) { unmatched.push(`${raw} ${cell(r[C.name])} (${type})`); continue; }
        const pct = Math.round(f * 1000) / 10;
        types[type] = (types[type] || 0) + 1;
        values.push(pct);
        list.push({
          measure: 'recycling_rate', council_gss_code: code, period: latest,
          value_num: pct, value_grade: null, grade_rank: null,
          detail: { authority_type: type, defra_name: cell(r[C.name]), joint_figure: JOINT_CODES[raw] ? `${cell(r[C.name])} (shared service)` : null },
          source: 'Defra, Local authority collected waste management annual results (Table 3)', source_url: `https://www.gov.uk${WASTE_PAGE}`, published_date: page.updated ? page.updated.slice(0, 10) : null,
        });
      }
    }
    console.log(`  disposal authorities left out: ${disposal}`);
    values.sort((a, b) => a - b);
    console.log(`  latest year ${latest}; authority types: ${JSON.stringify(types)}; recycling % min ${values[0]}, median ${values[Math.floor(values.length / 2)]}, max ${values[values.length - 1]}`);
    report('Recycling', list, unmatched);
    const top = [...list].sort((a, b) => b.value_num - a.value_num);
    console.log(`  highest: ${top.slice(0, 5).map((r) => `${r.detail.defra_name} ${r.value_num}%`).join('; ')}`);
    console.log(`  lowest: ${top.slice(-5).map((r) => `${r.detail.defra_name} ${r.value_num}%`).join('; ')}`);
    rows.push(...list);
  }

  // 3. Planning
  {
    console.log('\n--- 3. Planning decision speed ---');
    const page = await attachments(PLANNING_PAGE);
    for (const [file, sheet, measure, label] of [['Table_P151.ods', 'Table_P151a', 'planning_major_speed', 'major'], ['Table_P153.ods', 'Table_P153', 'planning_nonmajor_speed', 'non-major']]) {
      const att = page.atts.find((a) => a.url.endsWith(file));
      if (!att) throw new Error(`${file} not found`);
      const grid = XLSX.utils.sheet_to_json(XLSX.read(await get(att.url, 'buf'), { type: 'buffer' }).Sheets[sheet], { header: 1, blankrows: false, defval: '' });
      const gi = grid.findIndex((r) => r.some((c) => /^24 months to end of/i.test(cell(c))));
      const hdr = grid[gi + 1].map(cell);
      // Four published % columns, in order: 12 months without penalty, 12 months with
      // penalty, 24 months without penalty, 24 months with penalty.
      const pcts = hdr.map((x, k) => [x, k]).filter(([x]) => /^% within/i.test(x));
      if (pcts.length !== 4 || !/without penalty/i.test(pcts[0][0]) || !/with penalty/i.test(pcts[1][0]) || !/without penalty/i.test(pcts[2][0]) || !/with penalty/i.test(pcts[3][0])) {
        throw new Error(`${sheet}: expected four % columns (12m without/with penalty, 24m without/with penalty), found ${pcts.map(([x, k]) => `${k}:${x}`).join(' | ')}`);
      }
      const [[, c12no], [, c12pen], [, c24no], [, c24pen]] = pcts;
      // The 24-month counts start at the nearest "decisions" total column before its % columns.
      const totalCol = (before) => { for (let k = before - 1; k >= 0; k--) if (/^(Major decisions|Total non-major development decisions)$/i.test(hdr[k])) return k; return -1; };
      const t24 = totalCol(c24no);
      const period = cell(grid[gi][grid[gi].findIndex((c) => /^24 months to end of/i.test(cell(c)))]).replace(/\s*P$/, '').replace(/^24 months to end of /i, '24 months to ');
      console.log(`  ${sheet}: using ${c24pen}:"${hdr[c24pen]}" (24 months); also stored ${c24no} (24m without penalty), ${c12pen} and ${c12no} (12 months); 24-month counts from column ${t24}`);
      const list = [], unmatched = [], diffs = [];
      for (const r of grid.slice(gi + 2)) {
        const raw = cell(r[1]); if (!/^E\d{8}$/.test(raw)) continue;
        const code = alias(raw);
        if (!councils.has(code)) { if (!/^E(12|92|26|51)/.test(raw)) unmatched.push(`${raw} ${cell(r[0])}`); continue; }
        const published = num(r[c24pen]);
        if (published === null) continue;
        const total = t24 >= 0 ? num(r[t24]) : null, onTime = t24 >= 0 ? num(r[t24 + 1]) : null, ext = t24 >= 0 ? num(r[t24 + 2]) : null, extOnTime = t24 >= 0 ? num(r[t24 + 3]) : null, imputed = t24 >= 0 ? num(r[t24 + 4]) : null;
        const ours = total ? Math.round((((onTime || 0) + (extOnTime || 0)) / total) * 1000) / 10 : null;
        const noPenalty = num(r[c24no]);
        if (ours !== null && noPenalty !== null && Math.abs(noPenalty - ours) > 0.15) diffs.push(`${cell(r[0])}: our check ${ours}, published without penalty ${noPenalty}`);
        list.push({
          measure, council_gss_code: code, period,
          value_num: published, value_grade: null, grade_rank: null,
          detail: { pct_24_months_with_penalty: published, pct_24_months_without_penalty: noPenalty, pct_12_months_with_penalty: num(r[c12pen]), pct_12_months_without_penalty: num(r[c12no]), decisions_24_months: total, within_statutory_period: onTime, extension_decisions: ext, extension_within_time: extOnTime, imputed_quarters: imputed || 0, our_check: ours, mhclg_name: cell(r[0]) },
          source: `MHCLG, Live tables on planning application statistics (${sheet})`, source_url: `https://www.gov.uk${PLANNING_PAGE}`, published_date: page.updated ? page.updated.slice(0, 10) : null,
        });
      }
      const pctCols = [c12no, c12pen, c24no, c24pen], iPen = c24pen;
      console.log(`  ${label}: period ${period}; published % columns ${pctCols.join(', ')}${iPen >= 0 ? `, penalty column ${iPen}` : ''}; councils where our check differs from the published 24-month % without penalty: ${diffs.length}`);
      for (const d of diffs.slice(0, 15)) console.log(`    ${d}`);
      const v = list.map((r) => r.value_num).sort((a, b) => a - b);
      console.log(`  ${label}: % on time min ${v[0]}, median ${v[Math.floor(v.length / 2)]}, max ${v[v.length - 1]}; councils with imputed quarters ${list.filter((r) => r.detail.imputed_quarters).length}`);
      report(`Planning (${label})`, list, unmatched);
      rows.push(...list);
    }
  }

  // 4. CQC adult social care
  {
    console.log('\n--- 4. CQC adult social care (council assessment pages) ---');
    let cache = {};
    try { cache = JSON.parse(fs.readFileSync(CQC_CACHE, 'utf8')); } catch { cache = {}; }
    const saveCache = () => { fs.mkdirSync(path.dirname(CQC_CACHE), { recursive: true }); fs.writeFileSync(CQC_CACHE, JSON.stringify(cache, null, 1)); };
    console.log(`  saved results already held: ${Object.keys(cache).length}`);
    const notFound = [];
    let blocked = 0, read = 0;
    if (!WITH_CQC) console.log('  CQC pages not read this run (add --with-cqc to read pages not already saved).');
    for (const code of ofstedCodes) {
      if (!WITH_CQC) break;
      if (cache[code] && cache[code].status === 'found') continue;
      const c = councils.get(code);
      const names = [...new Set([c.short_name, c.name, c.name.replace(/\b(Metropolitan Borough|Borough|City|County|District|Royal Borough of|London Borough of)\b/gi, ' '), c.name.replace(/\s*(Metropolitan Borough|Borough|City|County|District)?\s*Council$/i, '')].filter(Boolean))];
      const candidates = [...new Set(names.flatMap((n) => { const b = slug(n).replace(/-council$/, ''); return [`${b}-council`, b]; }))];
      let hit = null;
      for (const cand of candidates) {
        const res = await fetch(CQC_BASE + cand, { headers: UA, redirect: 'follow' });
        await pause(PAUSE_MS);
        if (res.status === 403 || res.status === 429) { blocked++; break; }
        const html = res.ok ? await res.text() : '';
        if (res.ok && /Latest assessment published/i.test(html)) { hit = { cand, html, url: res.url }; break; }
      }
      read++;
      if (blocked) { console.log(`  CQC refused requests (HTTP 403/429) at ${c.name}; stopped reading CQC pages. Saved results are kept.`); break; }
      if (!hit) { cache[code] = { status: 'not found', tried: candidates, checked: new Date().toISOString() }; saveCache(); notFound.push(c.name); continue; }
      const t = plain(hit.html);
      const at = t.search(/Latest assessment published/i);
      const pubTxt = (t.match(/Latest assessment published:\s*([0-9]{1,2} [A-Za-z]+ [0-9]{4})/) || [])[1] || null;
      const grade = (t.slice(at, at + 400).match(/\b(Outstanding|Good|Requires improvement|Inadequate)\b/) || [])[1] || null;
      const scores = {};
      for (const m of t.slice(at).matchAll(/(Assessing needs|Supporting people to lead healthier lives|Equity in experience and outcomes|Care provision, integration and continuity|Partnerships and communities|Safe pathways, systems and transitions|Safeguarding|Governance, management and sustainability|Learning, improvement and innovation)\s+Score:\s*([1-4])/g)) if (!(m[1] in scores)) scores[m[1]] = Number(m[2]);
      cache[code] = { status: 'found', grade, published: pubTxt ? new Date(`${pubTxt} UTC`).toISOString().slice(0, 10) : null, scores, url: hit.url, page: hit.cand, checked: new Date().toISOString() };
      saveCache();
    }
    const list = [], grades = {};
    for (const code of ofstedCodes) {
      const e = cache[code];
      if (!e || e.status !== 'found') continue;
      grades[e.grade || '(none)'] = (grades[e.grade || '(none)'] || 0) + 1;
      list.push({
        measure: 'cqc_adult_social_care', council_gss_code: code, period: 'latest assessment',
        value_num: null, value_grade: e.grade, grade_rank: e.grade ? CQC_RANK[e.grade] : null,
        detail: { quality_statement_scores: e.scores, report_url: e.url, cqc_page: e.page, credit: 'Contains CQC information, licensed under the Open Government Licence.' },
        source: 'Care Quality Commission, local authority assessment', source_url: e.url, published_date: e.published,
      });
    }
    console.log(`  pages read this run: ${read}; not found this run: ${notFound.length}${notFound.length ? ` (${notFound.join(', ')})` : ''}`);
    console.log(`  councils with a saved CQC grade: ${list.length} of ${ofstedCodes.length}; grades: ${JSON.stringify(grades)}`);
    const missing = ofstedCodes.filter((c) => !cache[c] || cache[c].status !== 'found').map((c) => councils.get(c).name);
    console.log(`  still without a CQC grade (${missing.length}): ${missing.join(', ')}`);
    if (list.length) report('CQC', list, []);
    rows.push(...list);
  }

  console.log(`\nTotal rows: ${rows.length}`);
  if (!WRITE) { console.log('DRY RUN complete. Nothing was written.'); return; }

  console.log('\n--- Writing ---');
  const runStart = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('council_ratings').upsert(rows.slice(i, i + 500).map((r) => ({ ...r, synced_at: new Date().toISOString() })), { onConflict: 'measure,council_gss_code,period' });
    if (error) throw new Error(`council_ratings upsert at ${i}: ${error.message}`);
  }
  console.log(`  council_ratings: ${rows.length} rows saved`);
  for (const m of [...new Set(rows.map((r) => r.measure))]) {
    const periods = [...new Set(rows.filter((r) => r.measure === m).map((r) => r.period))];
    const { error, count } = await db.from('council_ratings').delete({ count: 'exact' }).eq('measure', m).in('period', periods).lt('synced_at', runStart);
    if (error) throw new Error(`stale delete ${m}: ${error.message}`);
    console.log(`  ${m}: ${count || 0} rows no longer in the source removed`);
  }
  // Rebuild the site's cached council league data and council pages now (they keep for a week), and record the result.
  const site = require('./lib/refresh-site');
  await site.recordRefresh('import-council-ratings', { changed: rows.length, ...(await site.refreshCouncilPages()) });
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
