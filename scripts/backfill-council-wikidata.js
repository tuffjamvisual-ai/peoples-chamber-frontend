#!/usr/bin/env node
// Step 1 of the multi-source council backfill (Path 1 from today's
// audit). Single bulk Wikidata SPARQL query against all 382 GSS
// codes returns: website, founded_year (P571), population (P1082),
// and partial leader/party (P6/P102) in one round-trip.
//
// Wikidata structured data is dramatically cleaner than Wikipedia
// infobox regex parsing:
//   - website   : ~380 hits (every council has one)
//   - founded   : ~280 hits (Wikipedia infobox got 1)
//   - population: ~404 hits (Wikipedia infobox got 38)
//   - leader    : ~64  hits (lower than Wikipedia's 232; we keep
//                            Wikipedia values, add new where ours is null)
//   - party     : ~25  hits
//
// Conservative: only writes where the existing value is null. Never
// overwrites prior data.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const UA = 'PeoplesChamber/1.0 (https://thepeopleschamber.uk)';

function psqlRead(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '|', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
  });
}
function psqlWrite(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err)));
    p.stdin.end(sql);
  });
}

async function fetchWikidata(gssCodes) {
  const values = gssCodes.map(g => `"${g}"`).join(' ');
  const sparql = `SELECT ?gss ?council ?councilLabel ?leader ?leaderLabel ?party ?partyLabel ?website ?inception ?population WHERE {
    VALUES ?gss { ${values} }
    ?council wdt:P836 ?gss.
    OPTIONAL { ?council wdt:P6 ?leader. OPTIONAL { ?leader wdt:P102 ?party. } }
    OPTIONAL { ?council wdt:P856 ?website. }
    OPTIONAL { ?council wdt:P571 ?inception. }
    OPTIONAL { ?council wdt:P1082 ?population. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'query=' + encodeURIComponent(sparql),
  });
  if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
  return res.json();
}

function parseYear(iso) {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1500 && y <= new Date().getFullYear() ? y : null;
}

function dq(tag, v) {
  if (v == null) return 'NULL';
  return `$${tag}$${v}$${tag}$`;
}

(async () => {
  // Load all 382 council GSS codes + current state so we never overwrite.
  const raw = await psqlRead(
    "SELECT slug, gss_code, leader_name, leader_party, website_url, founded_year, population FROM councils ORDER BY slug",
  );
  const rows = raw.split('\n').filter(Boolean).map(line => {
    const [slug, gss, ln, lp, web, fy, pop] = line.split('|');
    return { slug, gss, leader_name: ln || null, leader_party: lp || null, website_url: web || null, founded_year: fy || null, population: pop || null };
  });
  const byGss = new Map(rows.map(r => [r.gss, r]));
  console.log(`Loaded ${rows.length} councils.`);

  // One bulk SPARQL query against all 382 GSS codes.
  console.log(`Querying Wikidata for all ${rows.length} GSS codes…`);
  const data = await fetchWikidata(rows.map(r => r.gss));
  const bindings = data?.results?.bindings || [];
  console.log(`Wikidata returned ${bindings.length} rows across ${new Set(bindings.map(b => b.gss?.value)).size} distinct councils.`);

  // Aggregate: for each GSS code, collect first non-null value per field.
  // Wikidata returns multiple rows when a council has multiple values for
  // any property (e.g. multiple historical leaders); take the first
  // non-null occurrence for each field.
  const agg = new Map();
  for (const b of bindings) {
    const gss = b.gss?.value;
    if (!gss) continue;
    if (!agg.has(gss)) agg.set(gss, {});
    const a = agg.get(gss);
    if (!a.leader_name && b.leaderLabel?.value) a.leader_name = b.leaderLabel.value;
    if (!a.leader_party && b.partyLabel?.value) a.leader_party = b.partyLabel.value;
    if (!a.website_url && b.website?.value) a.website_url = b.website.value;
    if (!a.founded_year) {
      const y = parseYear(b.inception?.value);
      if (y) a.founded_year = y;
    }
    if (!a.population && b.population?.value) {
      const n = parseInt(b.population.value.replace(/[^0-9]/g, ''), 10);
      if (Number.isFinite(n) && n > 1000) a.population = n;
    }
  }

  // Apply updates. Conservative — only fill where current is null.
  const counters = { leader_name: 0, leader_party: 0, website_url: 0, founded_year: 0, population: 0 };
  let updated = 0;
  for (const [gss, a] of agg) {
    const c = byGss.get(gss);
    if (!c) continue;
    const sets = [];
    const tag = `w${c.slug.replace(/[^a-z0-9]/g, '')}`;
    if (!c.leader_name && a.leader_name) { sets.push(`leader_name = ${dq(tag, a.leader_name)}`); counters.leader_name++; }
    if (!c.leader_party && a.leader_party) { sets.push(`leader_party = ${dq(tag, a.leader_party)}`); counters.leader_party++; }
    if (!c.website_url && a.website_url) { sets.push(`website_url = ${dq(tag, a.website_url)}`); counters.website_url++; }
    if (!c.founded_year && a.founded_year) { sets.push(`founded_year = ${a.founded_year}`); counters.founded_year++; }
    if (!c.population && a.population) { sets.push(`population = ${a.population}`); counters.population++; }
    if (sets.length === 0) continue;
    await psqlWrite(`UPDATE councils SET ${sets.join(', ')} WHERE slug = ${dq('s' + tag, c.slug)};`);
    updated++;
  }

  console.log(`\nDone. ${updated} councils updated.`);
  for (const [k, v] of Object.entries(counters)) console.log(`  ${k}: +${v}`);
})();
