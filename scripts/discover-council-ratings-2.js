// READ-ONLY discovery, part 2, for the council league table. Opens the official
// files to confirm what each holds per council. Writes NOTHING anywhere.
//
//   1. Ofsted: "Local authority inspection outcomes as at 31 March 2026"
//      (children's services grade per council)
//   2. Defra: local authority collected waste, annual results (latest), household
//      recycling rate per council
//   3. CQC: Latest ratings file (1 October 2026): are council adult social care
//      assessments in it?
//   4. Local Government and Social Care Ombudsman: per-council complaint figures
//   5. MHCLG planning tables P151 (major) and P153 (non-major) speed of decisions
//
// Usage:
//   node scripts/discover-council-ratings-2.js > council-ratings-discovery-2.txt 2>&1

'use strict';
const XLSX = require('xlsx');

const UA = { 'User-Agent': 'opengovt-discovery/1.0 (read-only)' };
async function get(url, asJson = false) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  if (asJson === 'buf') return Buffer.from(await res.arrayBuffer());
  return asJson ? res.json() : res.text();
}
async function attachments(path) {
  const r = await get(`https://www.gov.uk/api/content${path}`, true);
  const atts = (r.details && r.details.attachments) || [];
  return { title: r.title, updated: r.public_updated_at, atts: atts.map((a) => ({ title: a.title, url: a.url, type: a.content_type || '' })), links: (r.links && r.links.children) || [] };
}
const cell = (c) => String(c ?? '').replace(/\s+/g, ' ').trim();

function describe(label, buf, opts = {}) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  console.log(`  ${label}: ${wb.SheetNames.length} sheets: ${wb.SheetNames.join(' | ').slice(0, 900)}`);
  for (const s of wb.SheetNames.slice(0, opts.maxSheets || 12)) {
    if (opts.sheetFilter && !opts.sheetFilter.test(s)) continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false, defval: '' });
    const hi = rows.findIndex((r) => r.filter((c) => cell(c)).length >= (opts.minCols || 4));
    console.log(`    - "${s}": ${rows.length} rows; header at row ${hi + 1}`);
    for (const r of rows.slice(0, Math.min(hi, 4))) console.log(`      pre: ${r.map(cell).filter(Boolean).join(' | ').slice(0, 300)}`);
    if (hi >= 0) {
      console.log(`      header: ${rows[hi].map(cell).join(' | ').slice(0, 1500)}`);
      for (const r of rows.slice(hi + 1, hi + 4)) console.log(`      row: ${r.map(cell).join(' | ').slice(0, 700)}`);
    }
    if (opts.onSheet) opts.onSheet(s, rows, hi);
  }
  return wb;
}

async function section(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { await fn(); } catch (e) { console.log(`  FAILED: ${e.message}`); }
}

(async () => {
  await section('1. Ofsted: local authority inspection outcomes as at 31 March 2026', async () => {
    const a = await attachments('/government/statistics/local-authority-inspection-outcomes-as-at-31-march-2026');
    console.log(`  ${a.title} (updated ${a.updated})`);
    for (const x of a.atts) console.log(`    attachment: ${x.title} | ${x.type} | ${x.url}`);
    const data = a.atts.find((x) => /\.(ods|xlsx|csv)$/i.test(x.url) && /(local authority|LA).*(outcome|judgement|inspection)|data/i.test(x.title)) || a.atts.find((x) => /\.(ods|xlsx|csv)$/i.test(x.url));
    if (!data) { console.log('  no spreadsheet attachment found'); return; }
    describe(data.title, await get(data.url, 'buf'), {
      onSheet: (s, rows, hi) => {
        if (hi < 0) return;
        const h = rows[hi].map(cell);
        const iOverall = h.findIndex((x) => /overall effectiveness/i.test(x));
        if (iOverall >= 0) {
          const t = {}; for (const r of rows.slice(hi + 1)) { const v = cell(r[iOverall]); if (v) t[v] = (t[v] || 0) + 1; }
          console.log(`      "${h[iOverall]}" values: ${JSON.stringify(t)}`);
        }
      },
    });
  });

  await section('2. Defra: local authority collected waste, annual results (latest)', async () => {
    const a = await attachments('/government/statistics/local-authority-collected-waste-management-annual-results');
    console.log(`  ${a.title} (updated ${a.updated})`);
    for (const x of a.atts) console.log(`    attachment: ${x.title} | ${x.type} | ${x.url}`);
    const la = a.atts.find((x) => /\.(ods|xlsx|csv)$/i.test(x.url) && /local authority|LA[ _-]/i.test(x.title + x.url));
    if (!la) { console.log('  no local authority spreadsheet found'); return; }
    describe(la.title, await get(la.url, 'buf'), {
      maxSheets: 20,
      onSheet: (s, rows, hi) => {
        if (hi < 0) return;
        const h = rows[hi].map(cell);
        const i = h.findIndex((x) => /recycl.*compost|NI ?192|reuse, recycling/i.test(x));
        if (i >= 0) console.log(`      recycling column: "${h[i]}"; rows with a value: ${rows.slice(hi + 1).filter((r) => cell(r[i])).length}`);
      },
    });
  });

  await section('3. CQC latest ratings file: council adult social care?', async () => {
    const page = await get('https://www.cqc.org.uk/about-us/transparency/using-cqc-data');
    const url = (page.match(/https:\/\/www\.cqc\.org\.uk\/system\/files\/[^"]*Latest_ratings\.ods/) || [])[0];
    if (!url) { console.log('  latest ratings link not found'); return; }
    console.log(`  ${url}`);
    describe('CQC latest ratings', await get(url, 'buf'), {
      minCols: 5,
      onSheet: (s, rows, hi) => {
        if (hi < 0) return;
        const h = rows[hi].map(cell);
        const hits = rows.slice(hi + 1).filter((r) => r.some((c) => /local authority/i.test(cell(c)) && /assess|adult social care|Care Act/i.test(r.map(cell).join(' '))));
        console.log(`      rows mentioning a local authority assessment: ${hits.length}`);
        for (const r of hits.slice(0, 3)) console.log(`        ${r.map(cell).join(' | ').slice(0, 500)}`);
        const typeCols = h.map((x, i) => [x, i]).filter(([x]) => /type|sector|service|population/i.test(x));
        for (const [x, i] of typeCols.slice(0, 3)) {
          const t = {}; for (const r of rows.slice(hi + 1)) { const v = cell(r[i]); if (v) t[v] = (t[v] || 0) + 1; }
          console.log(`      "${x}" values: ${Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k} (${v})`).join('; ')}`);
        }
      },
    });
    const la = await get('https://www.cqc.org.uk/local-systems/local-authorities');
    const ex = [...la.matchAll(/href="([^"]*local-authorit[^"]*)"/gi)].map((m) => m[1]).filter((u) => !/guidance/i.test(u));
    console.log(`  local authority links on CQC's page: ${[...new Set(ex)].slice(0, 15).join(' | ')}`);
  });

  await section('4. Ombudsman: per-council complaint figures', async () => {
    const base = 'https://www.lgo.org.uk/your-councils-performance';
    const html = await get(base);
    const urls = new Set();
    for (const m of html.matchAll(/(?:href|src|data-[a-z-]+)="([^"]+)"/g)) if (/json|csv|xlsx|api|download|data|performance\//i.test(m[1])) urls.add(m[1]);
    for (const m of html.matchAll(/["'](\/[^"']*(?:json|csv|xlsx|api)[^"']*)["']/gi)) urls.add(m[1]);
    console.log(`  candidate links on the page: ${[...urls].slice(0, 30).join(' | ')}`);
    const councilLinks = [...html.matchAll(/href="(\/your-councils-performance\/[^"#?]+)"/g)].map((m) => m[1]);
    console.log(`  council pages linked: ${new Set(councilLinks).size}; e.g. ${[...new Set(councilLinks)].slice(0, 5).join(' | ')}`);
    const sample = [...new Set(councilLinks)][0];
    if (sample) {
      const p = await get(`https://www.lgo.org.uk${sample}`);
      const text = p.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const i = text.search(/upheld/i);
      console.log(`  sample council page ${sample}: ${i >= 0 ? text.slice(Math.max(0, i - 300), i + 500) : '(no "upheld" text)'}`);
      for (const m of p.matchAll(/href="([^"]+\.(?:csv|xlsx|xls|pdf))"/gi)) console.log(`    file link: ${m[1]}`);
    }
  });

  await section('5. MHCLG planning tables P151 and P153', async () => {
    const a = await attachments('/government/statistical-data-sets/live-tables-on-planning-application-statistics');
    for (const t of ['Table_P151.ods', 'Table_P153.ods']) {
      const x = a.atts.find((y) => y.url.endsWith(t));
      if (!x) { console.log(`  ${t}: not found`); continue; }
      console.log(`  ${x.title}`);
      describe(t, await get(x.url, 'buf'), { maxSheets: 6 });
    }
  });

  console.log('\nDone. Nothing was written to the database.');
})();
