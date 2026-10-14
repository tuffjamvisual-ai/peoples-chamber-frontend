#!/usr/bin/env node
// Imports the Registrar of Consultant Lobbyists (ORCL) quarterly returns: which lobbying
// firm acted for which client in each quarter. Clients are matched to the lobbying index
// (lobby_orgs) through the reviewed spellings in lobby_org_aliases.
//
// DRY RUN BY DEFAULT: downloads and checks every file, prints the report, writes NOTHING
// to the database. Pass --write to save, only after the dry-run report has been approved.
// Also writes data/lobbying/orcl-unmatched-clients.csv (kept out of Git) for the hand review.
//
// Two ways to get the files:
//   --from=data/orcl   (normal) reads the files saved in that folder, listed in its
//                      manifest.csv (file,source_url,source_page,link_text,page_title). The
//                      Registrar's site refuses automated downloads (HTTP 403), so the files
//                      are downloaded by hand from the browser and saved there.
//   no --from          finds the quarters on the Registrar's "Quarterly Return Reports" list
//                      and downloads them (only if the Registrar allows automated access).
// Each file must have the columns "Registered organisation name" and "Client name", or
// the run stops.
//
// The table is rebuilt in full on --write. Safety: the write is refused if any file fails
// to download or read, or if a quarter already saved would shrink by more than 20%.
//
// Source: registrarofconsultantlobbyists.org.uk. Open Government Licence v3.0.
//
// Usage:
//   node scripts/import-orcl-returns.js --from=data/orcl > orcl-dryrun.txt 2>&1
//   node scripts/import-orcl-returns.js --from=data/orcl --write > orcl-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { normaliseName, stripBrackets } = require('./lib/lobby-names');

const WRITE = process.argv.includes('--write');
const FROM = (process.argv.find((a) => a.startsWith('--from=')) || '').slice(7) || null;
const SITE = 'https://registrarofconsultantlobbyists.org.uk';
const LIST = `${SITE}/category/quarterly-return-reports-2/`;
const UA = { 'User-Agent': 'opengovt-import/1.0 (+https://opengovt.uk)' };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '-').replace(/&#8217;|&rsquo;/g, "'").replace(/&nbsp;|&#160;/g, ' ').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();

async function get(url, binary) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await sleep(500); // gentle on a small site
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let href;
    try { href = new URL(m[1].replace(/&amp;/g, '&'), base).href; } catch { continue; }
    out.push({ href, text: decode(m[2]) });
  }
  return out;
}

async function readAll(table, cols, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(cols);
    for (const c of order) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// The quarter a file covers, from (in order) its title row, sheet name, link text and page
// title. The month comes from the first of these that names one; the year from the first
// four-digit year among them. File names are not used: they carry the publication date.
function quarterOf(candidates) {
  let month = null;
  for (const c of candidates) { const m = String(c || '').match(MONTH_RE); if (m) { month = MONTHS.findIndex((x) => x.startsWith(m[1].toLowerCase())); break; } }
  let year = null;
  for (const c of candidates) { const y = String(c || '').match(/\b(20\d\d)\b/); if (y) { year = Number(y[1]); break; } }
  if (month == null || month < 0 || year == null) return null;
  if (month % 3 !== 0) return null; // must be the first month of a quarter
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  return { start: `${year}-${String(month + 1).padStart(2, '0')}-01`, label: `${cap(MONTHS[month])} to ${cap(MONTHS[month + 2])} ${year}` };
}

// Minimal CSV reader for the manifest: quoted fields, doubled quotes.
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
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

// Files listed in <dir>/manifest.csv, read from that folder.
function filesFromFolder(dir) {
  const mf = path.join(dir, 'manifest.csv');
  if (!fs.existsSync(mf)) fail(`${mf} not found`);
  const files = new Map();
  for (const r of parseCsv(fs.readFileSync(mf, 'utf8'))) {
    if (!r.file || !r.source_url) fail(`manifest row without file or source_url: ${JSON.stringify(r)}`);
    files.set(r.source_url, { url: r.source_url, local: path.join(dir, r.file), linkText: r.link_text || '', page: r.source_page || '', pageTitle: r.page_title || '' });
  }
  console.log(`files listed in ${mf}: ${files.size}`);
  return files;
}

async function filesFromWeb() {
  const pages = new Map();
  const listQueue = [LIST];
  const seenLists = new Set();
  while (listQueue.length) {
    const url = listQueue.shift();
    if (seenLists.has(url) || seenLists.size > 20) continue;
    seenLists.add(url);
    const html = await get(url);
    for (const l of links(html, url)) {
      const u = new URL(l.href);
      if (u.origin !== SITE) continue;
      if (/\/category\/quarterly-return-reports-2\/page\/\d+\/?$/.test(u.pathname)) { listQueue.push(u.href); continue; }
      const segs = u.pathname.split('/').filter(Boolean);
      if (segs.length === 1 && /quarter/i.test(segs[0]) && !pages.has(u.href)) pages.set(u.href, null);
    }
  }
  console.log(`Registrar quarter pages found: ${pages.size} (from ${seenLists.size} list page${seenLists.size === 1 ? '' : 's'})`);
  if (!pages.size) fail('no quarter pages found on the Registrar list page');

  const files = new Map(); // file url -> { url, linkText, page, pageTitle }
  for (const page of pages.keys()) {
    const html = await get(page);
    const t = html.match(/<title>([\s\S]*?)<\/title>/i);
    const pageTitle = t ? decode(t[1]).replace(/\s*[-–]\s*ORCL\s*$/i, '') : '';
    for (const l of links(html, page)) {
      if (!/\/wp-content\/uploads\/.+\.(csv|xlsx|xls)$/i.test(l.href)) continue;
      const f = files.get(l.href);
      if (!f) files.set(l.href, { url: l.href, linkText: l.text, page, pageTitle });
      else if (/^download$/i.test(f.linkText) && !/^download$/i.test(l.text)) f.linkText = l.text;
    }
  }
  console.log(`data files found: ${files.size}`);
  return files;
}

(async () => {
  // ── 1. The files ───────────────────────────────────────────────────────────
  const files = FROM ? filesFromFolder(FROM) : await filesFromWeb();
  if (!files.size) fail('no data files');

  // ── 2. Read each file ──────────────────────────────────────────────────────
  const problems = [];
  const quarters = new Map(); // start -> { label, file, rows: [] }
  for (const f of files.values()) {
    const name = decodeURIComponent(f.url.split('/').pop());
    let wb;
    try {
      if (f.local && !fs.existsSync(f.local)) throw new Error(`not saved in the folder yet (${f.local})`);
      const buf = f.local ? fs.readFileSync(f.local) : await get(f.url, true);
      wb = /\.csv$/i.test(f.url) ? XLSX.read(buf.toString('utf8'), { type: 'string', raw: true }) : XLSX.read(buf, { type: 'buffer' });
    } catch (e) { problems.push(`${name}: could not read (${e.message})`); continue; }
    const withHeader = [];
    for (const sn of wb.SheetNames) {
      const grid = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false });
      const h = grid.findIndex((r) => r.some((c) => /^\s*registered organisation name\s*$/i.test(c)) && r.some((c) => /^\s*client name\s*$/i.test(c)));
      if (h >= 0) withHeader.push({ sn, grid, h });
    }
    if (withHeader.length !== 1) { problems.push(`${name}: ${withHeader.length} sheets with the "Registered organisation name" and "Client name" columns (expected 1)`); continue; }
    const { sn, grid, h } = withHeader[0];
    const firmCol = grid[h].findIndex((c) => /registered organisation name/i.test(c));
    const clientCol = grid[h].findIndex((c) => /client name/i.test(c));
    const titleRow = grid.slice(0, h).map((r) => r.join(' ')).join(' ');
    const q = quarterOf([titleRow, sn, f.linkText, f.pageTitle]);
    if (!q) { problems.push(`${name}: cannot tell which quarter it covers (title "${titleRow}", sheet "${sn}", link "${f.linkText}", page "${f.pageTitle}")`); continue; }
    if (quarters.has(q.start)) { problems.push(`${name}: quarter ${q.label} already read from ${quarters.get(q.start).name}`); continue; }

    const rows = [];
    let lastFirm = '', carried = 0, noClient = 0;
    for (const r of grid.slice(h + 1)) {
      let firm = String(r[firmCol] || '').trim();
      const client = String(r[clientCol] || '').trim();
      if (!firm && !client) continue;
      if (!firm) { firm = lastFirm; carried++; }
      lastFirm = firm;
      if (!client) { noClient++; continue; }
      rows.push({ firm, client });
    }
    quarters.set(q.start, { ...q, name, url: f.url, page: f.page, rows, carried, noClient });
  }
  if (problems.length) { console.log('\nPROBLEMS (nothing written):'); for (const p of problems) console.log(`  ${p}`); }

  // ── 3. Match clients to the lobbying index ─────────────────────────────────
  const [aliases, excluded] = await Promise.all([
    readAll('lobby_org_aliases', 'alias_norm, org_id', ['alias_norm']),
    readAll('lobby_excluded_names', 'norm_name', ['norm_name']),
  ]);
  const aliasMap = new Map(aliases.map((a) => [a.alias_norm, a.org_id]));
  const excludedSet = new Set(excluded.map((e) => e.norm_name));

  const out = [];
  const sorted = [...quarters.values()].sort((a, b) => a.start.localeCompare(b.start));
  console.log('\nquarter               file rows  saved  firms  clients matched  (firm carried down / no client / duplicates)');
  for (const q of sorted) {
    const seen = new Set();
    let dupes = 0, matched = 0;
    const firms = new Set();
    for (const r of q.rows) {
      const firm_norm = normaliseName(r.firm);
      const client_norm = normaliseName(r.client);
      if (!firm_norm || !client_norm) continue;
      const k = `${firm_norm}|${client_norm}`;
      if (seen.has(k)) { dupes++; continue; }
      seen.add(k);
      firms.add(firm_norm);
      let orgId = aliasMap.get(client_norm);
      if (orgId == null && !excludedSet.has(client_norm) && /[([]/.test(r.client)) {
        const short = normaliseName(stripBrackets(r.client));
        if (short && aliasMap.has(short)) orgId = aliasMap.get(short);
      }
      const match_type = excludedSet.has(client_norm) ? 'excluded' : orgId != null ? 'alias' : 'unmatched';
      if (match_type === 'alias') matched++;
      out.push({
        quarter_start: q.start, quarter_label: q.label,
        firm_name: r.firm.slice(0, 500), firm_norm, client_name: r.client.slice(0, 500), client_norm,
        client_org_id: match_type === 'alias' ? orgId : null, match_type,
        source_url: q.url, source_page: q.page,
      });
    }
    q.saved = seen.size;
    console.log(`${q.label.padEnd(22)}${String(q.rows.length).padStart(9)}${String(seen.size).padStart(7)}${String(firms.size).padStart(7)}${String(new Set(out.filter((x) => x.quarter_start === q.start).map((x) => x.client_norm)).size).padStart(9)}${String(matched).padStart(8)}   (${q.carried} / ${q.noClient} / ${dupes})`);
  }
  const matchedAll = out.filter((x) => x.match_type === 'alias').length;
  console.log(`\ntotal rows: ${out.length}; clients matched to the lobbying index: ${matchedAll} (${out.length ? Math.round((100 * matchedAll) / out.length) : 0}%)`);

  // Most-used lobbying firms in the latest quarter, and clients most often represented.
  const latest = sorted[sorted.length - 1];
  if (latest) {
    const byFirm = new Map();
    for (const x of out.filter((y) => y.quarter_start === latest.start)) byFirm.set(x.firm_name, (byFirm.get(x.firm_name) || 0) + 1);
    console.log(`\nfirms with the most clients, ${latest.label}:`);
    for (const [f, n] of [...byFirm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${String(n).padStart(4)}  ${f}`);
  }
  const clientCount = new Map();
  for (const x of out) {
    if (x.match_type !== 'unmatched') continue;
    const c = clientCount.get(x.client_norm) || { n: 0, example: x.client_name, quarters: new Set() };
    c.n++; c.quarters.add(x.quarter_start);
    clientCount.set(x.client_norm, c);
  }
  const unmatched = [...clientCount.entries()].sort((a, b) => b[1].n - a[1].n);
  console.log(`\nunmatched clients: ${unmatched.length} distinct. Most frequent (rows, quarters):`);
  for (const [n, c] of unmatched.slice(0, 20)) console.log(`  ${String(c.n).padStart(4)} ${String(c.quarters.size).padStart(2)}  ${c.example}`);
  const outDir = path.join(process.cwd(), 'data', 'lobbying');
  fs.mkdirSync(outDir, { recursive: true });
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  fs.writeFileSync(path.join(outDir, 'orcl-unmatched-clients.csv'), ['norm_name,rows,quarters,example'].concat(unmatched.map(([n, c]) => [n, c.n, c.quarters.size, c.example].map(esc).join(','))).join('\n') + '\n');
  console.log('(full list in data/lobbying/orcl-unmatched-clients.csv)');

  if (!WRITE) { console.log(`\nDRY RUN complete. Nothing was written.${problems.length ? ' Fix the PROBLEMS above before --write.' : ''}`); return; }
  if (problems.length) fail('there were PROBLEMS reading the files; nothing written');

  // ── 4. Write (full rebuild) ────────────────────────────────────────────────
  const existing = await readAll('orcl_client_returns', 'quarter_start', ['quarter_start', 'id']);
  const before = new Map();
  for (const e of existing) before.set(e.quarter_start, (before.get(e.quarter_start) || 0) + 1);
  for (const [start, n] of before) {
    const q = quarters.get(start);
    const now = q ? q.saved : 0;
    if (now < n * 0.8) fail(`quarter ${start} would shrink from ${n} to ${now} rows; nothing written`);
  }
  console.log('\n--- Writing ---');
  const runStart = new Date().toISOString();
  const rows = out.map((x) => ({ ...x, built_at: runStart }));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from('orcl_client_returns').upsert(rows.slice(i, i + 1000), { onConflict: 'quarter_start,firm_norm,client_norm' });
    if (error) throw new Error(`orcl_client_returns upsert: ${error.message}`);
  }
  const { error: d, count } = await db.from('orcl_client_returns').delete({ count: 'exact' }).lt('built_at', runStart);
  if (d) throw new Error(`stale delete: ${d.message}`);
  console.log(`  orcl_client_returns: ${rows.length} saved; ${count || 0} no longer published removed`);
  const { data: rv, error: rErr } = await db.rpc('refresh_lobbying_views');
  if (rErr) throw new Error(`refresh_lobbying_views: ${rErr.message}`);
  console.log(`  /lobbying figures refreshed: ${JSON.stringify(rv)}`);
  console.log('\nWRITE complete.');
})().catch((e) => fail(e.message));
