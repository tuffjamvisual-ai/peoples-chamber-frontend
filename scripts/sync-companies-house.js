// Cross-reference companies named in MPs' registered interests against the
// Companies House public API. For each unique company candidate we:
//   1. /search/companies?q={name} — pick the top result
//   2. /company/{number} — full profile (status, type, incorporated date)
//   3. /company/{number}/officers — director list
//   4. /company/{number}/persons-with-significant-control — PSC list
//
// Auth: HTTP Basic with the API key as the username and an empty password.
// Rate limit: 600 requests / 5 minutes per key (≈2 req/sec sustained). We
// run at 300ms between calls (3.3 req/sec) and back off on 429 — this
// trades a few burst-throttles for shorter wall-clock time on the 200
// good calls vs. dragging at 500ms throughout.
//
// Resume support: progress is written to /tmp/companies-house-progress.json.
// Re-runs skip already-processed candidates.

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
if (!API_KEY) {
  console.error('[companies-house] FATAL: COMPANIES_HOUSE_API_KEY env var is not set.');
  console.error('  Run with: COMPANIES_HOUSE_API_KEY=<key> node scripts/sync-companies-house.js');
  process.exit(1);
}

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

const API_BASE = 'https://api.company-information.service.gov.uk';
const AUTH_HEADER = 'Basic ' + Buffer.from(API_KEY + ':').toString('base64');
const DELAY_MS = 300;
const PROGRESS_FILE = '/tmp/companies-house-progress.json';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch { return { candidates: null, doneCandidates: [], rows: [] }; }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

async function fetchCH(path) {
  // Backoff on 429. Otherwise 4xx returns null (treated as "no data"),
  // 5xx throws so the outer loop can retry/skip.
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API_BASE + path, { headers: { Authorization: AUTH_HEADER, Accept: 'application/json' } });
    if (res.status === 429) {
      const wait = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s, 32s, 64s
      console.warn(`  CH rate limited, sleeping ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (res.status === 404) return null;
    if (res.status === 401) throw new Error('CH 401 — API key rejected');
    if (!res.ok) throw new Error(`CH HTTP ${res.status} on ${path}`);
    return res.json();
  }
  throw new Error('CH rate limit exceeded after 6 retries');
}

function extractCompanyName(category, summary) {
  if (!summary) return null;
  if (/Shareholdings|Shareholding/i.test(category)) {
    return summary.replace(/^(Shares|Shareholding)s?\s+(in|of)\s+/i, '').trim();
  }
  if (/Employment/i.test(category)) {
    // Format is typically "Role/description - Employer". Split on the
    // hyphen-with-spaces separator and take the last segment.
    const parts = summary.split(/\s+[-–—]\s+/);
    if (parts.length < 2) return null;
    const candidate = parts[parts.length - 1].trim();
    return candidate;
  }
  return null;
}

function looksLikeCompany(name) {
  if (!name || name.length < 2 || name.length > 200) return false;
  // Skip obvious non-company answers ("Doctor", "Self employed", etc.).
  if (/^(self.?employed|doctor|surgeon|consultant|various|none|n\/a|nhs)$/i.test(name)) return false;
  return true;
}

async function loadCandidates() {
  // Pull all interests in the relevant categories. Ordered by member_id so
  // we can attribute each company back to its first MP source.
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mp_interests')
      .select('member_id,member_slug,category,summary')
      .or('category.eq.Employment and earnings,category.eq.Shareholdings')
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  // Build a Map keyed on lowercased candidate name → first matching row.
  const byName = new Map();
  for (const r of all) {
    const name = extractCompanyName(r.category, r.summary);
    if (!looksLikeCompany(name)) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, name);
  }
  return [...byName.values()].sort();
}

function shapeOfficers(json) {
  if (!json || !Array.isArray(json.items)) return [];
  return json.items.map((o) => ({
    name: o.name || null,
    role: o.officer_role || null,
    appointed_on: o.appointed_on || null,
    resigned_on: o.resigned_on || null,
    nationality: o.nationality || null,
    occupation: o.occupation || null,
  }));
}

function shapePsc(json) {
  if (!json || !Array.isArray(json.items)) return [];
  return json.items.map((p) => ({
    name: p.name || null,
    kind: p.kind || null,
    nature_of_control: p.natures_of_control || [],
    notified_on: p.notified_on || null,
    ceased_on: p.ceased_on || null,
  }));
}

async function processCandidate(name) {
  const search = await fetchCH(`/search/companies?q=${encodeURIComponent(name)}&items_per_page=1`);
  await sleep(DELAY_MS);
  if (!search || !Array.isArray(search.items) || search.items.length === 0) return null;
  const top = search.items[0];
  const number = top.company_number;
  if (!number) return null;

  const profile = await fetchCH(`/company/${number}`);
  await sleep(DELAY_MS);
  if (!profile) return null;

  const officers = await fetchCH(`/company/${number}/officers?items_per_page=50`);
  await sleep(DELAY_MS);

  let psc = null;
  try {
    psc = await fetchCH(`/company/${number}/persons-with-significant-control?items_per_page=50`);
  } catch (e) {
    // PSC endpoint sometimes 500s on tiny/dissolved entities. Don't let
    // that drop the whole row.
    console.warn(`  PSC fetch failed for ${number}: ${e.message}`);
  }
  await sleep(DELAY_MS);

  return {
    company_number: profile.company_number || number,
    company_name: profile.company_name || top.title || name,
    status: profile.company_status || null,
    company_type: profile.type || null,
    incorporated_date: profile.date_of_creation || null,
    directors: shapeOfficers(officers),
    persons_significant_control: shapePsc(psc),
  };
}

async function main() {
  const progress = loadProgress();

  if (!progress.candidates) {
    console.log('[companies-house] extracting candidate company names from mp_interests…');
    progress.candidates = await loadCandidates();
    saveProgress(progress);
  }
  console.log(`[companies-house] ${progress.candidates.length} unique candidates (${progress.doneCandidates.length} already done)`);

  const doneSet = new Set(progress.doneCandidates.map((c) => c.toLowerCase()));

  for (let i = 0; i < progress.candidates.length; i++) {
    const name = progress.candidates[i];
    if (doneSet.has(name.toLowerCase())) continue;

    let row = null;
    try {
      row = await processCandidate(name);
    } catch (e) {
      console.warn(`  [${i + 1}/${progress.candidates.length}] "${name}" failed: ${e.message}`);
    }

    if (row) {
      // De-dupe in-progress rows on company_number.
      if (!progress.rows.some((r) => r.company_number === row.company_number)) {
        progress.rows.push(row);
      }
    }
    progress.doneCandidates.push(name);
    doneSet.add(name.toLowerCase());

    if (i % 10 === 0 || i === progress.candidates.length - 1) {
      console.log(`  [${i + 1}/${progress.candidates.length}] "${name.slice(0, 50)}" → ${row ? `${row.company_name} (#${row.company_number}, ${row.status})` : 'no match'} (rows so far: ${progress.rows.length})`);
      saveProgress(progress);
    }
  }
  saveProgress(progress);

  if (!progress.rows.length) { console.log('[companies-house] no rows to insert.'); return; }

  console.log(`[companies-house] upserting ${progress.rows.length} unique companies…`);
  const BATCH = 200;
  let upserted = 0;
  for (let i = 0; i < progress.rows.length; i += BATCH) {
    const batch = progress.rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('companies_house')
      .upsert(batch, { onConflict: 'company_number' });
    if (error) {
      console.error(`[companies-house] upsert batch ${i} error:`, error.message || error);
      break;
    }
    upserted += batch.length;
    console.log(`[companies-house] upserted ${upserted}/${progress.rows.length}`);
    await sleep(150);
  }
  console.log('[companies-house] done.');
}

main().catch((e) => { console.error('[companies-house] fatal:', e?.message || e); process.exit(0); });
