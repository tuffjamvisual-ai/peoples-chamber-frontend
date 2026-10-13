// READ-ONLY test: can CQC adult social care grades and Ombudsman complaint figures
// be read reliably from each council's own page? Reads 10 councils from each site,
// one request at a time with a pause, and writes NOTHING anywhere.
//
//   CQC: council assessment reports live at
//     https://www.cqc.org.uk/care-services/local-authority-assessment-reports/<slug>
//     (CQC's search pages are disallowed by its robots.txt, so the address is built
//     from the council's name and a few variations are tried).
//   Ombudsman: each council's statistics page, linked from the Ombudsman's own map
//     data files (/jsonFiles/countycouncils.json, noncountycouncils.json). Re-use is
//     permitted with acknowledgement (lgo.org.uk/copyright).
//
// Usage:
//   node scripts/discover-council-ratings-pages.js > council-ratings-pages.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only; contact@opengovt.uk)' };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  return { status: res.status, url: res.url, text: res.ok ? await res.text() : '' };
}
const plain = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const slug = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SAMPLE = ['Barnsley', 'Bedford', 'Kent', 'Leeds', 'Camden', 'Cornwall', 'Norfolk', 'Birmingham', 'Wiltshire', 'Hackney'];

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: cs } = await db.from('councils').select('gss_code, name, short_name, type').limit(1000);
  const pick = SAMPLE.map((s) => (cs || []).find((c) => c.short_name === s || c.name.startsWith(s))).filter(Boolean);

  console.log('=== CQC council assessment pages ===');
  let found = 0;
  for (const c of pick) {
    const base = 'https://www.cqc.org.uk/care-services/local-authority-assessment-reports/';
    const names = [...new Set([c.short_name, c.name, c.name.replace(/\b(Metropolitan Borough|Borough|City|County|District) Council\b/i, 'Council'), c.name.replace(/\s*(Metropolitan Borough|Borough|City|County|District)?\s*Council$/i, '')].filter(Boolean))];
    const candidates = [...new Set(names.flatMap((n) => [slug(n), `${slug(n)}-council`, slug(n).replace(/-council$/, '')]))];
    let hit = null;
    for (const cand of candidates) {
      const r = await fetchText(base + cand);
      await pause(800);
      if (r.status === 200 && /Latest assessment published/i.test(r.text)) { hit = { cand, r }; break; }
    }
    if (!hit) { console.log(`  ${c.name}: NOT FOUND (tried ${candidates.join(', ')})`); continue; }
    found++;
    const t = plain(hit.r.text);
    const pub = (t.match(/Latest assessment published:\s*([0-9]{1,2} [A-Za-z]+ [0-9]{4})/) || [])[1];
    const i = t.search(/Latest assessment published/i);
    const after = t.slice(i, i + 400);
    const grade = (after.match(/\b(Outstanding|Good|Requires improvement|Inadequate)\b/) || [])[1];
    const scores = [...t.matchAll(/([A-Z][A-Za-z ,'-]{5,60}?)\s+Score:\s*([1-4])/g)].map((m) => `${m[1].trim()}=${m[2]}`);
    console.log(`  ${c.name}: ${hit.cand} | grade ${grade || '?'} | published ${pub || '?'} | ${scores.length} scores: ${scores.slice(0, 9).join('; ')}`);
  }
  console.log(`  found ${found} of ${pick.length}`);

  console.log('\n=== Ombudsman council statistics pages ===');
  const links = new Map();
  for (const f of ['countycouncils.json', 'noncountycouncils.json']) {
    const r = await fetch(`https://www.lgo.org.uk/jsonFiles/${f}`, { headers: UA });
    const j = await r.json();
    for (const feat of j.features || []) {
      const p = feat.properties || {};
      const href = ((p.archivedStatisticsLink || '').match(/href='([^']+)'/) || [])[1];
      if (href) links.set(p.Name, href);
    }
  }
  console.log(`  councils with a statistics link: ${links.size}`);
  let ok = 0;
  for (const c of pick) {
    const entry = [...links.entries()].find(([n]) => n === c.name) || [...links.entries()].find(([n]) => n.toLowerCase().startsWith((c.short_name || c.name).toLowerCase()));
    if (!entry) { console.log(`  ${c.name}: no link in the Ombudsman's files`); continue; }
    const r = await fetchText(`https://www.lgo.org.uk${entry[1]}`);
    await pause(800);
    if (r.status !== 200) { console.log(`  ${c.name}: ${entry[1]} -> HTTP ${r.status}`); continue; }
    ok++;
    const t = plain(r.text);
    const i = t.search(/upheld/i);
    const years = [...new Set((t.match(/\b20\d\d-\d\d\b/g) || []))].slice(0, 6);
    console.log(`  ${c.name} (${entry[0]}): ${entry[1]} | years seen: ${years.join(', ')}`);
    console.log(`    text: ${i >= 0 ? t.slice(Math.max(0, i - 400), i + 600) : '(no "upheld")'}`);
  }
  console.log(`  read ${ok} of ${pick.length}`);
  console.log('\nDone. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
