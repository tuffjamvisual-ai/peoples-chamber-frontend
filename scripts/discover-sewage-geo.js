// READ-ONLY discovery, part 2: can we place each England storm overflow in its
// Westminster constituency (July 2024 boundaries) and council using official
// ONS boundary maps, starting from the Environment Agency grid references?
// Writes NOTHING to the database or anywhere else.
//
//   1. Finds the ONS boundary services (constituencies July 2024, latest local
//      authority districts) in the ONS ArcGIS organisation and reports them.
//   2. Takes 20 overflows from the EA 2025 file, converts each grid reference
//      (e.g. SO5219438786) to easting/northing, and asks the ONS services which
//      constituency and council each point falls in.
//   3. Compares those answers with the Rivers Trust layer's constituency/council
//      for the same permit (cross-check only).
//
// Usage:
//   node scripts/discover-sewage-geo.js > sewage-geo-discovery.txt 2>&1

const zlib = require('zlib');
const XLSX = require('xlsx');

const ONS_ORG = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const EA_2025 = 'https://environment.data.gov.uk/api/file/download?fileDataSetId=c55e170e-3c75-49a5-8026-a961ff94c8e0&fileName=EDM_2025_Storm_Overflow_Annual_Return.zip';
const RT_LAYER = 'https://services3.arcgis.com/Bb8lfThdhugyc4G3/ArcGIS/rest/services/Event_Duration_Monitoring_Storm_Overflows_2025/FeatureServer/0';
const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };

async function get(url, asJson = true) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return asJson ? res.json() : Buffer.from(await res.arrayBuffer());
}

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
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

// OS grid reference (e.g. "SO 52194 38786" or "SO5219438786") -> [easting, northing]
function ngrToEN(ref) {
  const s = String(ref || '').toUpperCase().replace(/\s+/g, '');
  const m = s.match(/^([A-HJ-Z])([A-HJ-Z])(\d+)$/);
  if (!m || m[3].length % 2) return null;
  const idx = (c) => { let i = c.charCodeAt(0) - 65; if (i > 7) i--; return i; }; // skip I
  const l1 = idx(m[1]), l2 = idx(m[2]);
  const e100 = ((l1 - 2) % 5) * 5 + (l2 % 5);
  const n100 = 19 - Math.floor(l1 / 5) * 5 - Math.floor(l2 / 5);
  const half = m[3].length / 2, scale = Math.pow(10, 5 - half);
  const e = e100 * 100000 + Number(m[3].slice(0, half)) * scale;
  const n = n100 * 100000 + Number(m[3].slice(half)) * scale;
  return [e, n];
}

async function pointQuery(serviceUrl, e, n) {
  const q = `${serviceUrl}/0/query?geometry=${e},${n}&geometryType=esriGeometryPoint&inSR=27700&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
  const r = await get(q);
  return (r.features && r.features[0] && r.features[0].attributes) || null;
}

(async () => {
  console.log('=== 1. ONS boundary services ===');
  let pcon = null, lad = null;
  try {
    const dir = await get(`${ONS_ORG}?f=json`);
    const names = (dir.services || []).map((s) => s.name);
    console.log(`  ONS organisation lists ${names.length} services`);
    const pc = names.filter((x) => /Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_B/i.test(x));
    const la = names.filter((x) => /^Local_Authority_Districts_\w+_\d{4}_Boundaries_UK_B/i.test(x)).sort();
    console.log(`  constituency services: ${pc.join(' | ') || '(none found)'}`);
    console.log(`  council services (latest last): ${la.slice(-4).join(' | ') || '(none found)'}`);
    const pick = (arr) => arr.find((x) => /BGC/i.test(x)) || arr.find((x) => /BFC/i.test(x)) || arr[0];
    const svc = (name) => { const s = dir.services.find((x) => x.name === name); return s ? `${ONS_ORG}/${s.name}/${s.type}` : null; };
    pcon = pc.length ? svc(pick(pc)) : null;
    const laLatest = la.length ? la.filter((x) => x.includes(la[la.length - 1].match(/Districts_(\w+_\d{4})/)[1])) : [];
    lad = laLatest.length ? svc(pick(laLatest)) : null;
    for (const [label, url] of [['constituencies', pcon], ['councils', lad]]) {
      if (!url) continue;
      const meta = await get(`${url}/0?f=json`);
      const cnt = await get(`${url}/0/query?where=1%3D1&returnCountOnly=true&f=json`);
      console.log(`  ${label}: ${url}\n    features=${cnt.count}; fields=${(meta.fields || []).map((f) => f.name).join(', ')}; maxRecordCount=${meta.maxRecordCount}; licence/copyright=${meta.copyrightText || '(none stated)'}`);
    }
  } catch (e) { console.log('  FAILED: ' + e.message); }

  console.log('\n=== 2. Place 20 EA overflows using ONS boundaries ===');
  let sample = [];
  try {
    const xlsxFile = unzip(await get(EA_2025, false)).find((f) => /all water and sewerage companies\.xlsx$/i.test(f.name));
    const wb = XLSX.read(xlsxFile.data, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['All WaSC'], { header: 1, blankrows: false, defval: '' });
    const hi = rows.findIndex((r) => String(r[0]).trim() === 'Unique ID');
    const h = rows[hi].map((c) => String(c).replace(/\s+/g, ' ').trim());
    const col = (re) => h.findIndex((c) => re.test(c));
    const iId = 0, iCo = col(/^Water Company Name/), iSite = col(/^Site Name \(EA/), iPermit = col(/^EA Permit Reference/), iNgr = col(/^Outlet Discharge NGR/), iDur = col(/^Total Duration/), iSp = col(/^Counted spills/);
    const data = rows.slice(hi + 1).filter((r) => String(r[iNgr]).trim());
    console.log(`  EA rows with a grid reference: ${data.length} of ${rows.length - hi - 1}`);
    const bad = data.filter((r) => !ngrToEN(r[iNgr])).length;
    console.log(`  grid references that could not be converted: ${bad}`);
    // spread the sample across companies
    const step = Math.floor(data.length / 20);
    sample = Array.from({ length: 20 }, (_, k) => data[k * step]).map((r) => ({
      id: r[iId], company: r[iCo], site: r[iSite], permit: String(r[iPermit]), ngr: r[iNgr], en: ngrToEN(r[iNgr]),
      spills: r[iSp], hours: Math.round(Number(r[iDur]) * 24 * 10) / 10,
    }));
    for (const s of sample) {
      s.pcon = pcon && s.en ? await pointQuery(pcon, s.en[0], s.en[1]) : null;
      s.lad = lad && s.en ? await pointQuery(lad, s.en[0], s.en[1]) : null;
      const pName = s.pcon ? (s.pcon.PCON24NM || Object.values(s.pcon).find((v) => typeof v === 'string' && v.length > 3)) : '(none)';
      const lName = s.lad ? (Object.entries(s.lad).find(([k]) => /^LAD\d\dNM$/i.test(k)) || [, '(?)'])[1] : '(none)';
      s.pName = pName; s.lName = lName;
      console.log(`  ${s.id} | ${s.company} | ${s.ngr} -> E${s.en && s.en[0]} N${s.en && s.en[1]} | constituency: ${pName} | council: ${lName} | spills ${s.spills}, hours ${s.hours}`);
    }
  } catch (e) { console.log('  FAILED: ' + e.message); }

  console.log('\n=== 3. Cross-check with Rivers Trust layer (same permit) ===');
  let agreeP = 0, agreeL = 0, compared = 0;
  for (const s of sample) {
    try {
      const where = encodeURIComponent(`permitReferenceEA='${s.permit.replace(/'/g, "''")}'`);
      const r = await get(`${RT_LAYER}/query?where=${where}&outFields=constituencyWestminster,localAuthority,countedSpills,totalDurationAllSpillsHrs&resultRecordCount=1&f=json`);
      const a = r.features && r.features[0] && r.features[0].attributes;
      if (!a) { console.log(`  ${s.id}: not found in Rivers Trust layer`); continue; }
      compared++;
      const pOk = String(a.constituencyWestminster || '').toLowerCase() === String(s.pName || '').toLowerCase();
      const lOk = String(a.localAuthority || '').toLowerCase() === String(s.lName || '').toLowerCase();
      agreeP += pOk; agreeL += lOk;
      console.log(`  ${s.id}: RT constituency "${a.constituencyWestminster}" ${pOk ? 'MATCH' : 'DIFF'} | RT council "${a.localAuthority}" ${lOk ? 'MATCH' : 'DIFF'} | RT spills ${a.countedSpills}, hours ${a.totalDurationAllSpillsHrs}`);
    } catch (e) { console.log(`  ${s.id}: FAILED ${e.message}`); }
  }
  console.log(`  constituency agreement ${agreeP}/${compared}; council agreement ${agreeL}/${compared}`);
  console.log('\nDone. Nothing was written to the database.');
})();
