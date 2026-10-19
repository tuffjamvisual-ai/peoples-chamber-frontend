#!/usr/bin/env node
// Imports council tax levels for 2026-27 into council_tax_levels (migration 2026-10-18g-council-tax-levels.sql)
// from the government releases, converted to CSV (one file per sheet) and kept out of Git in
// "Claude outputs/council-tax-2026-27/":
//   England  (MHCLG Table 10): england-table10-data-billing.csv, england-table10-data-precepting.csv,
//            england-table10-precepting-bodies.csv
//   Wales    (Welsh Government): wales-table1-band-d-elements.csv, wales-table2-changes.csv
//   Scotland (Scottish Government): scotland-ct-by-band-2026-27.csv, scotland-band-d-1996-2027.csv
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. Pass --write to save, only after the dry run
// has been approved. Rows already loaded for the year are replaced only with --replace.
//
// Rules:
//   - Amounts are rounded to pence. Columns are found by their headings, not their positions.
//   - England billing councils: council_band_d is line 9 (excluding parishes), parish_avg_band_d is line 8
//     minus line 9, the major precepts are line 16 (county or GLA, police, fire, combined authority), and
//     area_band_d is line 17. London boroughs' line 16 county figure is the GLA's, so it goes in gla_band_d.
//   - England county councils (Data_Precepting, class SC): council_band_d, the previous year and the
//     adult social care element only; no area total.
//   - Barnsley and Sheffield appear under their new GSS codes; they are mapped to the codes we hold.
//   - Wales and Scotland list councils by name; each name must match exactly one council in our table.
//   - Check: for every English billing council, own Band D including parishes + county or GLA + police +
//     fire + combined authority must equal area_band_d to the penny.
//   - Check: every council in our table for England, Wales and Scotland gets a row (Northern Ireland has
//     domestic rates and is left out).
//
// Usage:
//   node scripts/import-council-tax-levels.js > council-tax-dryrun.txt 2>&1
//   node scripts/import-council-tax-levels.js --write > council-tax-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const REPLACE = process.argv.includes('--replace');
const YEAR = '2026-27';
const DIR = (process.argv.find((a) => a.startsWith('--dir=')) || '').slice(6) || 'Claude outputs/council-tax-2026-27';
const SRC = {
  England: 'https://assets.publishing.service.gov.uk/media/6a02eeeccd2e0e8b5b20b449/Table_10_2026-27.ods',
  Wales: 'https://www.gov.wales/sites/default/files/statistics-and-research/2026-03/council-tax-levels-april-2026-march-2027-153478.xlsx',
  Scotland: 'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2019/04/council-tax-datasets/documents/average-council-tax-per-dwelling/council-tax-by-band-2026-27/council-tax-by-band-2026-27/govscot%3Adocument/CTAS%2B2026%2B-%2BCouncil%2BTax%2BAssumptions%2B-%2BCouncil%2BTax%2Bby%2BBand%2B-%2B2026-27.xlsx',
  // Scottish Government, Band D Council Tax 1996-97 to 2026-27 (scotland-band-d-1996-2027.csv): the previous year's Band D
  ScotlandBandD: 'https://www.gov.scot/binaries/content/documents/govscot/publications/statistics/2019/04/council-tax-datasets/documents/band-d/band-d-council-tax-1996-97-to-2019-20-data/band-d-council-tax-1996-97-to-2019-20-data/govscot%3Adocument/CTAS%2B2026%2B-%2BCouncil%2BTax%2BAssumptions%2B-%2BBand%2BD%2BCouncil%2BTax%2Brates%2Bby%2Byear%2B-%2B1996-97%2Bto%2B2026-27.xlsx',
};
// GSS codes that changed after a boundary review: the release's new code -> the code we hold.
// Names in the releases that differ from ours: the release name (simplified) -> our slug.
const NAME_ALIAS = { naheileanansiar: 'comhairle-nan-eilean-siar' /* Gaelic name used by the Scottish Government */ };
const GSS_ALIAS = { E08000038: 'E08000016' /* Barnsley */, E08000039: 'E08000019' /* Sheffield */ };

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}
const read = (f) => {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) fail(`${p} not found`);
  return parseCsv(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
};
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
// Pounds: numbers only ('[z]', '-', '' are null). Rounded to pence.
const num = (s) => { const t = clean(s).replace(/[£,]/g, ''); return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
const pence = (x) => (x == null ? null : Math.round(x * 100) / 100);
// Index of the one heading that contains every fragment given.
function colOf(head, ...frags) {
  const hits = head.map((h, i) => [clean(h).toLowerCase(), i]).filter(([h]) => frags.every((f) => h.includes(f.toLowerCase())));
  if (hits.length !== 1) fail(`expected one column with "${frags.join('" + "')}", found ${hits.length}`);
  return hits[0][1];
}
// Index of the column whose heading is exactly this.
function colEq(head, name) {
  const i = head.findIndex((h) => clean(h).toLowerCase() === name.toLowerCase());
  if (i < 0) fail(`no column headed "${name}"`);
  return i;
}
const headerRow = (rows, first) => {
  const i = rows.findIndex((r) => clean(r[0]) === first);
  if (i < 0) fail(`no header row starting "${first}"`);
  return i;
};
const core = (s) => clean(s).toLowerCase().replace(/&/g, 'and').replace(/\b(the|city|of|council|county|borough|islands?)\b/g, '').replace(/[^a-z]/g, '');

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const { data: councils, error } = await db.from('councils').select('slug, name, gss_code, country').order('slug');
  if (error) fail(`councils: ${error.message}`);
  const byGss = new Map(councils.map((c) => [c.gss_code, c]));
  const byName = (name, country) => {
    const k = core(name);
    const alias = NAME_ALIAS[k];
    const m = councils.filter((c) => c.country === country && (alias ? c.slug === alias : core(c.name) === k || core(c.slug.replace(/-/g, ' ')) === k));
    if (m.length !== 1) fail(`${country}: "${name}" matches ${m.length} councils in our table`);
    return m[0];
  };

  const out = [];
  const notes = [];
  const sumFails = [];

  // ---- England: billing councils ----
  const B = read('england-table10-data-billing.csv');
  const bh = headerRow(B, 'E-code'); const H = B[bh];
  const c = {
    ons: colEq(H, 'ONS Code'), name: colEq(H, 'Authority'), cls: colEq(H, 'Class'),
    inclPrev: colOf(H, '8. average', 'including adult social care precept and local precepts', 'previous year'),
    incl: colOf(H, '8. average', 'including adult social care precept and local precepts', 'current year'),
    exclPrev: colOf(H, '9. average', 'excluding local precepts', 'previous year'),
    excl: colOf(H, '9. average', 'excluding local precepts', 'current year'),
    asc: colOf(H, '11a.'),
    county: colOf(H, '16.', '(county or gla)'), police: colOf(H, '16.', '(police)'), fire: colOf(H, '16.', '(fire)'), ca: colOf(H, '16.', '(combined authority)'),
    area: colOf(H, '17. average'),
  };
  const PB = read('england-table10-precepting-bodies.csv');
  const bodies = new Map();
  for (const r of PB) {
    const ons = clean(r[2]);
    if (!/^E0[6-9]\d{6}$/.test(ons)) continue;
    const nm = (x) => (clean(x) && clean(x) !== '-' ? clean(x) : null);
    bodies.set(ons, { county: nm(r[4]), police: nm(r[5]), fire: nm(r[6]), ca: nm(r[7]) });
  }
  let eb = 0;
  for (const r of B.slice(bh + 1)) {
    const raw = clean(r[c.ons]);
    if (!/^E0[6-9]\d{6}$/.test(raw)) continue;
    const gss = GSS_ALIAS[raw] || raw;
    if (GSS_ALIAS[raw]) notes.push(`${clean(r[c.name])}: release code ${raw} mapped to ${gss}`);
    const london = ['ILB', 'OLB'].includes(clean(r[c.cls]));
    const incl = num(r[c.incl]), excl = num(r[c.excl]);
    const major = { county: num(r[c.county]) || 0, police: num(r[c.police]) || 0, fire: num(r[c.fire]) || 0, ca: num(r[c.ca]) || 0 };
    const area = num(r[c.area]);
    const parts = pence(incl) + pence(major.county) + pence(major.police) + pence(major.fire) + pence(major.ca);
    if (Math.abs(pence(parts) - pence(area)) >= 0.005) sumFails.push(`${clean(r[c.name])} (${gss}): parts ${pence(parts).toFixed(2)} vs area ${pence(area).toFixed(2)} (difference ${(pence(parts) - pence(area)).toFixed(2)})`);
    const b = bodies.get(raw) || {};
    out.push({
      council_gss_code: gss, year: YEAR, nation: 'England',
      council_band_d: pence(excl), council_band_d_prev: pence(num(r[c.exclPrev])), asc_band_d: pence(num(r[c.asc])),
      parish_avg_band_d: pence(incl - excl),
      county_band_d: london ? null : (major.county ? pence(major.county) : null), gla_band_d: london ? pence(major.county) : null,
      police_band_d: major.police ? pence(major.police) : null, fire_band_d: major.fire ? pence(major.fire) : null, ca_band_d: major.ca ? pence(major.ca) : null,
      area_band_d: pence(area),
      county_name: london ? null : b.county || null, police_name: b.police || null, fire_name: b.fire || null, ca_name: b.ca || null,
      source_url: SRC.England, _name: clean(r[c.name]),
    });
    eb++;
  }

  // ---- England: county councils ----
  const P = read('england-table10-data-precepting.csv');
  const ph = headerRow(P, 'E-code'); const PH = P[ph];
  const pc = {
    ons: colEq(PH, 'ONS Code'), name: colEq(PH, 'Authority'), cls: colEq(PH, 'Class'),
    prev: colOf(PH, '3. average', 'previous year'), cur: colOf(PH, '3. average', 'current year'), asc: colOf(PH, '5. adult social care'),
  };
  let ec = 0;
  for (const r of P.slice(ph + 1)) {
    const gss = clean(r[pc.ons]);
    if (clean(r[pc.cls]) !== 'SC' || !/^E10\d{6}$/.test(gss)) continue;
    out.push({
      council_gss_code: gss, year: YEAR, nation: 'England',
      council_band_d: pence(num(r[pc.cur])), council_band_d_prev: pence(num(r[pc.prev])), asc_band_d: pence(num(r[pc.asc])),
      parish_avg_band_d: null, county_band_d: null, police_band_d: null, fire_band_d: null, ca_band_d: null, gla_band_d: null, area_band_d: null,
      county_name: null, police_name: null, fire_name: null, ca_name: null, source_url: SRC.England, _name: clean(r[pc.name]),
    });
    ec++;
  }

  // ---- Wales ----
  const W1 = read('wales-table1-band-d-elements.csv'), W2 = read('wales-table2-changes.csv');
  const w1h = headerRow(W1, 'Authority'), w2h = headerRow(W2, 'Authority');
  const w1 = { overall: colOf(W1[w1h], 'overall average band d'), county: colOf(W1[w1h], 'county council element'), community: colOf(W1[w1h], 'community council element'), police: colOf(W1[w1h], 'police authority element') };
  const w2 = { countyInc: colOf(W2[w2h], 'county increase', '£'), area: colOf(W2[w2h], 'police authority area') };
  const t2 = new Map(W2.slice(w2h + 1).filter((r) => clean(r[0])).map((r) => [clean(r[0]), r]));
  let wc = 0;
  for (const r of W1.slice(w1h + 1)) {
    const name = clean(r[0]);
    if (!name || num(r[w1.overall]) == null || /^wales\b/i.test(name)) continue;
    const council = byName(name, 'Wales');
    const r2 = t2.get(name);
    if (!r2) fail(`Wales: ${name} not in Table 2`);
    const county = num(r[w1.county]);
    out.push({
      council_gss_code: council.gss_code, year: YEAR, nation: 'Wales',
      council_band_d: pence(county), council_band_d_prev: pence(county - num(r2[w2.countyInc])), asc_band_d: null,
      parish_avg_band_d: pence(num(r[w1.community])), county_band_d: null, police_band_d: pence(num(r[w1.police])), fire_band_d: null, ca_band_d: null, gla_band_d: null,
      area_band_d: pence(num(r[w1.overall])),
      county_name: null, police_name: clean(r2[w2.area]) ? `${clean(r2[w2.area])} Police` : null, fire_name: null, ca_name: null,
      source_url: SRC.Wales, _name: name,
    });
    wc++;
  }

  // ---- Scotland ----
  const S1 = read('scotland-ct-by-band-2026-27.csv'), S2 = read('scotland-band-d-1996-2027.csv');
  const s1h = S1.findIndex((r) => clean(r[4]) === 'Band D'); if (s1h < 0) fail('Scotland: no "Band D" heading');
  const s2h = S2.findIndex((r) => r.map(clean).includes('2025-26')); if (s2h < 0) fail('Scotland: no "2025-26" heading');
  const s2prev = S2[s2h].map(clean).indexOf('2025-26');
  const series = new Map(S2.slice(s2h + 1).filter((r) => clean(r[0])).map((r) => [core(r[0]), r]));
  let sc = 0;
  for (const r of S1.slice(s1h + 1)) {
    const name = clean(r[0]);
    const d = num(r[4]);
    if (!name || d == null || /^(ratio|valuation)/i.test(name)) continue;
    const council = byName(name, 'Scotland');
    if (Math.abs(d * 100 - Math.round(d * 100)) > 1e-6) notes.push(`${name}: Band D ${d} in the release, rounded to ${pence(d).toFixed(2)}`);
    const sr = series.get(core(name));
    if (!sr) fail(`Scotland: ${name} not in the Band D series`);
    out.push({
      council_gss_code: council.gss_code, year: YEAR, nation: 'Scotland',
      council_band_d: pence(d), council_band_d_prev: pence(num(sr[s2prev])), asc_band_d: null, parish_avg_band_d: null,
      county_band_d: null, police_band_d: null, fire_band_d: null, ca_band_d: null, gla_band_d: null, area_band_d: pence(d),
      county_name: null, police_name: null, fire_name: null, ca_name: null, source_url: SRC.Scotland, _name: name,
    });
    sc++;
  }

  // ---- Checks ----
  const have = new Set(out.map((o) => o.council_gss_code));
  const dup = out.length - have.size;
  const unknown = out.filter((o) => !byGss.has(o.council_gss_code)).map((o) => `${o._name} (${o.council_gss_code})`);
  const missing = councils.filter((x) => ['England', 'Wales', 'Scotland'].includes(x.country) && !have.has(x.gss_code)).map((x) => `${x.name} (${x.gss_code})`);
  const noBandD = out.filter((o) => o.council_band_d == null).map((o) => o._name);

  console.log(`council tax ${YEAR}: England ${eb} billing councils + ${ec} county councils; Wales ${wc}; Scotland ${sc}; ${out.length} rows`);
  console.log(`\nCheck: English billing councils whose parts do not add up to area_band_d to the penny (${sumFails.length}):`);
  for (const f of sumFails) console.log(`  ${f}`);
  console.log(`\nCheck: councils in our table (England, Wales, Scotland) with no row (${missing.length}): ${missing.join(', ') || 'none'}`);
  console.log(`Rows whose code is not in our table (${unknown.length}): ${unknown.join(', ') || 'none'}`);
  console.log(`Duplicate codes: ${dup}; rows without a council Band D: ${noBandD.length ? noBandD.join(', ') : 'none'}`);
  console.log(`\nNotes (${notes.length}):`); for (const n of notes) console.log(`  ${n}`);

  const show = (pred) => { const o = out.find(pred); if (o) { const { _name, ...row } = o; console.log(`\n${_name}:`); console.log(JSON.stringify(row, null, 1)); } };
  console.log('\nSample rows:');
  show((o) => o._name === 'Adur'); show((o) => o._name === 'Bristol'); show((o) => o._name === 'Camden');
  show((o) => o._name === 'West Sussex'); show((o) => o._name === 'Cardiff'); show((o) => o._name === 'South Lanarkshire');

  const problems = sumFails.length + missing.length + unknown.length + dup + noBandD.length;
  if (!WRITE) { console.log(`\nDRY RUN complete (${problems} problems). Nothing was written.`); return; }
  if (problems) fail(`${problems} problems; nothing written`);

  const { data: existing, error: ee } = await db.from('council_tax_levels').select('council_gss_code').eq('year', YEAR);
  if (ee) fail(`council_tax_levels: ${ee.message}`);
  if (existing.length && !REPLACE) fail(`${existing.length} rows for ${YEAR} already loaded; pass --replace to replace them`);
  const rows = out.map(({ _name, ...r }) => r);
  for (let i = 0; i < rows.length; i += 200) {
    const { error: we } = await db.from('council_tax_levels').upsert(rows.slice(i, i + 200), { onConflict: 'council_gss_code,year' });
    if (we) fail(`write: ${we.message}`);
  }
  console.log(`\n--- Writing ---\n  council_tax_levels: ${rows.length} rows for ${YEAR}\n\nWRITE complete.`);
})();
