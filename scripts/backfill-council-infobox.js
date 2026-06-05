#!/usr/bin/env node
// Second pass at the council backfill. Today's first pass landed
// wikipedia_url + description for 100% of 382 rows but left
// leader_name, leader_party, website_url, founded_year, and
// population mostly empty. This pass parses the Wikipedia article
// wikitext infobox more thoroughly to fill those fields where they
// can be extracted reliably.
//
// Strategy:
//   - Re-use the wikipedia_url already on each row to pull the wikitext
//     for that exact article (no opensearch round trip)
//   - Parse the infobox via a tolerant set of patterns covering the
//     formats Wikipedia editors actually use ('Leader =', 'leader1 =',
//     'leader_name =', '{{Wikidata link}}', '[[Link|display]]' etc.)
//   - Update via psql (councils has SELECT-only RLS — supabase-js
//     anon UPDATEs are silently dropped, same as the first pass)
//
// Each council can land 0-5 of these fields depending on what its
// article actually contains. Conservative: never overwrite an
// existing non-null value.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const UA = 'PeoplesChamber/1.0 (https://thepeopleschamber.uk)';

function psqlRead(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-t', '-A', '-F', '|', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
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

function wikiTitleFromUrl(url) {
  if (!url) return null;
  const m = url.match(/\/wiki\/(.+)$/);
  return m ? decodeURIComponent(m[1].replace(/_/g, ' ')) : null;
}

async function fetchWikitext(title) {
  const apiUrl =
    `https://en.wikipedia.org/w/api.php?action=parse&format=json` +
    `&prop=wikitext&section=0&page=${encodeURIComponent(title)}`;
  const res = await fetch(apiUrl, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.parse?.wikitext?.['*'] || null;
}

// Strip wikilink/template markup from an infobox value.
function cleanWikiValue(raw) {
  if (!raw) return null;
  let v = String(raw);
  // [[Link|Display]] -> Display
  v = v.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  // [[Link]] -> Link
  v = v.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // {{nowrap|x}} -> x, {{ubl|...}} -> first item, generic {{x|y|z}} -> y
  v = v.replace(/\{\{(?:nowrap|nobr|small|smaller|big|nbsp)\|([^}]+)\}\}/gi, '$1');
  v = v.replace(/\{\{ubl\|([^}|]+)(?:\|[^}]+)?\}\}/gi, '$1');
  v = v.replace(/\{\{flag(?:icon)?\|[^}]+\}\}/gi, '');
  v = v.replace(/\{\{plainlist\s*\|([^}]+)\}\}/gi, '$1');
  // Drop refs <ref>...</ref>
  v = v.replace(/<ref[^>]*>.*?<\/ref>/gi, '');
  v = v.replace(/<ref[^/]*\/>/gi, '');
  // Drop HTML tags
  v = v.replace(/<[^>]+>/g, ' ');
  // Collapse whitespace
  v = v.replace(/\s+/g, ' ').trim();
  // Trim trailing markup garbage
  v = v.replace(/^[|*\-•:\s]+/, '').replace(/[|*\-•:\s]+$/, '');
  return v || null;
}

// Match infobox parameter values. Wikipedia uses many param names.
function findParam(wt, names) {
  for (const name of names) {
    const re = new RegExp(`\\|\\s*${name}\\s*=\\s*([^\\n|]+(?:\\n(?!\\s*\\|)[^\\n|]*)*)`, 'i');
    const m = wt.match(re);
    if (m && m[1] && !/^\s*$/.test(m[1])) return cleanWikiValue(m[1]);
  }
  return null;
}

function parseYear(raw) {
  if (!raw) return null;
  const m = raw.match(/\b(1[5-9]\d{2}|20[0-3]\d)\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1500 && y <= new Date().getFullYear() ? y : null;
}

function parsePopulation(raw) {
  if (!raw) return null;
  // Pick the largest number that looks like a population (4-8 digits)
  const matches = (raw.match(/[\d,]+/g) || []).map(s => parseInt(s.replace(/,/g, ''), 10)).filter(n => Number.isFinite(n) && n > 1000 && n < 50_000_000);
  if (matches.length === 0) return null;
  // Often the first number in the population field is the one
  return matches[0];
}

function parseUrl(raw) {
  if (!raw) return null;
  const m = raw.match(/https?:\/\/[^\s\]|}]+/);
  return m ? m[0].replace(/[.,);]+$/, '') : null;
}

// Dollar-quote helper (avoid SQL escape pain with arbitrary content).
function dq(tag, value) {
  if (value == null) return 'NULL';
  return `$${tag}$${value}$${tag}$`;
}

(async () => {
  const raw = await psqlRead(
    "SELECT slug, name, wikipedia_url, leader_name, leader_party, website_url, founded_year, population FROM councils WHERE wikipedia_url IS NOT NULL ORDER BY slug",
  );
  const rows = raw.split('\n').filter(Boolean).map(line => {
    const [slug, name, wikipedia_url, leader_name, leader_party, website_url, founded_year, population] = line.split('|');
    return {
      slug, name, wikipedia_url,
      leader_name: leader_name || null,
      leader_party: leader_party || null,
      website_url: website_url || null,
      founded_year: founded_year || null,
      population: population || null,
    };
  });
  console.log(`Inspecting ${rows.length} councils.`);

  const FIELDS = ['leader_name', 'leader_party', 'website_url', 'founded_year', 'population'];
  const counters = Object.fromEntries(FIELDS.map(f => [f, 0]));
  let fail = 0;

  for (const c of rows) {
    const title = wikiTitleFromUrl(c.wikipedia_url);
    if (!title) continue;
    try {
      const wt = await fetchWikitext(title);
      if (!wt) continue;

      const updates = {};
      if (!c.leader_name) {
        const v = findParam(wt, ['leader_name', 'leader1_name', 'Leader', 'leader', 'leader1', 'mayor_name', 'mayor', 'chief_executive']);
        if (v) updates.leader_name = v;
      }
      if (!c.leader_party) {
        const v = findParam(wt, ['leader_party', 'leader1_party', 'party', 'leader_party1', 'leadership']);
        if (v) updates.leader_party = v;
      }
      if (!c.website_url) {
        const v = parseUrl(findParam(wt, ['website', 'web', 'url', 'homepage']));
        if (v) updates.website_url = v;
      }
      if (!c.founded_year) {
        const v = parseYear(findParam(wt, ['established', 'founded', 'formation', 'date_of_formation', 'creation', 'start_date']));
        if (v) updates.founded_year = v;
      }
      if (!c.population) {
        const v = parsePopulation(findParam(wt, ['population', 'population_total', 'pop', 'pop_total']));
        if (v) updates.population = v;
      }

      const keys = Object.keys(updates);
      if (keys.length > 0) {
        const tag = `t${c.slug.replace(/[^a-z0-9]/g, '')}`;
        const sets = keys.map(k => {
          const val = updates[k];
          if (typeof val === 'number') return `${k} = ${val}`;
          return `${k} = ${dq(tag, val)}`;
        });
        await psqlWrite(`UPDATE councils SET ${sets.join(', ')} WHERE slug = ${dq('s' + tag, c.slug)};`);
        for (const k of keys) counters[k]++;
      }
    } catch (e) {
      console.log(`  ✗ ${c.slug}  ${e.message.split('\n')[0]}`);
      fail++;
    }
    const total = rows.indexOf(c) + 1;
    if (total % 50 === 0) {
      console.log(`  ${total}/${rows.length}  ${FIELDS.map(f => `${f}=${counters[f]}`).join(' ')}  fail=${fail}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  console.log(`\nDone. Filled ${rows.length} councils. Field totals:`);
  for (const f of FIELDS) console.log(`  ${f}: +${counters[f]}`);
  if (fail) console.log(`  fail: ${fail}`);
})();
