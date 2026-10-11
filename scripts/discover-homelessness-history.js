// READ-ONLY discovery, part 2: checks every quarterly "Detailed local
// authority level tables" file listed on GOV.UK's live tables page (via the
// GOV.UK Content API) for the sheets and column headings an importer would
// rely on (A1 initial assessments, A2R reasons for homelessness, TA1
// temporary accommodation). Writes NOTHING to the database.
//
// Usage:
//   node scripts/discover-homelessness-history.js > homelessness-history.txt 2>&1

const XLSX = require('xlsx');

const CONTENT_API = 'https://www.gov.uk/api/content/government/statistical-data-sets/live-tables-on-homelessness';
const UA = { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)' };
const SHEETS = ['A1', 'A2P', 'A2R', 'TA1'];
const CODE_RE = /^E\d{8}$/;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

async function main() {
  const res = await fetch(CONTENT_API, { headers: UA });
  console.log(`Content API HTTP ${res.status}`);
  const json = await res.json();
  const atts = (json.details?.attachments ?? []).map((a) => ({ title: clean(a.title), url: a.url, type: a.content_type }));
  console.log(`attachments: ${atts.length}`);
  const detailed = atts.filter((a) => /^Detailed local authority level/i.test(a.title));
  console.log(`\nALL "Detailed local authority level" attachments (${detailed.length}):`);
  for (const a of detailed) console.log(`  ${a.title}\n    ${a.url}`);

  const quarterly = detailed.filter((a) => /(January to March|April to June|July to September|October to December) \d{4}/.test(a.title) && !/accessible/i.test(a.title) && !/\.zip$/i.test(a.url));
  console.log(`\nQUARTERLY FILES TO CHECK (${quarterly.length})`);

  const headerSeen = new Map(); // sheet -> Map(headerJSON -> [titles])
  for (const a of quarterly) {
    let line = `\n### ${a.title}`;
    try {
      const r = await fetch(a.url, { headers: UA });
      if (!r.ok) { console.log(`${line}\n  HTTP ${r.status}`); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'buffer' });
      line += `  (${(buf.length / 1e6).toFixed(2)} MB; ${wb.SheetNames.length} sheets)`;
      console.log(line);
      console.log(`  sheets: ${wb.SheetNames.join(', ')}`);
      const status = (() => {
        const cover = wb.Sheets['Cover'];
        if (!cover) return '(no Cover sheet)';
        const rows = XLSX.utils.sheet_to_json(cover, { header: 1, defval: '' });
        const i = rows.findIndex((row) => clean(row[0]) === 'Status');
        return i >= 0 ? clean(rows[i + 1]?.[0]) : '(status not found)';
      })();
      console.log(`  status: ${status}`);
      for (const name of SHEETS) {
        const ws = wb.Sheets[name];
        if (!ws) { console.log(`  ${name}: MISSING`); continue; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const hi = rows.findIndex((row) => row.some((v) => CODE_RE.test(clean(v))));
        const headerRow = hi > 0 ? rows[hi - 1].map(clean) : [];
        const codeCol = hi >= 0 ? rows[hi].findIndex((v) => CODE_RE.test(clean(v))) : -1;
        const laRows = rows.filter((row) => /^E0[6-9]\d{6}$/.test(clean(row[codeCol]))).length;
        const odd = new Map();
        for (const row of rows.slice(hi)) for (const v of row) if (typeof v === 'string' && v && !CODE_RE.test(clean(v)) && /^\[|^\.\.|^-$|^\*/.test(clean(v))) odd.set(clean(v), (odd.get(clean(v)) || 0) + 1);
        console.log(`  ${name}: code column ${codeCol}, council rows ${laRows}, ${headerRow.length} headings; special values ${[...odd.entries()].map(([k, n]) => `${k}=${n}`).join(' ') || 'none'}`);
        const key = JSON.stringify(headerRow);
        const m = headerSeen.get(name) || new Map();
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(a.title);
        headerSeen.set(name, m);
      }
    } catch (e) {
      console.log(`${line}\n  ERROR ${e.message}`);
    }
  }

  console.log('\n\n==================== DISTINCT HEADINGS PER SHEET');
  for (const [name, m] of headerSeen) {
    console.log(`\n=== ${name}: ${m.size} distinct heading layouts`);
    let n = 0;
    for (const [key, titles] of m) {
      n++;
      console.log(`\n  Layout ${n} used by ${titles.length} file(s): ${titles.join(' | ')}`);
      JSON.parse(key).forEach((h, i) => console.log(`    ${i}: ${h}`));
    }
  }
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
