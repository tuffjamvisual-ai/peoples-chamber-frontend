// READ-ONLY discovery for Scottish Water storm overflow data. Writes NOTHING to
// the database or anywhere else.
//
// Sources (direct links found on Scottish Water's Document Hub page "Improving
// Urban Waters", 2026-10-13; listed on data.gov.uk under the Open Government
// Licence):
//   * Reported Overflow Event Data to SEPA 2021-2025 & Summary (v2, 05/08/26)
//   * Non-Reported Overflow Event Data 2022-2025 & Summary (31/08/26)
//   * Scottish Water Overflow Map Data (ArcGIS feature service; licence not
//     stated, looked at for comparison only)
//
// For each workbook: every sheet, its columns, sample rows, and for each column
// how many values are filled, numeric, or look like grid references or
// coordinates. Summary sheets are printed in full (first 60 rows). If the data
// carries grid references or eastings/northings, 20 overflows are placed in
// their constituency and council using the same ONS boundaries as England.
//
// Usage:
//   node scripts/discover-sewage-scotland.js > sewage-scotland-discovery.txt 2>&1

const XLSX = require('xlsx');

const BASE = 'https://www.scottishwater.co.uk/-/media/scottishwater/document-hub/key-publications/improving-urban-waters/cso-data/';
const FILES = [
  ['Reported to SEPA 2021-2025', BASE + 'sw-reported-overflow-event-data-to-sepa-20212025--summary--v2-050826.xlsx'],
  ['Non-reported 2022-2025', BASE + 'scottish-water-non-reported-overflow-event-data-2022-2025-and-summary--310826.xlsx'],
];
const MAP = 'https://services3.arcgis.com/SClJFeTjrkPbtMzT/arcgis/rest/services/Scottish_Water_Overflow_Map_Data/FeatureServer';
const ONS = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const PCON = `${ONS}/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BGC/FeatureServer/0`;
const LAD = `${ONS}/Local_Authority_Districts_May_2026_Boundaries_UK_BGC/FeatureServer/0`;
const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };

async function get(url, asJson = false) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return asJson ? res.json() : Buffer.from(await res.arrayBuffer());
}

const NGR_RE = /^[A-HJ-Z]{2}\s?\d{2,5}\s?\d{2,5}$/i;
function ngrToEN(ref) {
  const s = String(ref || '').toUpperCase().replace(/\s+/g, '');
  const m = s.match(/^([A-HJ-Z])([A-HJ-Z])(\d+)$/);
  if (!m || m[3].length % 2 || m[3].length > 10) return null;
  const idx = (c) => { let i = c.charCodeAt(0) - 65; if (i > 7) i--; return i; };
  const l1 = idx(m[1]), l2 = idx(m[2]);
  const e100 = ((l1 - 2) % 5) * 5 + (l2 % 5);
  const n100 = 19 - Math.floor(l1 / 5) * 5 - Math.floor(l2 / 5);
  const half = m[3].length / 2, scale = Math.pow(10, 5 - half);
  return [e100 * 100000 + Number(m[3].slice(0, half)) * scale, n100 * 100000 + Number(m[3].slice(half)) * scale];
}

async function pointQuery(layer, x, y, inSR) {
  const r = await get(`${layer}/query?geometry=${x},${y}&geometryType=esriGeometryPoint&inSR=${inSR}&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`, true);
  return (r.features && r.features[0] && r.features[0].attributes) || null;
}

function describeColumn(name, values) {
  const filled = values.filter((v) => String(v).trim() !== '');
  const numeric = filled.filter((v) => typeof v === 'number' || /^-?\d+(\.\d+)?$/.test(String(v).trim()));
  const ngr = filled.filter((v) => NGR_RE.test(String(v).trim()));
  const distinct = [...new Set(filled.map((v) => String(v).trim()))];
  const nums = numeric.map(Number);
  const range = nums.length ? ` range ${Math.min(...nums)}..${Math.max(...nums)}` : '';
  return `      [${name}] filled ${filled.length}/${values.length}, numeric ${numeric.length}${ngr.length ? `, grid refs ${ngr.length}` : ''}, distinct ${distinct.length}${range}; e.g. ${distinct.slice(0, 5).map((v) => JSON.stringify(v.slice(0, 50))).join(', ')}`;
}

(async () => {
  const placeable = [];

  for (const [label, url] of FILES) {
    console.log(`\n=== ${label} ===\n  ${url}`);
    let wb;
    try {
      const buf = await get(url);
      wb = XLSX.read(buf, { type: 'buffer' });
      console.log(`  ${(buf.length / 1e6).toFixed(1)} MB; ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(' | ')}`);
    } catch (e) { console.log('  FAILED: ' + e.message); continue; }

    for (const s of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
      console.log(`\n  --- sheet "${s}": ${rows.length} rows`);
      if (/summary|read ?me|notes|guidance|contents/i.test(s) || rows.length <= 60) {
        for (const r of rows.slice(0, 60)) console.log('    | ' + r.map((c) => String(c).replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 400));
        if (rows.length <= 60) continue;
      }
      const hi = rows.findIndex((r) => r.filter((c) => String(c).trim() !== '').length >= 4);
      if (hi < 0) { console.log('    (no header row found)'); continue; }
      const header = rows[hi].map((c) => String(c).replace(/\s+/g, ' ').trim());
      const data = rows.slice(hi + 1);
      console.log(`    header at row ${hi + 1}; ${data.length} data rows`);
      for (const r of data.slice(0, 3)) console.log('    row: ' + r.map((c) => String(c).replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 500));
      const sample = data.length > 20000 ? data.filter((_, i) => i % Math.ceil(data.length / 20000) === 0) : data;
      header.forEach((h, i) => { if (h) console.log(describeColumn(h, sample.map((r) => r[i] ?? ''))); });

      // anything we can place on a map?
      const ngrCol = header.findIndex((h, i) => h && sample.filter((r) => NGR_RE.test(String(r[i] ?? '').trim())).length > sample.length * 0.5);
      const eCol = header.findIndex((h) => /^easting|x[_ ]?coord|^x$/i.test(h));
      const nCol = header.findIndex((h) => /^northing|y[_ ]?coord|^y$/i.test(h));
      const latCol = header.findIndex((h) => /^lat/i.test(h));
      const lonCol = header.findIndex((h) => /^lon|^lng/i.test(h));
      const idCol = header.findIndex((h) => /id|reference|ref\b|asset/i.test(h));
      const nameCol = header.findIndex((h) => /name|site|location/i.test(h));
      const loc = ngrCol >= 0 ? 'grid reference' : eCol >= 0 && nCol >= 0 ? 'easting/northing' : latCol >= 0 && lonCol >= 0 ? 'lat/long' : null;
      console.log(`    location columns: ${loc ? `${loc} (${[ngrCol, eCol, nCol, latCol, lonCol].filter((i) => i >= 0).map((i) => header[i]).join(', ')})` : 'none found'}`);
      if (loc && placeable.length < 20) {
        const step = Math.max(1, Math.floor(data.length / 20));
        for (let i = 0; i < data.length && placeable.length < 20; i += step) {
          const r = data[i];
          let pt = null;
          if (ngrCol >= 0) { const en = ngrToEN(r[ngrCol]); if (en) pt = { x: en[0], y: en[1], sr: 27700, raw: r[ngrCol] }; }
          else if (eCol >= 0) { const x = Number(r[eCol]), y = Number(r[nCol]); if (x && y) pt = { x, y, sr: 27700, raw: `${x},${y}` }; }
          else { const y = Number(r[latCol]), x = Number(r[lonCol]); if (x && y) pt = { x, y, sr: 4326, raw: `${y},${x}` }; }
          if (pt) placeable.push({ sheet: s, id: idCol >= 0 ? r[idCol] : '', name: nameCol >= 0 ? r[nameCol] : '', ...pt });
        }
      }
    }
  }

  console.log('\n=== Placing up to 20 overflows with ONS boundaries ===');
  if (!placeable.length) console.log('  no location columns found in the workbooks');
  for (const p of placeable) {
    try {
      const pc = await pointQuery(PCON, p.x, p.y, p.sr);
      const la = await pointQuery(LAD, p.x, p.y, p.sr);
      console.log(`  ${p.sheet} | ${p.id} | ${p.name} | ${p.raw} -> constituency ${pc ? pc.PCON24NM : '(none)'} | council ${la ? la.LAD26NM : '(none)'}`);
    } catch (e) { console.log(`  ${p.id}: FAILED ${e.message}`); }
  }

  console.log('\n=== Scottish Water overflow map service (comparison only) ===');
  try {
    const svc = await get(`${MAP}?f=json`, true);
    console.log(`  layers: ${(svc.layers || []).map((l) => `${l.id}:${l.name}`).join(' | ')}; copyright: ${svc.copyrightText || '(none stated)'}`);
    for (const l of (svc.layers || []).slice(0, 4)) {
      const meta = await get(`${MAP}/${l.id}?f=json`, true);
      const cnt = await get(`${MAP}/${l.id}/query?where=1%3D1&returnCountOnly=true&f=json`, true);
      console.log(`  layer ${l.id} "${l.name}": ${cnt.count} features; fields: ${(meta.fields || []).map((f) => f.name).join(', ')}`);
      const s = await get(`${MAP}/${l.id}/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=2&f=json`, true);
      for (const f of s.features || []) console.log('    sample: ' + JSON.stringify(f.attributes).slice(0, 600));
    }
  } catch (e) { console.log('  FAILED: ' + e.message); }

  console.log('\nDone. Nothing was written to the database.');
})();
