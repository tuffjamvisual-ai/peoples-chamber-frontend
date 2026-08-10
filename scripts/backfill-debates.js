// Backfill current-Parliament Commons debate metadata from Hansard into the
// `debates` table. Metadata only (title, date, section, ext id) — the full
// transcript is fetched live and rendered in-house on the detail page.
const { execSync } = require('child_process');
const fs = require('fs');

const DB = execSync(`grep -E '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//; s/"$//'`).toString().trim();
const START = '2024-07-04';
const END = new Date().toISOString().slice(0, 10);
const TAKE = 100;

function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return JSON.parse(execSync(`/usr/bin/curl -s -m 40 "${url}"`).toString()); }
    catch { /* retry */ }
  }
  return null;
}

// Stub / non-substantive section titles we skip in the listing.
const SKIP = /^(deferred division|division|prayers|royal assent|petitions?|the petition of)\s*$/i;

function sectionLabel(s) {
  const t = (s || '').trim();
  if (/westminster hall/i.test(t)) return 'Westminster Hall';
  if (/committee/i.test(t)) return 'General Committees';
  if (/written statement/i.test(t)) return 'Written Statements';
  return 'Commons Chamber';
}

async function main() {
  const seen = new Map(); // extId -> row
  let skip = 0;
  for (let page = 0; page < 800; page++) {
    const url = `https://hansard-api.parliament.uk/search/debates.json?queryParameters.house=Commons&queryParameters.startDate=${START}&queryParameters.endDate=${END}&queryParameters.take=${TAKE}&queryParameters.skip=${skip}`;
    const j = getJson(url);
    if (!j || !Array.isArray(j.Results)) { console.log(`stop: no results at skip=${skip}`); break; }
    if (j.Results.length === 0) { console.log(`done: empty page at skip=${skip}`); break; }
    for (const r of j.Results) {
      const extId = r.DebateSectionExtId;
      if (!extId) continue;
      const title = (r.Title || r.DebateSection || '').trim();
      if (!title || SKIP.test(title)) continue;
      const date = (r.SittingDate || '').slice(0, 10);
      if (!date || date < START) continue;
      seen.set(extId, {
        extId,
        title,
        date,
        section: sectionLabel(r.DebateSection || r.House),
      });
    }
    skip += TAKE;
    if (page % 20 === 0) console.log(`skip=${skip} collected=${seen.size} (total=${j.TotalResultCount})`);
  }

  const rows = [...seen.values()];
  console.log(`Collected ${rows.length} debate sections. Writing SQL...`);
  const esc = (s) => String(s).replace(/'/g, "''");
  const values = rows.map(r =>
    `('${esc(r.extId)}', '${esc(r.title)}', '${r.date}', '${esc(r.section)}', 'Commons')`
  );
  // chunked multi-row upserts
  let sql = '';
  for (let i = 0; i < values.length; i += 500) {
    const chunk = values.slice(i, i + 500).join(',\n');
    sql += `INSERT INTO debates (hansard_ext_id, title, sitting_date, section, house) VALUES\n${chunk}\nON CONFLICT (hansard_ext_id) DO UPDATE SET title=EXCLUDED.title, sitting_date=EXCLUDED.sitting_date, section=EXCLUDED.section, updated_at=now();\n`;
  }
  fs.writeFileSync('/tmp/debates-upsert.sql', sql);
  execSync(`psql "${DB}" -f /tmp/debates-upsert.sql`, { stdio: 'inherit' });
  const count = execSync(`psql "${DB}" -tA -c "SELECT count(*) FROM debates;"`).toString().trim();
  console.log(`debates table now has ${count} rows.`);
}
main();
