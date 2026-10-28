// READ-ONLY discovery for an overall council league table (graded like schools).
// Writes NOTHING to the database or anywhere else.
//
//   1. What we already hold: for each council table, its columns, the council
//      code column, how many councils have figures, by council type and nation,
//      and the latest period.
//   2. The official rating sources, checked before anything relies on them:
//      download links, file types, dates and licence statements.
//        a. Ofsted inspections of council children's services
//           ("Local authority inspection outcomes", GOV.UK statistics)
//        b. CQC assessments of council adult social care (cqc.org.uk)
//        c. Local Government and Social Care Ombudsman decisions by council (lgo.org.uk)
//        d. Planning decision speed (MHCLG live tables P151 / P153)
//        e. Household recycling rate (Defra local authority collected waste, ENV18)
//
// Usage:
//   node scripts/discover-council-ratings.js > council-ratings-discovery.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };
const TABLES = [
  'council_homelessness', 'school_inspections', 'council_road_casualties', 'council_public_health_metrics',
  'council_service_spending', 'council_claimant_count', 'council_child_poverty', 'council_fuel_poverty',
  'council_house_prices', 'council_crime_stats', 'council_broadband', 'council_mobile_coverage',
  'welfare_local_authority_summary', 'sewage_area_totals',
];
const CODE_COLS = ['council_gss_code', 'gss_code', 'la_code', 'local_authority_code', 'area_gss_code', 'lad_code', 'council_code', 'la_gss_code'];
const PERIOD_COLS = ['year', 'data_month', 'period_label', 'financial_year', 'period', 'snapshot_date', 'quarter_end', 'month', 'release_label', 'inspection_date', 'published_date'];

async function get(url, asJson = false) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return asJson ? res.json() : res.text();
}

// GOV.UK: search, then list a document's attachments.
async function govukSearch(q, extra = '') {
  const r = await get(`https://www.gov.uk/api/search.json?q=${encodeURIComponent(q)}&count=8&order=-public_timestamp&fields=title,link,public_timestamp,format${extra}`, true);
  return r.results || [];
}
async function govukAttachments(path) {
  const r = await get(`https://www.gov.uk/api/content${path}`, true);
  const atts = (r.details && (r.details.attachments || [])) || [];
  const docs = (r.details && r.details.documents) || [];
  const fromDocs = docs.join(' ').match(/https:\/\/assets\.publishing\.service\.gov\.uk\/[^"' ]+/g) || [];
  return {
    title: r.title, updated: r.public_updated_at, first: r.first_published_at,
    attachments: atts.map((a) => ({ title: a.title, url: a.url, type: a.content_type || a.file_type || '' })),
    docLinks: [...new Set(fromDocs)],
    licence: /open government licence/i.test(JSON.stringify(r)) ? 'mentions Open Government Licence' : '(GOV.UK content is OGL by default unless stated)',
  };
}
function links(html, base, re) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const u = m[1].startsWith('http') ? m[1] : new URL(m[1], base).href;
    if (re.test(u)) out.add(u.replace(/&amp;/g, '&'));
  }
  return [...out];
}

async function section(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { console.log(`  FAILED: ${e.message}`); }
}

(async () => {
  await section('1. Council tables we already hold', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) { console.log('  Supabase settings not found in .env.local'); return; }
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: councils } = await db.from('councils').select('gss_code, type, country').limit(1000);
    const byCode = new Map((councils || []).map((c) => [c.gss_code, c]));
    const groups = {};
    for (const c of councils || []) { const k = `${c.country}/${c.type}`; groups[k] = (groups[k] || 0) + 1; }
    console.log(`  councils table: ${councils ? councils.length : 0} rows; ${Object.entries(groups).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    for (const t of TABLES) {
      const { data: one, error } = await db.from(t).select('*').limit(1);
      if (error) { console.log(`  ${t}: FAILED ${error.message}`); continue; }
      if (!one || !one.length) { console.log(`  ${t}: empty`); continue; }
      const cols = Object.keys(one[0]);
      const codeCol = CODE_COLS.find((c) => cols.includes(c));
      const periodCol = PERIOD_COLS.find((c) => cols.includes(c));
      const { count } = await db.from(t).select('*', { count: 'exact', head: true });
      console.log(`\n  ${t}: ${count} rows; code column ${codeCol || '(none)'}; period column ${periodCol || '(none)'}`);
      console.log(`    columns: ${cols.join(', ')}`);
      if (!codeCol) continue;
      const codes = new Map();
      for (let from = 0; ; from += 1000) {
        const { data, error: e } = await db.from(t).select(periodCol ? `${codeCol}, ${periodCol}` : codeCol).range(from, from + 999);
        if (e) { console.log(`    read FAILED ${e.message}`); break; }
        for (const r of data) { const p = periodCol ? String(r[periodCol]) : ''; const cur = codes.get(r[codeCol]); if (!cur || p > cur) codes.set(r[codeCol], p); }
        if (data.length < 1000 || from > 200000) break;
      }
      const latest = [...codes.values()].sort().pop();
      const atLatest = [...codes.entries()].filter(([, p]) => p === latest).map(([c]) => c);
      const tally = {};
      for (const c of atLatest) { const m = byCode.get(c); const k = m ? `${m.country}/${m.type}` : `not in councils (${String(c).slice(0, 3)})`; tally[k] = (tally[k] || 0) + 1; }
      console.log(`    councils with any figures: ${codes.size}; latest period ${latest}: ${atLatest.length} councils -> ${Object.entries(tally).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
      if (t === 'council_public_health_metrics' || t === 'council_service_spending') {
        const keyCol = cols.includes('metric_key') ? 'metric_key' : cols.includes('service_category') ? 'service_category' : null;
        if (keyCol) {
          const { data } = await db.from(t).select(keyCol).limit(5000);
          const ks = {}; for (const r of data || []) ks[r[keyCol]] = (ks[r[keyCol]] || 0) + 1;
          console.log(`    ${keyCol} values: ${Object.entries(ks).map(([k, v]) => `${k} (${v})`).join('; ').slice(0, 1500)}`);
        }
      }
    }
  });

  await section('2a. Ofsted: local authority (children\'s services) inspection outcomes', async () => {
    const res = await govukSearch('local authority inspection outcomes', '&filter_organisations=ofsted');
    for (const r of res.slice(0, 6)) console.log(`  search: ${r.public_timestamp} | ${r.title} | ${r.link}`);
    const latest = res.find((r) => /local authority inspection outcomes as at/i.test(r.title));
    if (!latest) { console.log('  no "local authority inspection outcomes as at ..." publication found'); return; }
    const a = await govukAttachments(latest.link);
    console.log(`  latest: ${a.title} (updated ${a.updated}); ${a.licence}`);
    for (const x of a.attachments) console.log(`    attachment: ${x.title} | ${x.type} | ${x.url}`);
  });

  await section('2b. CQC: local authority assessments (adult social care)', async () => {
    for (const page of ['https://www.cqc.org.uk/local-systems/local-authorities', 'https://www.cqc.org.uk/about-us/transparency/using-cqc-data']) {
      try {
        const html = await get(page);
        const title = (html.match(/<title>([^<]+)/) || [])[1];
        console.log(`  ${page}: ${title ? title.trim() : '(no title)'}; ${html.length} bytes`);
        for (const l of links(html, page, /\.(csv|xlsx|ods|zip)(\?|$)|api\.|download|data/i).slice(0, 25)) console.log(`    link: ${l}`);
        const ratings = html.match(/(Outstanding|Good|Requires improvement|Inadequate)/g) || [];
        console.log(`    rating words on page: ${ratings.length}`);
        if (/open government licence/i.test(html)) console.log('    page mentions the Open Government Licence');
      } catch (e) { console.log(`  ${page}: FAILED ${e.message}`); }
    }
  });

  await section('2c. Local Government and Social Care Ombudsman: decisions by council', async () => {
    for (const page of ['https://www.lgo.org.uk/your-councils-performance', 'https://www.lgo.org.uk/information-centre/reports/annual-review-reports']) {
      try {
        const html = await get(page);
        const title = (html.match(/<title>([^<]+)/) || [])[1];
        console.log(`  ${page}: ${title ? title.trim() : '(no title)'}; ${html.length} bytes`);
        for (const l of links(html, page, /\.(csv|xlsx|xls|ods|zip)(\?|$)|data|download|statistics/i).slice(0, 25)) console.log(`    link: ${l}`);
        if (/open government licence/i.test(html)) console.log('    page mentions the Open Government Licence');
      } catch (e) { console.log(`  ${page}: FAILED ${e.message}`); }
    }
  });

  await section('2d. MHCLG planning application statistics (P151 major, P153 non-major)', async () => {
    const a = await govukAttachments('/government/statistical-data-sets/live-tables-on-planning-application-statistics');
    console.log(`  ${a.title} (updated ${a.updated}); ${a.licence}`);
    for (const x of a.attachments.filter((x) => /P15[1-4]|P1\d\d/i.test(x.title + x.url))) console.log(`    attachment: ${x.title} | ${x.type} | ${x.url}`);
    for (const l of a.docLinks.filter((u) => /p15[1-4]/i.test(u))) console.log(`    link: ${l}`);
    try {
      const b = await govukAttachments('/government/statistical-data-sets/local-planning-authority-performance-tables');
      console.log(`  ${b.title} (updated ${b.updated})`);
      for (const x of b.attachments.slice(0, 12)) console.log(`    attachment: ${x.title} | ${x.type} | ${x.url}`);
    } catch (e) { console.log(`  performance tables: FAILED ${e.message}`); }
  });

  await section('2e. Defra local authority collected waste (household recycling rate)', async () => {
    const res = await govukSearch('ENV18 local authority collected waste annual results tables', '&filter_organisations=department-for-environment-food-rural-affairs');
    for (const r of res.slice(0, 6)) console.log(`  search: ${r.public_timestamp} | ${r.title} | ${r.link}`);
    for (const path of ['/government/statistical-data-sets/env18-local-authority-collected-waste-annual-results-tables', ...res.filter((r) => /ENV18|annual results tables/i.test(r.title)).map((r) => r.link)].slice(0, 2)) {
      try {
        const a = await govukAttachments(path);
        console.log(`  ${a.title} (updated ${a.updated}); ${a.licence}`);
        for (const x of a.attachments.slice(0, 12)) console.log(`    attachment: ${x.title} | ${x.type} | ${x.url}`);
      } catch (e) { console.log(`  ${path}: FAILED ${e.message}`); }
    }
  });

  console.log('\nDone. Nothing was written to the database.');
})();
