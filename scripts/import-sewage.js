#!/usr/bin/env node
// Import storm overflow (sewage spill) data for England and Northern Ireland
// into public.sewage_overflows and public.sewage_area_totals
// (migration scripts/migrations/2026-10-12h-sewage-overflows.sql).
//
// DRY RUN BY DEFAULT: downloads, places and totals everything, prints a report
// and writes NOTHING. It reads the councils table (read-only) to check that
// every council code it produces exists on the site.
// Pass --write to save to the database (only after the dry-run report has
// been approved).
//
// ENGLAND - Environment Agency EDM annual return 2025 (Open Government Licence)
//   * One row per storm overflow, keyed by the EA "Unique ID". Permit
//     references are shared by several overflows, so they are never a key.
//   * Grid reference ("Outlet Discharge NGR", e.g. SO5219438786) -> easting and
//     northing -> constituency and council by point-in-polygon against the ONS
//     coastline-clipped generalised boundaries (BGC), downloaded once.
//   * Points outside every BGC boundary (outfalls below the high-tide line) are
//     checked against the ONS extent-of-the-realm boundaries (BFE), which run
//     out to sea, by asking the ONS service. Any still missing take the nearest
//     BGC boundary within 15 km (long sea outfalls end well beyond the
//     low-tide line), recorded with the distance and listed in the report.
//     Anything further is left unplaced and listed.
//   * A few overflows are published with two or three grid references
//     ("NZ4071712229 & NZ4071412228", one per line, or with a note in
//     brackets). The first grid reference is used.
//   * Durations are stored by the EA as Excel day fractions (16.875 = 405
//     hours) or as "hh:mm:ss" text. Both are converted to hours. A blank stays
//     blank (null), never 0.
//   * Lat/long (for maps) converted from OSGB36 to WGS84 with the standard
//     Helmert transformation (accurate to about 5 metres).
//
// NORTHERN IRELAND - NI Water Event Duration Monitor workbook (August 2026)
//   * 501 overflows keyed by CARID. NI Water names the constituency and
//     council; names are matched to ONS codes. Years 2023, 2024 and 2025.
//     "NOT REPORTED" is stored as null.
//
// Usage:
//   node scripts/import-sewage.js > sewage-import-dryrun.txt 2>&1
//   node scripts/import-sewage.js --write > sewage-import-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const zlib = require('zlib');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');

const EA_YEAR = 2025;
// data.gov.uk catalogue page (Open Government Licence v3.0, verified 2026-10-12)
const EA_PAGE = 'https://www.data.gov.uk/dataset/19f6064d-7356-466f-844e-d20ea10ae9fd/event-duration-monitoring-storm-overflows-annual-returns';
const EA_ZIP = 'https://environment.data.gov.uk/api/file/download?fileDataSetId=c55e170e-3c75-49a5-8026-a961ff94c8e0&fileName=EDM_2025_Storm_Overflow_Annual_Return.zip';
const NI_XLSX = 'https://www.niwater.com/media/3mwndn2k/event-duration-monitor-data-august-2026.xlsx';
const ONS = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const PCON = { code: 'PCON24CD', name: 'PCON24NM', bgc: `${ONS}/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BGC/FeatureServer/0`, bfe: `${ONS}/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BFE/FeatureServer/0` };
const LAD = { code: 'LAD26CD', name: 'LAD26NM', bgc: `${ONS}/Local_Authority_Districts_May_2026_Boundaries_UK_BGC/FeatureServer/0`, bfe: `${ONS}/Local_Authority_Districts_May_2026_Boundaries_UK_BFE/FeatureServer/0` };
const NEAREST_LIMIT_M = 15000;
// NI Water council names that differ from the ONS names (matched after normalising).
const NI_COUNCIL_ALIASES = { 'derry and strabane': 'Derry City and Strabane', 'armagh banbridge and craigavon': 'Armagh City, Banbridge and Craigavon' };
// Offshore outfalls (more than 2 km beyond the boundaries) where the nearest
// shore is not where the pipe comes from. Placed by the works' own location
// instead; each verified 2026-10-13 and printed in the report.
//   SWS00727 Ryde (Appley Park) headworks, Isle of Wight: nearest shore is
//     Gosport across the Solent. Appley, Ryde (PO33 1ND) is Isle of Wight East /
//     Isle of Wight (postcodes.io).
//   SBB00553 Hayle sewage treatment works: nearest shore is the Gwithian side
//     (Camborne and Redruth). The works (permit EPR/NP3696HH, TR27 6LA, gov.uk)
//     is in St Ives / Cornwall (postcodes.io).
const PLACEMENT_OVERRIDES = {
  SWS00727: { pcon: 'E14001303', lad: 'E06000046', why: 'Ryde (Appley Park), Isle of Wight; works at PO33 1ND' },
  SBB00553: { pcon: 'E14001511', lad: 'E06000052', why: 'Hayle STW, permit EPR/NP3696HH, works at TR27 6LA' },
};
// Barnsley and Sheffield: ONS 2025+ codes -> codes held in public.councils (same as lib/fuel-poverty.ts etc.)
const CODE_ALIASES = { E08000038: 'E08000016', E08000039: 'E08000019' };
const UA = { 'User-Agent': 'opengovt-import/1.0' };

async function get(url, asJson = true) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, redirect: 'follow' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return asJson ? await res.json() : Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// Minimal ZIP reader (central directory, deflate/stored).
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const out = [];
  for (let k = 0; k < n; k++) {
    const method = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42); const name = buf.slice(p + 46, p + 46 + nl).toString('utf8');
    const lnl = buf.readUInt16LE(local + 26), lxl = buf.readUInt16LE(local + 28);
    const data = buf.slice(local + 30 + lnl + lxl, local + 30 + lnl + lxl + comp);
    if (!name.endsWith('/')) out.push({ name, data: method === 8 ? zlib.inflateRawSync(data) : data });
    p += 46 + nl + xl + cl;
  }
  return out;
}

// ---------- coordinates ----------

// First grid reference in a published value that may hold several
// ("A & B", "A, B and C", one per line, or "A (to a culverted watercourse ...)").
function firstRef(ref) {
  return String(ref || '').trim().split(/\s*(?:&|,|;|\(|\n|\band\b)\s*/i)[0];
}
function hasSeveralRefs(ref) {
  return firstRef(ref).trim() !== String(ref || '').trim();
}

// OS grid reference -> [easting, northing] (metres), or null.
function ngrToEN(ref) {
  const s = firstRef(ref).toUpperCase().replace(/\s+/g, '');
  const m = s.match(/^([A-HJ-Z])([A-HJ-Z])(\d+)$/);
  if (!m || m[3].length % 2 || m[3].length > 10) return null;
  const idx = (c) => { let i = c.charCodeAt(0) - 65; if (i > 7) i--; return i; }; // letters skip I
  const l1 = idx(m[1]), l2 = idx(m[2]);
  const e100 = ((l1 - 2) % 5) * 5 + (l2 % 5);
  const n100 = 19 - Math.floor(l1 / 5) * 5 - Math.floor(l2 / 5);
  const half = m[3].length / 2, scale = Math.pow(10, 5 - half);
  return [e100 * 100000 + Number(m[3].slice(0, half)) * scale, n100 * 100000 + Number(m[3].slice(half)) * scale];
}

// OSGB36 easting/northing -> WGS84 [lat, lon] (Ordnance Survey formulae + Helmert).
function enToLatLon(E, N) {
  const a = 6377563.396, b = 6356256.909, F0 = 0.9996012717;
  const lat0 = (49 * Math.PI) / 180, lon0 = (-2 * Math.PI) / 180, N0 = -100000, E0 = 400000;
  const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b), n2 = n * n, n3 = n2 * n;
  let lat = lat0, M = 0;
  do {
    lat = (N - N0 - M) / (a * F0) + lat;
    const Ma = (1 + n + 1.25 * n2 + 1.25 * n3) * (lat - lat0);
    const Mb = (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(lat - lat0) * Math.cos(lat + lat0);
    const Mc = ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(2 * (lat - lat0)) * Math.cos(2 * (lat + lat0));
    const Md = (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0));
    M = b * F0 * (Ma - Mb + Mc - Md);
  } while (Math.abs(N - N0 - M) >= 0.00001);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;
  const t = Math.tan(lat), t2 = t * t, t4 = t2 * t2, t6 = t4 * t2, sec = 1 / cosLat;
  const nu3 = nu * nu * nu, nu5 = nu3 * nu * nu, nu7 = nu5 * nu * nu;
  const VII = t / (2 * rho * nu);
  const VIII = (t / (24 * rho * nu3)) * (5 + 3 * t2 + eta2 - 9 * t2 * eta2);
  const IX = (t / (720 * rho * nu5)) * (61 + 90 * t2 + 45 * t4);
  const X = sec / nu;
  const XI = (sec / (6 * nu3)) * (nu / rho + 2 * t2);
  const XII = (sec / (120 * nu5)) * (5 + 28 * t2 + 24 * t4);
  const XIIA = (sec / (5040 * nu7)) * (61 + 662 * t2 + 1320 * t4 + 720 * t6);
  const dE = E - E0;
  const phi = lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6;
  const lam = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7;
  // OSGB36 (Airy 1830) -> cartesian -> Helmert -> WGS84
  const sp = Math.sin(phi), cp = Math.cos(phi), sl = Math.sin(lam), cl = Math.cos(lam);
  const nuA = a / Math.sqrt(1 - e2 * sp * sp);
  const x1 = nuA * cp * cl, y1 = nuA * cp * sl, z1 = (1 - e2) * nuA * sp;
  const tx = 446.448, ty = -125.157, tz = 542.06, s = -20.4894e-6;
  const sec2rad = Math.PI / (180 * 3600);
  const rx = 0.1502 * sec2rad, ry = 0.247 * sec2rad, rz = 0.8421 * sec2rad;
  const x2 = tx + x1 * (1 + s) - y1 * rz + z1 * ry;
  const y2 = ty + x1 * rz + y1 * (1 + s) - z1 * rx;
  const z2 = tz - x1 * ry + y1 * rx + z1 * (1 + s);
  const aW = 6378137, bW = 6356752.314245, e2W = 1 - (bW * bW) / (aW * aW);
  const p = Math.sqrt(x2 * x2 + y2 * y2);
  let f = Math.atan2(z2, p * (1 - e2W)), fPrev = 2 * Math.PI;
  while (Math.abs(f - fPrev) > 1e-12) {
    const nuW = aW / Math.sqrt(1 - e2W * Math.sin(f) ** 2);
    fPrev = f; f = Math.atan2(z2 + e2W * nuW * Math.sin(f), p);
  }
  return [Math.round(((f * 180) / Math.PI) * 1e6) / 1e6, Math.round(((Math.atan2(y2, x2) * 180) / Math.PI) * 1e6) / 1e6];
}

// ---------- boundaries ----------

// Downloads every feature of an ONS layer as British National Grid rings.
async function loadBoundaries(layer, label) {
  const meta = await get(`${layer.bgc}?f=json`);
  const total = (await get(`${layer.bgc}/query?where=1%3D1&returnCountOnly=true&f=json`)).count;
  const feats = [];
  const page = 25;
  for (let offset = 0; offset < total; offset += page) {
    const q = `${layer.bgc}/query?where=1%3D1&outFields=${layer.code},${layer.name}&outSR=27700&geometryPrecision=0&returnGeometry=true&orderByFields=${layer.code}&resultOffset=${offset}&resultRecordCount=${page}&f=json`;
    const r = await get(q);
    for (const f of r.features || []) {
      const rings = (f.geometry && f.geometry.rings) || [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const ring of rings) for (const [x, y] of ring) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      feats.push({ code: f.attributes[layer.code], name: f.attributes[layer.name], rings, bbox: [minX, minY, maxX, maxY] });
    }
  }
  console.log(`  ${label}: ${feats.length} of ${total} boundaries downloaded (${meta.name || layer.bgc})`);
  if (feats.length !== total) throw new Error(`${label}: expected ${total} boundaries, got ${feats.length}`);
  return feats;
}

// Even-odd ray casting across all rings (handles islands and holes).
function inside(feat, x, y) {
  const [a, b, c, d] = feat.bbox;
  if (x < a || x > c || y < b || y > d) return false;
  let hit = false;
  for (const ring of feat.rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function nearest(feats, x, y, limit) {
  let best = null;
  for (const f of feats) {
    const [a, b, c, d] = f.bbox;
    if (x < a - limit || x > c + limit || y < b - limit || y > d + limit) continue;
    for (const ring of f.rings) for (let i = 1; i < ring.length; i++) {
      const dist = segDist(x, y, ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1]);
      if (dist <= limit && (!best || dist < best.dist)) best = { feat: f, dist };
    }
  }
  return best;
}

// Asks an ONS extent-of-the-realm service which area contains the point.
async function bfeQuery(layer, x, y) {
  const r = await get(`${layer.bfe}/query?geometry=${x},${y}&geometryType=esriGeometryPoint&inSR=27700&spatialRel=esriSpatialRelIntersects&outFields=${layer.code},${layer.name}&returnGeometry=false&f=json`);
  if (r.error) throw new Error(r.error.message || 'query error');
  const a = r.features && r.features[0] && r.features[0].attributes;
  return a ? { code: a[layer.code], name: a[layer.name] } : null;
}

// ---------- values ----------

// EA duration -> hours. Excel day fraction (number or numeric text) or "hh:mm:ss" text.
const textDurations = new Map();
function toHours(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.round(v * 24 * 100) / 100;
  const s = String(v).trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 24 * 100) / 100;
  const m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/);
  if (m) { textDurations.set('hh:mm:ss', (textDurations.get('hh:mm:ss') || 0) + 1); return Math.round((Number(m[1]) + Number(m[2]) / 60 + Number(m[3] || 0) / 3600) * 100) / 100; }
  textDurations.set(s, (textDurations.get(s) || 0) + 1);
  return null;
}
const textCounts = new Map();
function toInt(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return Math.round(v);
  const s = String(v).trim();
  if (/^\d+(\.0+)?$/.test(s)) return Number(s);
  if (s) textCounts.set(s, (textCounts.get(s) || 0) + 1);
  return null;
}
function toNum(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}
const clean = (v) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s && !/^not applicable$/i.test(s) ? s : null; };
const norm = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const wordKey = (s) => norm(s).split(' ').filter((w) => w && w !== 'and').sort().join(' ');
const alias = (code) => CODE_ALIASES[code] || code;
const nationOf = (code) => ({ E: 'England', W: 'Wales', S: 'Scotland', N: 'Northern Ireland' })[String(code)[0]];

// ---------- main ----------

(async () => {
  console.log(`=== Storm overflow import (${WRITE ? 'WRITE' : 'DRY RUN - nothing will be written'}) ===`);
  const runStart = new Date().toISOString();

  console.log('\n--- 1. ONS boundaries ---');
  const pconFeats = await loadBoundaries(PCON, 'constituencies');
  const ladFeats = await loadBoundaries(LAD, 'councils');
  const bfeOk = {};
  for (const [key, layer] of [['constituencies', PCON], ['councils', LAD]]) {
    try { await get(`${layer.bfe}?f=json`).then((m) => { if (m.error) throw new Error(m.error.message); }); bfeOk[key] = true; console.log(`  ${key} extent-of-the-realm service: available`); }
    catch (e) { bfeOk[key] = false; console.log(`  ${key} extent-of-the-realm service: NOT available (${e.message}); nearest-boundary fallback only`); }
  }

  console.log('\n--- 2. Environment Agency 2025 return (England) ---');
  const files = unzip(await get(EA_ZIP, false));
  const mainFile = files.find((f) => /all water and sewerage companies\.xlsx$/i.test(f.name));
  const summaryFile = files.find((f) => /summary data\.xlsx\.xlsx$/i.test(f.name) || /summary data\.xlsx$/i.test(f.name));
  const wb = XLSX.read(mainFile.data, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['All WaSC'], { header: 1, blankrows: false, defval: '' });
  const hi = rows.findIndex((r) => String(r[0]).trim() === 'Unique ID');
  const h = rows[hi].map((c) => String(c).replace(/\s+/g, ' ').trim());
  const col = (re, label) => { const i = h.findIndex((c) => re.test(c)); if (i < 0) throw new Error(`EA column not found: ${label}`); return i; };
  const C = {
    id: 0, company: col(/^Water Company Name/, 'company'), site: col(/^Site Name \(EA/, 'site'), siteOp: col(/^Site Name \(WaSC/, 'site operational'),
    permit: col(/^EA Permit Reference/, 'permit'), asset: col(/^Storm Discharge Asset Type/, 'asset type'), ngr: col(/^Outlet Discharge NGR/, 'NGR'),
    water: col(/^Receiving Water/, 'receiving water'), dur: col(/^Total Duration/, 'duration'), spills: col(/^Counted spills/, 'counted spills'),
    edm: col(/^EDM Operation - % of reporting period/, 'EDM operation %'),
  };
  const noId = rows.slice(hi + 1).filter((r) => !String(r[C.id]).trim() && (String(r[C.company]).trim() || String(r[C.ngr]).trim() || String(r[C.site]).trim()));
  // A row with data but no EA Unique ID gets a fixed ID from its permit and grid reference
  // (never the permit alone: several overflows share one permit).
  const idOf = (r) => String(r[C.id]).trim() || `NOID-${String(r[C.permit]).replace(/\s+/g, '').trim()}-${firstRef(r[C.ngr]).toUpperCase().replace(/\s+/g, '')}`;
  const eaRows = rows.slice(hi + 1).filter((r) => String(r[C.id]).trim() || noId.includes(r));
  console.log(`  rows: ${eaRows.length}`);
  console.log(`  rows with data but no Unique ID (imported with a fixed ID): ${noId.length}`);
  for (const r of noId) console.log(`    ID ${idOf(r)}`);
  for (const r of noId) console.log(`    ${[C.company, C.site, C.siteOp, C.permit, C.asset, C.ngr, C.water, C.spills, C.dur].map((i) => String(r[i]).replace(/\s+/g, ' ').trim()).join(' | ')}`);
  const seen = new Set(), dupes = [];
  const ea = [], badNgr = [];
  let severalRefs = 0;
  for (const r of eaRows) {
    const id = idOf(r);
    if (seen.has(id)) { dupes.push(id); continue; }
    seen.add(id);
    const en = ngrToEN(r[C.ngr]);
    if (hasSeveralRefs(r[C.ngr])) severalRefs++;
    if (!en) badNgr.push(`${id} | ${r[C.company]} | ${clean(r[C.site])} | grid ref "${r[C.ngr]}"`);
    const ll = en ? enToLatLon(en[0], en[1]) : [null, null];
    ea.push({
      source: 'EA', site_id: id, year: EA_YEAR, company: clean(r[C.company]), site_name: clean(r[C.site]), site_name_operator: clean(r[C.siteOp]),
      permit_ref: clean(r[C.permit]), asset_type: clean(r[C.asset]), receiving_water: clean(r[C.water]), ngr: clean(r[C.ngr]),
      easting: en ? Math.round(en[0]) : null, northing: en ? Math.round(en[1]) : null, latitude: ll[0], longitude: ll[1],
      constituency_gss_code: null, constituency_name: null, council_gss_code: null, council_name: null, placement: 'unplaced', placement_distance_m: null,
      spill_count: toInt(r[C.spills]), spill_hours: toHours(r[C.dur]), monitoring_pct: toNum(r[C.edm]), source_url: EA_PAGE,
    });
  }
  console.log(`  duplicate Unique IDs skipped: ${dupes.length}${dupes.length ? ' (' + dupes.slice(0, 20).join(', ') + ')' : ''}`);
  console.log(`  durations stored as text: ${[...textDurations].map(([k, v]) => `"${k}" x${v}`).join(', ') || 'none'}`);
  console.log(`  spill counts stored as text (kept as blank): ${[...textCounts].map(([k, v]) => `"${k}" x${v}`).join(', ') || 'none'}`);
  console.log(`  rows with no spill count: ${ea.filter((x) => x.spill_count === null).length}; with no duration: ${ea.filter((x) => x.spill_hours === null).length}`);
  console.log(`  overflows published with several grid references (first one used): ${severalRefs}`);
  console.log(`  grid references that could not be converted: ${badNgr.length}`);
  for (const b of badNgr) console.log(`    ${b}`);

  console.log('\n--- 3. Placing England overflows ---');
  const counts = { inside: 0, tidal: 0, nearest: 0, unplaced: 0 };
  const unplaced = [];
  const place = async (o, feats, layer, key) => {
    const hit = feats.find((f) => inside(f, o.easting, o.northing));
    if (hit) return { code: hit.code, name: hit.name, how: 'inside' };
    if (bfeOk[key]) {
      try { const b = await bfeQuery(layer, o.easting, o.northing); if (b) return { code: b.code, name: b.name, how: 'tidal' }; }
      catch (e) { console.log(`    ${o.site_id}: extent-of-the-realm query failed (${e.message})`); }
    }
    const nb = nearest(feats, o.easting, o.northing, NEAREST_LIMIT_M);
    if (nb) return { code: nb.feat.code, name: nb.feat.name, how: 'nearest', dist: Math.round(nb.dist) };
    return null;
  };
  const rank = { inside: 0, tidal: 1, nearest: 2 };
  for (const o of ea) {
    if (o.easting === null) { counts.unplaced++; continue; }
    const p = await place(o, pconFeats, PCON, 'constituencies');
    const l = await place(o, ladFeats, LAD, 'councils');
    const ov = PLACEMENT_OVERRIDES[o.site_id];
    if (ov && p && l) {
      const pf = pconFeats.find((f) => f.code === ov.pcon), lf = ladFeats.find((f) => f.code === ov.lad);
      if (!pf || !lf) throw new Error(`override for ${o.site_id}: code not found in ONS boundaries`);
      console.log(`  manual placement ${o.site_id} (${o.site_name}): ${p.name} / ${l.name} -> ${pf.name} / ${lf.name} (${ov.why})`);
      p.code = pf.code; p.name = pf.name; l.code = lf.code; l.name = lf.name;
    }
    if (p) { o.constituency_gss_code = p.code; o.constituency_name = p.name; }
    if (l) { o.council_gss_code = alias(l.code); o.council_name = l.name; }
    if (!p || !l) { o.placement = 'unplaced'; counts.unplaced++; unplaced.push(`${o.site_id} | ${o.company} | ${o.site_name} | ${o.ngr} | constituency ${p ? p.name : 'NONE'} | council ${l ? l.name : 'NONE'}`); continue; }
    // record the weaker of the two methods
    const worst = rank[p.how] >= rank[l.how] ? p : l;
    o.placement = worst.how;
    o.placement_distance_m = worst.how === 'nearest' ? Math.max(p.dist || 0, l.dist || 0) : null;
    counts[worst.how]++;
  }
  console.log(`  inside boundary: ${counts.inside}; below high-tide line (extent of the realm): ${counts.tidal}; nearest within ${NEAREST_LIMIT_M / 1000} km: ${counts.nearest}; unplaced: ${counts.unplaced} (includes ${badNgr.length} bad grid references)`);
  const nonEngland = ea.filter((o) => o.constituency_gss_code && !o.constituency_gss_code.startsWith('E'));
  console.log(`  overflows placed outside England: ${nonEngland.length}`);
  for (const o of nonEngland.slice(0, 40)) console.log(`    ${o.site_id} | ${o.company} | ${o.site_name} | ${o.constituency_name} / ${o.council_name}`);
  console.log(`  unplaced with a valid grid reference: ${unplaced.length}`);
  for (const u of unplaced) console.log(`    ${u}`);
  const nearestRows = ea.filter((o) => o.placement === 'nearest').sort((a, b) => b.placement_distance_m - a.placement_distance_m);
  const farRows = nearestRows.filter((o) => o.placement_distance_m > 2000);
  console.log(`  "nearest" placements more than 2 km away (all listed): ${farRows.length}`);
  for (const o of farRows) console.log(`    ${o.site_id} | ${o.company} | ${o.site_name} | ${o.ngr} | ${o.placement_distance_m} m | ${o.constituency_name} / ${o.council_name} | spills ${o.spill_count}, hours ${o.spill_hours}`);
  console.log(`  closest-to-2 km "nearest" placements within 2 km:`);
  for (const o of nearestRows.filter((x) => x.placement_distance_m <= 2000).slice(0, 5)) console.log(`    ${o.site_id} | ${o.site_name} | ${o.placement_distance_m} m | ${o.constituency_name} / ${o.council_name}`);
  const lsample = ea.filter((o) => o.latitude !== null).slice(0, 3);
  for (const o of lsample) console.log(`  lat/long sample: ${o.site_id} ${o.ngr} -> ${o.latitude}, ${o.longitude}`);

  console.log('\n--- 4. Check against the EA summary sheet ---');
  const byCo = {};
  for (const o of ea) {
    const c = (byCo[o.company] = byCo[o.company] || { n: 0, spills: 0, hours: 0 });
    c.n++; c.spills += o.spill_count || 0; c.hours += o.spill_hours || 0;
  }
  if (summaryFile) {
    const srows = XLSX.utils.sheet_to_json(XLSX.read(summaryFile.data, { type: 'buffer' }).Sheets['2025 Summary Data'], { header: 1, blankrows: false, defval: '' });
    const shi = srows.findIndex((r) => r.some((c) => /^Anglian Water/i.test(String(c).trim())));
    const sh = srows[shi].map((c) => String(c).replace(/\s+/g, ' ').trim());
    const wanted = srows.filter((r) => /storm overflows listed|number of spills|counted spills|total duration|hours/i.test(String(r[0]))).slice(0, 6);
    for (const r of wanted) console.log(`  EA summary: ${String(r[0]).replace(/\s+/g, ' ').trim()}`);
    console.log('  company | ours: overflows, spills, hours | EA summary values for the rows above');
    for (const [co, v] of Object.entries(byCo).sort()) {
      const ci = sh.findIndex((c) => c.toLowerCase().startsWith(co.toLowerCase()));
      const theirs = ci >= 0 ? wanted.map((r) => r[ci]).join(' / ') : '(company column not found)';
      console.log(`  ${co} | ${v.n}, ${v.spills}, ${Math.round(v.hours)} | ${theirs}`);
    }
    const tot = Object.values(byCo).reduce((s, v) => ({ n: s.n + v.n, spills: s.spills + v.spills, hours: s.hours + v.hours }), { n: 0, spills: 0, hours: 0 });
    const ti = sh.findIndex((c) => /water company total/i.test(c));
    console.log(`  TOTAL | ${tot.n}, ${tot.spills}, ${Math.round(tot.hours)} | ${ti >= 0 ? wanted.map((r) => r[ti]).join(' / ') : '(total column not found)'}`);
  } else console.log('  summary workbook not found in the ZIP');

  console.log('\n--- 5. NI Water workbook ---');
  const niWb = XLSX.read(await get(NI_XLSX, false), { type: 'buffer' });
  const niRows = XLSX.utils.sheet_to_json(niWb.Sheets['Summary'], { defval: '' });
  const niPcon = pconFeats.filter((f) => String(f.code).startsWith('N'));
  const niLad = ladFeats.filter((f) => String(f.code).startsWith('N'));
  const matchName = (name, feats) => {
    if (!clean(name)) return null;
    if (NI_COUNCIL_ALIASES[norm(name)]) name = NI_COUNCIL_ALIASES[norm(name)];
    return feats.find((f) => norm(f.name) === norm(name)) || feats.find((f) => wordKey(f.name) === wordKey(name)) || null;
  };
  const ni = [], niMiss = new Map();
  const years = [2023, 2024, 2025];
  const yc = (r, y, re) => { const k = Object.keys(r).find((key) => key.startsWith(String(y)) && re.test(key)); return k ? r[k] : ''; };
  for (const r of niRows) {
    const id = clean(r.CARID); if (!id) continue;
    const p = matchName(r.Constituency, niPcon), l = matchName(r['Council Area'], niLad);
    if (!p) niMiss.set(`constituency "${r.Constituency}"`, (niMiss.get(`constituency "${r.Constituency}"`) || 0) + 1);
    if (!l) niMiss.set(`council "${r['Council Area']}"`, (niMiss.get(`council "${r['Council Area']}"`) || 0) + 1);
    for (const y of years) {
      const sc = yc(r, y, /spill count/i), sd = yc(r, y, /spill duration/i), pa = yc(r, y, /availability/i);
      if (String(sc).trim() === '' && String(sd).trim() === '') continue;
      ni.push({
        source: 'NIW', site_id: id, year: y, company: 'NI Water', site_name: clean(r.Name), site_name_operator: null, permit_ref: null, asset_type: null,
        receiving_water: null, ngr: null, easting: null, northing: null, latitude: null, longitude: null,
        constituency_gss_code: p ? p.code : null, constituency_name: p ? p.name : clean(r.Constituency),
        council_gss_code: l ? alias(l.code) : null, council_name: l ? l.name : clean(r['Council Area']),
        placement: p && l ? 'source' : 'unplaced', placement_distance_m: null,
        spill_count: /not reported/i.test(String(sc)) ? null : toInt(sc), spill_hours: /not reported/i.test(String(sd)) ? null : toNum(sd),
        monitoring_pct: toNum(pa), source_url: NI_XLSX,
      });
    }
  }
  console.log(`  overflows: ${new Set(ni.map((x) => x.site_id)).size}; overflow-year rows: ${ni.length}`);
  for (const y of years) {
    const ry = ni.filter((x) => x.year === y);
    console.log(`  ${y}: ${ry.length} rows, ${ry.filter((x) => x.spill_count !== null).length} reported, ${ry.reduce((s, x) => s + (x.spill_count || 0), 0)} spills, ${Math.round(ry.reduce((s, x) => s + (x.spill_hours || 0), 0))} hours`);
  }
  console.log(`  names not matched to ONS codes: ${niMiss.size ? [...niMiss].map(([k, v]) => `${k} x${v}`).join('; ') : 'none'}`);

  console.log('\n--- 6. Totals by area ---');
  const all = [...ea, ...ni];
  const totals = new Map();
  for (const o of all) {
    if (o.placement === 'unplaced') continue;
    for (const [type, code, name] of [['constituency', o.constituency_gss_code, o.constituency_name], ['council', o.council_gss_code, o.council_name]]) {
      const k = `${type}|${code}|${o.year}`;
      const t = totals.get(k) || { area_type: type, area_gss_code: code, area_name: name, year: o.year, nation: nationOf(code), overflows: 0, overflows_with_data: 0, overflows_spilled: 0, spill_count: 0, spill_hours: 0 };
      t.overflows++;
      if (o.spill_count !== null) t.overflows_with_data++;
      if (o.spill_count > 0) t.overflows_spilled++;
      t.spill_count += o.spill_count || 0;
      t.spill_hours = Math.round((t.spill_hours + (o.spill_hours || 0)) * 100) / 100;
      totals.set(k, t);
    }
  }
  const tl = [...totals.values()];
  for (const type of ['constituency', 'council']) {
    for (const y of [...new Set(tl.map((t) => t.year))].sort()) {
      const set = tl.filter((t) => t.area_type === type && t.year === y);
      if (!set.length) continue;
      console.log(`  ${type} ${y}: ${set.length} areas (${[...new Set(set.map((t) => t.nation))].join(', ')})`);
      if (y === EA_YEAR) for (const t of set.sort((a, b) => b.spill_hours - a.spill_hours).slice(0, 10)) console.log(`    ${t.area_name}: ${Math.round(t.spill_hours)} hours, ${t.spill_count} spills, ${t.overflows} overflows`);
    }
  }

  console.log('\n--- 7. Council codes against the site\'s councils table (read-only) ---');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  if (!db) console.log('  Supabase settings not found in .env.local; check skipped');
  else {
    const { data, error } = await db.from('councils').select('gss_code, name');
    if (error) console.log(`  councils read failed: ${error.message}`);
    else {
      const codes = new Set((data || []).map((c) => c.gss_code));
      const missing = [...new Set(tl.filter((t) => t.area_type === 'council' && !codes.has(t.area_gss_code)).map((t) => `${t.area_gss_code} ${t.area_name}`))];
      console.log(`  council codes not in the councils table: ${missing.length ? missing.join('; ') : 'none'}`);
    }
  }

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }

  console.log('\n--- 8. Writing ---');
  if (!db) throw new Error('Supabase settings missing; cannot write');
  for (let i = 0; i < all.length; i += 500) {
    const { error } = await db.from('sewage_overflows').upsert(all.slice(i, i + 500).map((o) => ({ ...o, synced_at: new Date().toISOString() })), { onConflict: 'source,site_id,year' });
    if (error) throw new Error(`sewage_overflows upsert at ${i}: ${error.message}`);
  }
  console.log(`  sewage_overflows: ${all.length} rows saved`);
  // remove rows for the same source and years that are no longer in the data
  for (const [src, yrs] of [['EA', [EA_YEAR]], ['NIW', years]]) {
    const { error, count } = await db.from('sewage_overflows').delete({ count: 'exact' }).eq('source', src).in('year', yrs).lt('synced_at', runStart);
    if (error) throw new Error(`stale delete ${src}: ${error.message}`);
    console.log(`  ${src}: ${count || 0} rows no longer in the data removed`);
  }
  // Area totals are rebuilt inside the database from every overflow in every source
  // (migration 2026-10-13a), so Scotland's and England's figures never overwrite each other.
  const { data: totalRows, error: tErr } = await db.rpc('refresh_sewage_area_totals');
  if (tErr) throw new Error(`refresh_sewage_area_totals: ${tErr.message}`);
  console.log(`  sewage_area_totals: rebuilt from all sources, ${totalRows} rows`);
  // /sewage reads these summaries, not every overflow (migration 2026-10-19k)
  const { data: sumRows, error: sErr } = await db.rpc('refresh_sewage_summary');
  if (sErr) throw new Error(`refresh_sewage_summary: ${sErr.message}`);
  console.log(`  sewage summaries: rebuilt from all sources, ${sumRows} rows`);
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
