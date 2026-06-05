#!/usr/bin/env node
// One-off: backfill councils.wikipedia_url + description + population
// from Wikipedia for the 382 rows.
//
// The earlier supabase-js version of this script silently no-op'd
// because councils has SELECT-only RLS and no service-role key is
// available locally — anon UPDATEs were dropped without an error.
// This version streams the UPDATEs through psql via DATABASE_URL,
// which bypasses RLS entirely.
//
// Each UPDATE uses dollar-quoting tagged with the council slug, so
// arbitrary HTML/punctuation in descriptions can't break the SQL.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const UA = 'PeoplesChamber/1.0 (https://thepeopleschamber.uk)';

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-q'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `psql exit ${code}`));
      else resolve();
    });
    p.stdin.write(sql);
    p.stdin.end();
  });
}

async function fetchCouncils() {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '|', '-c',
      "SELECT slug, name FROM councils WHERE description IS NULL OR wikipedia_url IS NULL OR population IS NULL ORDER BY slug"],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('close', (code) => {
      if (code !== 0) reject(new Error(err.trim() || `psql exit ${code}`));
      else {
        const rows = out.trim().split('\n').filter(Boolean).map((line) => {
          const [slug, name] = line.split('|');
          return { slug, name };
        });
        resolve(rows);
      }
    });
  });
}

async function searchWikipedia(title) {
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  let res = await fetch(summaryUrl, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (res.ok) {
    const json = await res.json();
    if (json.type !== 'disambiguation') return json;
  }
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&search=${encodeURIComponent(title)}`;
  res = await fetch(searchUrl, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const firstTitle = data?.[1]?.[0];
  if (!firstTitle) return null;
  const fallback = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstTitle)}`,
    { headers: { 'User-Agent': UA, Accept: 'application/json' } },
  );
  return fallback.ok ? fallback.json() : null;
}

async function getPopulation(wikiTitle) {
  try {
    const apiUrl =
      `https://en.wikipedia.org/w/api.php?action=parse&format=json` +
      `&prop=wikitext&section=0&page=${encodeURIComponent(wikiTitle)}`;
    const res = await fetch(apiUrl, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const wt = data?.parse?.wikitext?.['*'];
    if (!wt) return null;
    // Try several infobox population patterns
    const patterns = [
      /\|\s*population(?:_total)?\s*=\s*\{?\{?\s*(?:formatnum:)?([\d,]+)/i,
      /\|\s*population\s*\(\s*[^)]*\)\s*=\s*([\d,]+)/i,
      /population[^|]{0,40}?(\d{2,3}(?:,\d{3})+)/i,
    ];
    for (const re of patterns) {
      const m = wt.match(re);
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ''), 10);
        if (Number.isFinite(n) && n > 1000) return n;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function trimDescription(text, max = 600) {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const back = cut.lastIndexOf('. ');
  return (back > 300 ? cut.slice(0, back + 1) : cut) + '…';
}

// Dollar-quote a string safely. The tag is unique per row (the slug),
// so even adversarial content can't escape since slug never appears
// inside any reasonable Wikipedia description as that literal token.
function dq(tag, value) {
  if (value == null) return 'NULL';
  return `$${tag}$${value}$${tag}$`;
}

(async () => {
  const rows = await fetchCouncils();
  console.log(`Found ${rows.length} councils needing Wikipedia backfill.`);

  let ok = 0;
  let partial = 0;
  let skip = 0;
  let fail = 0;
  for (const c of rows) {
    try {
      const summary = await searchWikipedia(c.name);
      if (!summary?.content_urls?.desktop?.page) {
        console.log(`  ⌀ ${c.slug}  no wikipedia match for "${c.name}"`);
        skip++;
        continue;
      }
      const wikipedia_url = summary.content_urls.desktop.page;
      const description = trimDescription(summary.extract);
      const wikiTitle = summary.title;
      const population = await getPopulation(wikiTitle);

      const sets = [];
      const tag = `wiki${c.slug.replace(/-/g, '')}`;
      if (wikipedia_url) sets.push(`wikipedia_url = ${dq(tag, wikipedia_url)}`);
      if (description) sets.push(`description = ${dq(tag, description)}`);
      if (population) sets.push(`population = ${population}`);

      if (sets.length === 0) { skip++; continue; }

      const sql = `UPDATE councils SET ${sets.join(', ')} WHERE slug = ${dq('s' + tag, c.slug)};`;
      await runPsql(sql);

      if (population) ok++;
      else partial++;
      const total = ok + partial + skip + fail;
      if (total % 25 === 0) console.log(`  ${total}/${rows.length}  ok=${ok} partial=${partial} skip=${skip} fail=${fail}`);
    } catch (e) {
      console.log(`  ✗ ${c.slug}  ${e.message.split('\n')[0]}`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`\nDone. ok=${ok} (full) partial=${partial} (no pop) skip=${skip} fail=${fail}`);
})();
