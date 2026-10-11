// READ-ONLY discovery, part 3: prints the full stacked heading block of the
// A1 (initial assessments) and TA1 (temporary accommodation) sheets in every
// quarterly "Detailed local authority level tables" file, once per distinct
// layout, with the England row and one council row under each column, so
// each layout can be mapped column by column. Files SheetJS can't open are
// retried with the streaming ODS reader. Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-homelessness-layouts.js > homelessness-layouts.txt 2>&1

const XLSX = require('xlsx');
const { streamOdsRows } = require('./lib/ods-stream');

const CONTENT_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/live-tables-on-homelessness';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const SHEETS = ['A1', 'TA1'];
const CODE_RE = /^E\d{8}$/;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

async function readSheets(buf, url) {
  const out = {};
  try {
    const wb = XLSX.read(buf, { type: 'buffer' });
    for (const s of SHEETS) if (wb.Sheets[s]) out[s] = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '', raw: true });
    return { out, reader: 'sheetjs' };
  } catch (e) {
    if (!/\.ods$/i.test(url)) throw e;
    // Streaming reader drops fully empty rows and trailing empty cells; good enough to see headings.
    const rows = {};
    await streamOdsRows(buf, (sheet, cells) => { if (SHEETS.includes(sheet)) (rows[sheet] = rows[sheet] || []).push(cells); });
    return { out: rows, reader: `ods-stream (SheetJS failed: ${e.message})` };
  }
}

async function main() {
  const json = await (await fetch(CONTENT_API, { headers: UA })).json();
  const files = (json.details?.attachments ?? [])
    .map((a) => ({ title: clean(a.title), url: a.url }))
    .filter((a) => /^Detailed local authority level tables/i.test(a.title)
      && /(January to March|April to June|July to September|October to December) \d{4}/.test(a.title)
      && !/accessible/i.test(a.title) && !/\.zip$/i.test(a.url));
  console.log(`quarterly files: ${files.length}`);

  const layouts = { A1: new Map(), TA1: new Map() };
  for (const f of files) {
    const res = await fetch(f.url, { headers: UA });
    if (!res.ok) { console.log(`\n### ${f.title}: HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    let read;
    try { read = await readSheets(buf, f.url); } catch (e) { console.log(`\n### ${f.title}: ERROR ${e.message}`); continue; }
    console.log(`\n### ${f.title} [${read.reader}]`);
    for (const s of SHEETS) {
      const rows = read.out[s];
      if (!rows) { console.log(`  ${s}: missing`); continue; }
      const first = rows.findIndex((r) => r.some((v) => CODE_RE.test(clean(v))));
      if (first < 0) { console.log(`  ${s}: no code rows`); continue; }
      // Heading block: rows between the last mostly-empty title line and the first data row.
      let start = Math.max(0, first - 6);
      const block = rows.slice(start, first).map((r) => r.map(clean));
      const width = Math.max(...rows.slice(first, first + 30).map((r) => r.length));
      const england = rows.find((r) => clean(r[0]) === 'E92000001' || clean(r[1]) === 'E92000001') || rows[first];
      const council = rows.find((r) => /^E0[6-9]\d{6}$/.test(clean(r[0])) || /^E0[6-9]\d{6}$/.test(clean(r[1])));
      const sig = JSON.stringify(block.map((r) => r.slice(0, width)));
      const m = layouts[s];
      if (!m.has(sig)) m.set(sig, { files: [], block, width, england, council });
      m.get(sig).files.push(f.title);
      console.log(`  ${s}: layout ${[...m.keys()].indexOf(sig) + 1}; first data row ${first}; width ${width}; England row: ${england.slice(0, width).map(clean).join(' | ')}`);
    }
  }

  for (const s of SHEETS) {
    console.log(`\n\n==================== ${s}: ${layouts[s].size} layouts`);
    let n = 0;
    for (const L of layouts[s].values()) {
      n++;
      console.log(`\n=== ${s} layout ${n} (${L.files.length} files): ${L.files.join(' | ')}`);
      for (let c = 0; c < L.width; c++) {
        const parts = L.block.map((r) => r[c] || '').filter(Boolean);
        console.log(`  col ${c}: [${parts.join(' / ')}]  England=${clean(L.england[c])}  council(${clean(L.council?.[0])} ${clean(L.council?.[1])})=${clean(L.council?.[c])}`);
      }
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
