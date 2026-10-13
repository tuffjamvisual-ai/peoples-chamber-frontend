// READ-ONLY discovery for storm overflow (sewage spill) data across the UK.
// Downloads and inspects, and writes NOTHING to the database or anywhere else:
//   1. Environment Agency (England) EDM annual return 2025 + long-term trends ZIPs
//   2. Rivers Trust England & Wales 2025 layer (ArcGIS) - only to compare figures and see its fields
//   3. Scottish Water overflow event data (via data.gov.uk / CKAN)
//   4. NI Water Event Duration Monitor spreadsheet (August 2026)
//   5. postcodes.io reverse lookup (lat/long -> Westminster constituency + council), one test call
//
// Usage:
//   node scripts/discover-sewage.js > sewage-discovery.txt 2>&1

const zlib = require('zlib');
const XLSX = require('xlsx');

const EA_BASE = 'https://environment.data.gov.uk/api/file/download?fileDataSetId=c55e170e-3c75-49a5-8026-a961ff94c8e0&fileName=';
const EA_2025 = EA_BASE + 'EDM_2025_Storm_Overflow_Annual_Return.zip';
const EA_TRENDS = EA_BASE + encodeURIComponent('EDM Storm Overflow Annual Return - Long-term Trends.zip');
const RT_LAYER = 'https://services3.arcgis.com/Bb8lfThdhugyc4G3/ArcGIS/rest/services/Event_Duration_Monitoring_Storm_Overflows_2025/FeatureServer/0';
const CKAN = 'https://ckan.publishing.service.gov.uk/api/action/package_search?q=' + encodeURIComponent('"Scottish Water" overflow event data') + '&rows=10';
const NI_XLSX = 'https://www.niwater.com/media/3mwndn2k/event-duration-monitor-data-august-2026.xlsx';
const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };

async function get(url, asJson = false) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return asJson ? res.json() : Buffer.from(await res.arrayBuffer());
}

// Minimal ZIP reader (central directory, deflate/stored) returning Buffers.
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  const out = [];
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

function describeWorkbook(label, buf, maxSheets = 20) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  console.log(`  ${label}: ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(' | ')}`);
  for (const s of wb.SheetNames.slice(0, maxSheets)) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
    // header = first row with 4+ non-empty cells
    const hi = rows.findIndex((r) => r.filter((c) => String(c).trim() !== '').length >= 4);
    const header = hi >= 0 ? rows[hi].map((c) => String(c).trim()) : [];
    console.log(`    - "${s}": ${rows.length} rows; header at row ${hi + 1}`);
    if (header.length) console.log(`      columns: ${header.filter(Boolean).join(' | ').slice(0, 1500)}`);
    if (hi >= 0 && rows[hi + 1]) console.log(`      first data row: ${rows[hi + 1].map(String).join(' | ').slice(0, 600)}`);
  }
  return wb;
}

async function step(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { console.log(`  FAILED: ${e.message}`); }
}

(async () => {
  let eaTotals = null;

  await step('1a. Environment Agency EDM annual return 2025 (England)', async () => {
    const zip = await get(EA_2025);
    const files = unzip(zip);
    console.log(`  ZIP ${(zip.length / 1e6).toFixed(1)} MB, ${files.length} files: ${files.map((f) => f.name).join(' | ')}`);
    for (const f of files) {
      if (/\.xlsx?$/i.test(f.name)) {
        const wb = describeWorkbook(f.name, f.data);
        // Try to total counted spills and hours per company sheet
        eaTotals = {};
        for (const s of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
          const hi = rows.findIndex((r) => r.some((c) => /counted spills|spill count/i.test(String(c))));
          if (hi < 0) continue;
          const h = rows[hi].map((c) => String(c).toLowerCase());
          const ci = h.findIndex((c) => /counted spills|spill count/.test(c));
          const di = h.findIndex((c) => /total duration|duration.*hrs|hours/.test(c));
          let spills = 0, hours = 0, n = 0;
          for (const r of rows.slice(hi + 1)) { const v = Number(r[ci]); if (!Number.isNaN(v) && String(r[ci]).trim() !== '') { spills += v; n++; hours += Number(r[di]) || 0; } }
          eaTotals[s] = { overflows: n, spills, hours: Math.round(hours) };
        }
        console.log('  Totals by sheet (rows with a spill count):'); console.log('  ' + JSON.stringify(eaTotals));
      } else if (/readme|\.txt|\.pdf|\.docx/i.test(f.name)) {
        console.log(`  (document) ${f.name}: ${f.data.length} bytes`);
      }
    }
  });

  await step('1b. Environment Agency long-term trends 2016-2025', async () => {
    const files = unzip(await get(EA_TRENDS));
    console.log(`  ${files.length} files: ${files.map((f) => f.name).join(' | ')}`);
    for (const f of files) if (/\.xlsx?$/i.test(f.name)) describeWorkbook(f.name, f.data, 6);
  });

  await step('2. Rivers Trust England & Wales 2025 layer (comparison only)', async () => {
    const meta = await get(RT_LAYER + '?f=json', true);
    console.log(`  name: ${meta.name}; copyright: ${meta.copyrightText || '(none)'}; maxRecordCount: ${meta.maxRecordCount}`);
    const cnt = await get(RT_LAYER + '/query?where=1%3D1&returnCountOnly=true&f=json', true);
    console.log(`  total features: ${cnt.count}`);
    const stats = await get(RT_LAYER + '/query?where=1%3D1&groupByFieldsForStatistics=waterCompanyName,country&outStatistics=' +
      encodeURIComponent(JSON.stringify([
        { statisticType: 'count', onStatisticField: 'OBJECTID', outStatisticFieldName: 'n' },
        { statisticType: 'sum', onStatisticField: 'countedSpills', outStatisticFieldName: 'spills' },
        { statisticType: 'sum', onStatisticField: 'totalDurationAllSpillsHrs', outStatisticFieldName: 'hours' },
      ])) + '&f=json', true);
    for (const f of stats.features || []) console.log(`  ${f.attributes.country} | ${f.attributes.waterCompanyName}: ${f.attributes.n} overflows, ${f.attributes.spills} spills, ${Math.round(f.attributes.hours)} hours`);
    const sample = await get(RT_LAYER + '/query?where=1%3D1&outFields=waterCompanyName,siteNameEA,permitReferenceEA,outletDischargeNGRoriginal,Latitude,Longitude,constituencyWestminster,localAuthority,countedSpills,totalDurationAllSpillsHrs,edmOperationPercent,riversTrustErrorFlag&resultRecordCount=2&f=json', true);
    for (const f of sample.features || []) console.log('  sample: ' + JSON.stringify(f.attributes));
  });

  await step('3. Scottish Water overflow event data (data.gov.uk)', async () => {
    const r = await get(CKAN, true);
    for (const pkg of r.result.results || []) {
      console.log(`  dataset: ${pkg.title} | licence: ${pkg.license_title || pkg.license_id} | modified: ${pkg.metadata_modified}`);
      for (const res of pkg.resources || []) console.log(`    resource: ${res.name || ''} | ${res.format} | ${res.url}`);
    }
    // Inspect the first spreadsheet/CSV resource of the newest dataset
    const pkgs = (r.result.results || []).sort((a, b) => (b.metadata_modified || '').localeCompare(a.metadata_modified || ''));
    for (const pkg of pkgs.slice(0, 2)) {
      const res = (pkg.resources || []).find((x) => /xlsx?|csv/i.test(x.format || x.url));
      if (!res) { console.log(`  (no spreadsheet resource in ${pkg.title})`); continue; }
      const buf = await get(res.url);
      if (/csv/i.test(res.format || res.url)) {
        const lines = buf.toString('utf8').split(/\r?\n/);
        console.log(`  CSV ${res.url}: ${lines.length} lines\n    header: ${lines[0].slice(0, 800)}\n    row1: ${(lines[1] || '').slice(0, 400)}`);
      } else describeWorkbook(res.url, buf, 8);
    }
  });

  await step('4. NI Water Event Duration Monitor data (August 2026)', async () => {
    describeWorkbook('NI Water EDM xlsx', await get(NI_XLSX), 8);
  });

  await step('5. postcodes.io reverse lookup test (central Oxford)', async () => {
    const r = await get('https://api.postcodes.io/postcodes?lon=-1.2577&lat=51.752&limit=1', true);
    const p = r.result && r.result[0];
    console.log(p ? `  ${p.postcode}: constituency=${p.parliamentary_constituency} (${p.codes && p.codes.parliamentary_constituency}); 2024 field=${p.parliamentary_constituency_2024 || '(none)'}; council=${p.admin_district} (${p.codes && p.codes.admin_district}); country=${p.country}` : '  no result');
  });

  console.log('\nDone. Nothing was written to the database.');
})();
