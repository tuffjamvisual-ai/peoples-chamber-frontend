// Shared helpers for the storm overflow imports (scripts/import-sewage-scotland.js).
// Copied unchanged from scripts/import-sewage.js, which keeps its own copy for
// now; both place overflows with the same ONS boundaries and the same rules.

'use strict';

const ONS = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const PCON = { code: 'PCON24CD', name: 'PCON24NM', bgc: `${ONS}/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BGC/FeatureServer/0`, bfe: `${ONS}/Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BFE/FeatureServer/0` };
const LAD = { code: 'LAD26CD', name: 'LAD26NM', bgc: `${ONS}/Local_Authority_Districts_May_2026_Boundaries_UK_BGC/FeatureServer/0`, bfe: `${ONS}/Local_Authority_Districts_May_2026_Boundaries_UK_BFE/FeatureServer/0` };
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

async function bfeQuery(layer, x, y) {
  const r = await get(`${layer.bfe}/query?geometry=${x},${y}&geometryType=esriGeometryPoint&inSR=27700&spatialRel=esriSpatialRelIntersects&outFields=${layer.code},${layer.name}&returnGeometry=false&f=json`);
  if (r.error) throw new Error(r.error.message || 'query error');
  const a = r.features && r.features[0] && r.features[0].attributes;
  return a ? { code: a[layer.code], name: a[layer.name] } : null;
}

module.exports = { ONS, PCON, LAD, get, enToLatLon, loadBoundaries, inside, segDist, nearest, bfeQuery };
