// READ-ONLY discovery for Ofsted "State-funded schools inspections and
// outcomes as at 31 March 2026" (most recent inspection for every open
// state school in England). Prints every column, value counts for the
// judgement columns, and matches Ofsted's local authority names to the
// councils table. Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-school-inspections.js > schools-discovery.txt 2>&1

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://assets.publishing.service.gov.uk/media/6a3502ec0bea238415c9a2ab/State-funded_schools_inspections_and_outcomes_as_at_31_March_2026.csv';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'); process.exit(1); }
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// RFC 4180 parser (quoted fields may contain commas, quotes and newlines).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const norm = (s) => String(s ?? '').toLowerCase()
  .replace(/&/g, 'and').replace(/,? city of$|,? county of$/g, '')
  .replace(/\b(city|borough|district|county|metropolitan|royal|london|council|of|the)\b/g, '')
  .replace(/[^a-z]/g, '');

async function main() {
  const { data: councils, error } = await db.from('councils').select('gss_code, name, short_name, type, country');
  if (error) throw new Error(`councils read: ${error.message}`);
  const english = councils.filter((c) => c.gss_code?.startsWith('E'));
  const topTier = english.filter((c) => c.type !== 'district');
  console.log(`COUNCILS: English ${english.length}; English non-district ${topTier.length} (types: ${[...new Set(topTier.map((c) => c.type))].join(', ')})`);

  const res = await fetch(URL, { headers: UA });
  console.log(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`${(buf.length / 1e6).toFixed(1)} MB; starts with BOM: ${buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf}`);
  let text = buf.toString('utf8');
  const bad = (text.match(/�/g) || []).length;
  console.log(`UTF-8 replacement characters: ${bad}${bad ? ' (file may be Windows-1252)' : ''}`);
  if (bad) text = buf.toString('latin1');
  text = text.replace(/^﻿/, '');

  const rows = parseCsv(text).filter((r) => r.length > 1);
  const header = rows[0].map((h) => h.trim());
  const data = rows.slice(1);
  console.log(`\nCOLUMNS (${header.length}):`);
  header.forEach((h, i) => console.log(`  ${i}: ${h}`));
  console.log(`\nROWS: ${data.length.toLocaleString()}; rows with a different column count: ${data.filter((r) => r.length !== header.length).length}`);

  // Value counts for categorical columns.
  const SKIP = /web link|^urn|laestab|school name|postcode|uid|trust name|sponsor name|number of pupils|inspection number|date|age$/i;
  console.log('\nVALUE COUNTS (top 15 per column):');
  header.forEach((h, i) => {
    if (SKIP.test(h)) return;
    const m = new Map();
    for (const r of data) { const v = (r[i] ?? '').trim() || '(blank)'; m.set(v, (m.get(v) || 0) + 1); }
    if (m.size > 400) { console.log(`  [${i}] ${h}: ${m.size} distinct values`); return; }
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([v, n]) => `${v}=${n}`).join(' | ');
    console.log(`  [${i}] ${h} (${m.size} distinct): ${top}`);
  });

  // Inspection start date range, by inspection type grouping.
  const iDate = header.indexOf('Inspection start date');
  const iType = header.indexOf('Inspection type grouping');
  if (iDate >= 0) {
    const toIso = (s) => { const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
    const byType = new Map();
    for (const r of data) {
      const d = toIso(r[iDate]); if (!d) continue;
      const t = (r[iType] ?? '').trim();
      const e = byType.get(t) || { n: 0, min: d, max: d, renewed: 0 };
      e.n++; if (d < e.min) e.min = d; if (d > e.max) e.max = d; if (d >= '2025-11-10') e.renewed++;
      byType.set(t, e);
    }
    console.log('\nLATEST INSPECTION DATES by type grouping:');
    for (const [t, e] of byType) console.log(`  ${t || '(blank)'}: ${e.n} schools, ${e.min} to ${e.max}; on/after 10 Nov 2025: ${e.renewed}`);
  }

  // Local authority names vs councils.
  const iLA = header.indexOf('Local authority');
  const laCounts = new Map();
  for (const r of data) { const v = (r[iLA] ?? '').trim(); laCounts.set(v, (laCounts.get(v) || 0) + 1); }
  console.log(`\nLOCAL AUTHORITY NAMES: ${laCounts.size}`);
  const byNorm = new Map();
  for (const c of topTier) {
    for (const n of [c.name, c.short_name].filter(Boolean)) {
      const k = norm(n);
      if (!byNorm.has(k)) byNorm.set(k, []);
      if (!byNorm.get(k).includes(c)) byNorm.get(k).push(c);
    }
  }
  const matched = new Set();
  const problems = [];
  for (const [la, n] of [...laCounts.entries()].sort()) {
    const hits = byNorm.get(norm(la)) || [];
    if (hits.length === 1) { matched.add(hits[0].gss_code); console.log(`  OK    ${la} (${n} schools) -> ${hits[0].gss_code} ${hits[0].name} [${hits[0].type}]`); }
    else { problems.push(la); console.log(`  ${hits.length ? 'AMBIG' : 'NONE '} ${la} (${n} schools)${hits.length ? ' -> ' + hits.map((h) => `${h.gss_code} ${h.name}`).join(' / ') : ''}`); }
  }
  const unmatchedCouncils = topTier.filter((c) => !matched.has(c.gss_code));
  console.log(`\nmatched ${matched.size} councils; LA names not matched: ${problems.length}`);
  console.log(`English non-district councils with no LA name matched (${unmatchedCouncils.length}): ${unmatchedCouncils.map((c) => `${c.gss_code} ${c.name} [${c.type}]`).join('; ')}`);

  // Constituency column sanity.
  const iPC = header.indexOf('Parliamentary constituency');
  if (iPC >= 0) console.log(`\nconstituency names: ${new Set(data.map((r) => (r[iPC] ?? '').trim())).size}`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
