#!/usr/bin/env node
// Import Scottish Water storm overflow data into public.sewage_overflows
// (source 'SW'; migration scripts/migrations/2026-10-13a-sewage-scotland.sql),
// then rebuild public.sewage_area_totals from every source.
//
// DRY RUN BY DEFAULT: reads, places and totals everything, prints a report and
// writes NOTHING (it reads the councils table to check codes). Pass --write to
// save, only after the dry-run report has been approved.
//
// SOURCE FILES (downloaded by hand from Scottish Water's Document Hub page
// "Improving Urban Waters"; Scottish Water refuses automated downloads) in
// data/sewage-scotland/ (not committed):
//   * Reported Overflow Event Data to SEPA 2021-2025 & Summary (v2, 05/08/26):
//     overflows with annual reporting to SEPA; events, duration and volume.
//   * Non-Reported Overflow Event Data 2022-2025 & Summary (31/08/26): overflows
//     with event monitoring that is not reported to SEPA annually.
// Both: "licensed under the terms of the Open Government Licence" (METADATA sheet).
//
// RULES
//   * Key: Scottish Water's "SW Unique Measurement Point Description" (unique in
//     each file; the files do not overlap). Asset IDs repeat, so are not a key.
//   * "No Events" = monitored, no spills -> 0. "No Data" and "Not Required" -> null.
//   * Durations are Excel day fractions ([h]:mm:ss) -> hours.
//   * 2025: a row for every overflow. Earlier years: only where the year has
//     figures (a number or "No Events"), so overflows added later are not counted
//     in years before they existed.
//   * monitoring_pct = No. of Days Data / days in the year (only given for 2023+).
//   * Placed in constituency and council from the X/Y coordinates (British
//     National Grid) with the same ONS boundaries and rules as England
//     (scripts/lib/sewage-geo.js); Scottish Water's own council name is used as
//     a cross-check and every disagreement is listed.
//   * Counting: Scottish Water counts each discrete overflow event. From 2025
//     most non-reported overflows publish every event; others (and most earlier
//     years) publish only events over 15 minutes 30 seconds. The report prints
//     the split; the site ranks on 2025 and shows Scotland in its own tables.
//
// Usage:
//   node scripts/import-sewage-scotland.js > sewage-scotland-dryrun.txt 2>&1
//   node scripts/import-sewage-scotland.js --write > sewage-scotland-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { PCON, LAD, enToLatLon, loadBoundaries, inside, nearest, bfeQuery } = require('./lib/sewage-geo');

const WRITE = process.argv.includes('--write');
const DIR = path.join(__dirname, '..', 'data', 'sewage-scotland');
const FILES = [
  { kind: 'reported', name: 'sw-reported-overflow-event-data-to-sepa-20212025--summary--v2-050826.xlsx', years: [2021, 2022, 2023, 2024, 2025] },
  { kind: 'non-reported', name: 'scottish-water-non-reported-overflow-event-data-2022-2025-and-summary--310826.xlsx', years: [2022, 2023, 2024, 2025] },
];
const PAGE = 'https://www.scottishwater.co.uk/Help-and-Resources/Document-Hub/Key-Publications/Urban-Waters-Improvements';
const LATEST = 2025;
const NEAREST_LIMIT_M = 15000;

const norm = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const clean = (v) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s || null; };
const textSeen = new Map();
const seen = (k) => textSeen.set(k, (textSeen.get(k) || 0) + 1);

// Events: number -> integer; "No Events" -> 0; "No Data"/"Not Required"/blank -> null.
function events(v) {
  if (typeof v === 'number') return Math.round(v);
  const s = String(v ?? '').trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (/^no events/i.test(s)) return 0;
  if (s) seen(`events "${s}"`);
  return null;
}
// Duration: Excel day fraction or "[h]:mm:ss" -> hours; "No Events" -> 0.
function hours(v) {
  if (typeof v === 'number') return Math.round(v * 24 * 100) / 100;
  const s = String(v ?? '').trim();
  const m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/);
  if (m) return Math.round((Number(m[1]) + Number(m[2]) / 60 + Number(m[3] || 0) / 3600) * 100) / 100;
  if (/^no events/i.test(s)) return 0;
  if (s) seen(`duration "${s}"`);
  return null;
}
function volume(v) {
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  const s = String(v ?? '').trim().replace(/,/g, '');
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^no events/i.test(s)) return 0;
  if (s) seen(`volume "${s}"`);
  return null;
}
const daysIn = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);

function readSummary(file) {
  const wb = XLSX.read(fs.readFileSync(path.join(DIR, file.name)), { type: 'buffer' });
  const sheet = wb.SheetNames.find((n) => /^Overflow Summary/i.test(n));
  if (!sheet) throw new Error(`${file.name}: no "Overflow Summary" sheet`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' });
  const hi = rows.findIndex((r) => r.some((c) => /^Asset ID$/i.test(String(c).trim())));
  if (hi < 1) throw new Error(`${file.name}: header row not found`);
  const H = rows[hi].map((c) => String(c).replace(/\s+/g, ' ').trim());
  let g = '';
  const G = rows[hi - 1].map((c) => (g = String(c).replace(/\s+/g, ' ').trim() || g));
  const col = (re, label) => { const i = H.findIndex((h) => re.test(h)); if (i < 0) throw new Error(`${file.name}: column "${label}" not found`); return i; };
  const yearCol = (group, y) => H.findIndex((h, i) => h === String(y) && group.test(G[i]));
  const C = {
    permit: col(/^Permit Number$/i, 'Permit Number'), asset: col(/^Asset ID$/i, 'Asset ID'), assetName: col(/^Asset Name$/i, 'Asset Name'),
    ump: col(/^SW Unique Measurement Point Description$/i, 'SW Unique Measurement Point Description'),
    where: col(/^Network or WWTW$/i, 'Network or WWTW'), type: col(/^Type of Overflow/i, 'Type of Overflow'),
    la: col(/^Local Authority Area$/i, 'Local Authority Area'), x: col(/^X Co-ordinate$/i, 'X Co-ordinate'), y: col(/^Y Co-ordinate$/i, 'Y Co-ordinate'),
    water: col(/^Discharge Receiving Water$/i, 'Discharge Receiving Water'),
    allEvents: H.findIndex((h) => /^All Events Published/i.test(h)),
  };
  const Y = {};
  for (const y of file.years) {
    Y[y] = { days: yearCol(/Days Data/i, y), events: yearCol(/Number of Overflow Events/i, y), dur: yearCol(/Duration of Overflow Events/i, y), vol: yearCol(/Volume/i, y) };
    if (Y[y].events < 0 || Y[y].dur < 0) throw new Error(`${file.name}: ${y} event/duration columns not found`);
  }
  const data = rows.slice(hi + 1).filter((r) => String(r[C.ump]).trim());
  return { data, C, Y, sheet };
}

// Events sheet check for one year: number of events and total hours per file.
function eventsSheetTotals(file, year) {
  const wb = XLSX.read(fs.readFileSync(path.join(DIR, file.name)), { type: 'buffer' });
  const sheet = wb.SheetNames.find((n) => n === `Overflow Events in ${year}`);
  if (!sheet) return null;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: '' });
  const hi = rows.findIndex((r) => r.some((c) => /^Asset ID$/i.test(String(c).trim())));
  const H = rows[hi].map((c) => String(c).replace(/\s+/g, ' ').trim());
  const iDur = H.findIndex((h) => /^Duration of Overflow Event/i.test(h));
  let n = 0, h = 0;
  for (const r of rows.slice(hi + 1)) if (typeof r[iDur] === 'number') { n++; h += r[iDur] * 24; }
  return { events: n, hours: Math.round(h) };
}

(async () => {
  console.log(`=== Scottish Water storm overflow import (${WRITE ? 'WRITE' : 'DRY RUN - nothing will be written'}) ===`);
  const runStart = new Date().toISOString();

  console.log('\n--- 1. Files ---');
  const out = [];
  const allPublished = new Map();
  const umps = new Set();
  for (const file of FILES) {
    const p = path.join(DIR, file.name);
    if (!fs.existsSync(p)) throw new Error(`missing ${p} (download it from ${PAGE})`);
    const { data, C, Y, sheet } = readSummary(file);
    console.log(`  ${file.kind}: "${sheet}", ${data.length} overflows, years ${file.years.join(', ')}`);
    let dup = 0;
    for (const r of data) {
      const ump = clean(r[C.ump]);
      if (umps.has(ump)) { dup++; continue; }
      umps.add(ump);
      if (C.allEvents >= 0) { const k = clean(r[C.allEvents]) || '(blank)'; allPublished.set(`${file.kind}: ${k}`, (allPublished.get(`${file.kind}: ${k}`) || 0) + 1); }
      const x = Number(r[C.x]), y = Number(r[C.y]);
      const ok = Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0;
      const ll = ok ? enToLatLon(x, y) : [null, null];
      for (const yr of file.years) {
        const c = Y[yr];
        const ev = events(r[c.events]);
        const hr = hours(r[c.dur]);
        if (yr !== LATEST && ev === null && hr === null) continue;
        const days = c.days >= 0 && typeof r[c.days] === 'number' ? r[c.days] : null;
        out.push({
          source: 'SW', site_id: ump, year: yr, company: 'Scottish Water',
          site_name: ump.replace(/\s+Event$/i, ''), site_name_operator: clean(r[C.assetName]),
          permit_ref: clean(r[C.permit]), asset_type: [clean(r[C.type]), clean(r[C.where])].filter(Boolean).join(', ') || null,
          receiving_water: clean(r[C.water]), ngr: null,
          easting: ok ? Math.round(x) : null, northing: ok ? Math.round(y) : null, latitude: ll[0], longitude: ll[1],
          constituency_gss_code: null, constituency_name: null, council_gss_code: null, council_name: null,
          placement: 'unplaced', placement_distance_m: null,
          spill_count: ev, spill_hours: hr, volume_m3: c.vol >= 0 ? volume(r[c.vol]) : null,
          monitoring_pct: days === null ? null : Math.round((days / daysIn(yr)) * 1000) / 10,
          source_url: PAGE, _la: clean(r[C.la]), _asset: clean(r[C.asset]),
        });
      }
    }
    console.log(`    duplicate measurement points skipped: ${dup}`);
  }
  console.log(`  overflows: ${umps.size}; overflow-year rows: ${out.length}`);
  console.log(`  text values kept as blank: ${[...textSeen].map(([k, v]) => `${k} x${v}`).join('; ') || 'none'}`);
  console.log(`  "All Events Published?" (counting method): ${[...allPublished].map(([k, v]) => `${k} x${v}`).join('; ')}`);

  console.log('\n--- 2. Placing overflows (ONS boundaries) ---');
  const pconFeats = await loadBoundaries(PCON, 'constituencies');
  const ladFeats = await loadBoundaries(LAD, 'councils');
  const place = async (x, y, feats, layer) => {
    const hit = feats.find((f) => inside(f, x, y));
    if (hit) return { code: hit.code, name: hit.name, how: 'inside' };
    try { const b = await bfeQuery(layer, x, y); if (b) return { code: b.code, name: b.name, how: 'tidal' }; } catch (e) { console.log(`    extent-of-the-realm query failed (${e.message})`); }
    const nb = nearest(feats, x, y, NEAREST_LIMIT_M);
    if (nb) return { code: nb.feat.code, name: nb.feat.name, how: 'nearest', dist: Math.round(nb.dist) };
    return null;
  };
  const rank = { inside: 0, tidal: 1, nearest: 2 };
  const byUmp = new Map();
  const counts = { inside: 0, tidal: 0, nearest: 0, unplaced: 0 };
  const mismatches = [], unplaced = [], far = [];
  for (const o of out) {
    if (!byUmp.has(o.site_id)) {
      let res = null;
      if (o.easting !== null) {
        const p = await place(o.easting, o.northing, pconFeats, PCON);
        const l = await place(o.easting, o.northing, ladFeats, LAD);
        if (p && l) {
          const worst = rank[p.how] >= rank[l.how] ? p : l;
          res = { p, l, how: worst.how, dist: worst.how === 'nearest' ? Math.max(p.dist || 0, l.dist || 0) : null };
        }
      }
      byUmp.set(o.site_id, res);
      if (!res) { counts.unplaced++; unplaced.push(`${o.site_id} | ${o._asset} | X ${o.easting} Y ${o.northing} | SW council ${o._la}`); }
      else {
        counts[res.how]++;
        if (res.how === 'nearest' && res.dist > 2000) far.push(`${o.site_id} | ${res.dist} m | ${res.p.name} / ${res.l.name}`);
        if (o._la && norm(o._la) !== norm(res.l.name)) mismatches.push(`${o.site_id} | X ${o.easting} Y ${o.northing} | Scottish Water: ${o._la} | ONS: ${res.l.name}`);
      }
    }
    const res = byUmp.get(o.site_id);
    if (res) {
      o.constituency_gss_code = res.p.code; o.constituency_name = res.p.name;
      o.council_gss_code = res.l.code; o.council_name = res.l.name;
      o.placement = res.how; o.placement_distance_m = res.dist;
    }
  }
  console.log(`  inside boundary: ${counts.inside}; below high-tide line: ${counts.tidal}; nearest within ${NEAREST_LIMIT_M / 1000} km: ${counts.nearest}; unplaced: ${counts.unplaced}`);
  for (const u of unplaced) console.log(`    unplaced: ${u}`);
  console.log(`  "nearest" placements more than 2 km away: ${far.length}`);
  for (const f of far) console.log(`    ${f}`);
  const outsideScotland = [...byUmp.entries()].filter(([, r]) => r && !String(r.l.code).startsWith('S'));
  console.log(`  placed outside Scotland: ${outsideScotland.length}`);
  for (const [k, r] of outsideScotland) console.log(`    ${k} | ${r.p.name} / ${r.l.name}`);
  console.log(`  council name disagreements with Scottish Water: ${mismatches.length}`);
  for (const m of mismatches) console.log(`    ${m}`);

  console.log(`\n--- 3. ${LATEST} totals, checked against the files' event sheets ---`);
  for (const file of FILES) {
    const { data, C } = readSummary(file);
    const ids = new Set(data.map((r) => clean(r[C.ump])));
    const rows = out.filter((o) => o.year === LATEST && ids.has(o.site_id));
    const ev = rows.reduce((t, o) => t + (o.spill_count || 0), 0);
    const hr = Math.round(rows.reduce((t, o) => t + (o.spill_hours || 0), 0));
    const withData = rows.filter((o) => o.spill_count !== null).length;
    const sheet = eventsSheetTotals(file, LATEST);
    console.log(`  ${file.kind}: ${rows.length} overflows, ${withData} with figures, ${ev} events, ${hr} hours | events sheet: ${sheet ? `${sheet.events} events, ${sheet.hours} hours` : 'not found'}`);
  }
  const vol = out.filter((o) => o.year === LATEST && o.volume_m3 !== null);
  console.log(`  volume published for ${vol.length} overflows in ${LATEST}, total ${Math.round(vol.reduce((t, o) => t + o.volume_m3, 0)).toLocaleString('en-GB')} m3`);
  for (const yr of [2021, 2022, 2023, 2024, 2025]) {
    const r = out.filter((o) => o.year === yr);
    console.log(`  ${yr}: ${r.length} rows, ${r.filter((o) => o.spill_count !== null).length} with figures, ${r.reduce((t, o) => t + (o.spill_count || 0), 0)} events, ${Math.round(r.reduce((t, o) => t + (o.spill_hours || 0), 0))} hours`);
  }

  console.log(`\n--- 4. Top areas, ${LATEST} (Scottish Water only) ---`);
  for (const type of ['council', 'constituency']) {
    const m = new Map();
    for (const o of out) {
      if (o.year !== LATEST || o.placement === 'unplaced') continue;
      const k = type === 'council' ? o.council_name : o.constituency_name;
      const t = m.get(k) || { hours: 0, events: 0, n: 0 };
      t.hours += o.spill_hours || 0; t.events += o.spill_count || 0; t.n++;
      m.set(k, t);
    }
    console.log(`  ${type}: ${m.size} areas`);
    for (const [k, t] of [...m.entries()].sort((a, b) => b[1].hours - a[1].hours).slice(0, 10)) console.log(`    ${k}: ${Math.round(t.hours)} hours, ${t.events} events, ${t.n} overflows`);
  }

  console.log('\n--- 5. Council codes against the site\'s councils table (read-only) ---');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  if (!db) console.log('  Supabase settings not found in .env.local; check skipped');
  else {
    const { data, error } = await db.from('councils').select('gss_code');
    if (error) console.log(`  councils read failed: ${error.message}`);
    else {
      const codes = new Set((data || []).map((c) => c.gss_code));
      const missing = [...new Set(out.filter((o) => o.council_gss_code && !codes.has(o.council_gss_code)).map((o) => `${o.council_gss_code} ${o.council_name}`))];
      console.log(`  council codes not in the councils table: ${missing.length ? missing.join('; ') : 'none'}`);
    }
  }

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }

  console.log('\n--- 6. Writing ---');
  if (!db) throw new Error('Supabase settings missing; cannot write');
  const rows = out.map(({ _la, _asset, ...o }) => ({ ...o, synced_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('sewage_overflows').upsert(rows.slice(i, i + 500), { onConflict: 'source,site_id,year' });
    if (error) throw new Error(`sewage_overflows upsert at ${i}: ${error.message}`);
  }
  console.log(`  sewage_overflows: ${rows.length} Scottish Water rows saved`);
  const years = [...new Set(rows.map((r) => r.year))];
  const { error: dErr, count } = await db.from('sewage_overflows').delete({ count: 'exact' }).eq('source', 'SW').in('year', years).lt('synced_at', runStart);
  if (dErr) throw new Error(`stale delete: ${dErr.message}`);
  console.log(`  ${count || 0} Scottish Water rows no longer in the files removed`);
  const { data: totalRows, error: tErr } = await db.rpc('refresh_sewage_area_totals');
  if (tErr) throw new Error(`refresh_sewage_area_totals: ${tErr.message}`);
  console.log(`  sewage_area_totals: rebuilt from all sources, ${totalRows} rows`);
  // /sewage reads these summaries, not every overflow (migration 2026-10-19k)
  const { data: sumRows, error: sErr } = await db.rpc('refresh_sewage_summary');
  if (sErr) throw new Error(`refresh_sewage_summary: ${sErr.message}`);
  console.log(`  sewage summaries: rebuilt from all sources, ${sumRows} rows`);
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
