// One-off backfill: UK Parliament petitions with 10,000+ signatures, plus
// each petition's signatures broken down by parliamentary constituency.
// Ongoing updates are handled daily by app/api/sync-petitions/route.ts;
// this script exists for the initial load (and can be safely re-run at
// any time — every write is an upsert keyed on the source's own ids).
//
// Source: petition.parliament.uk (Open Government Licence v3.0), no API
// key, live-verified 2026-10-11:
//   - List pages: /petitions.json?state=open|closed&page=N, 50 per page,
//     sorted by signature_count DESCENDING (confirmed on both the open and
//     closed lists). So each list is read from page 1 and reading stops at
//     the first petition below the threshold — no need to page through all
//     ~32,900 petitions.
//   - Detail: /petitions/<id>.json, attributes.signatures_by_constituency
//     = [{ name, ons_code, mp, signature_count }] using 2024-boundary ONS
//     codes, which join directly to mps.constituency_gss_code.
//
// THRESHOLD: 10,000 signatures (the point at which the government must
// respond). Must stay in sync with the migration header
// (scripts/migrations/2026-10-11-petitions.sql), the daily sync route, and
// the reader-facing note on the MP profile's Petitions tab.
//
// Usage:
//   node scripts/import-petitions.js            # full backfill, writes to DB
//   node scripts/import-petitions.js --dry-run  # fetch + compute only, no writes
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local. Deliberately does NOT
// fall back to the anon key: both petitions tables are read-only to anon
// (RLS), so an anon-key run would fail on every write anyway.

require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const PETITION_SIGNATURE_THRESHOLD = 10000;
const BASE = 'https://petition.parliament.uk';
const CONCURRENCY = 3;          // parallel detail fetches
const DELAY_MS = 250;           // pause after each detail fetch, per worker
const MAX_LIST_PAGES = 1000;    // guard against a runaway pagination loop
const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        // 4xx other than 429 won't improve on retry — fail immediately.
        const err = new Error(`HTTP ${res.status} for ${url}`);
        err.noRetry = true;
        throw err;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (e.noRetry) break;
      await sleep(1000 * attempt * attempt); // 1s, 4s, 9s
    }
  }
  throw lastErr;
}

// Read one list (open or closed) from the top, collecting ids of petitions
// at or above the threshold, stopping at the first one below it.
async function collectIds(state) {
  const ids = [];
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const json = await fetchJson(`${BASE}/petitions.json?state=${state}&page=${page}`);
    const items = Array.isArray(json.data) ? json.data : [];
    let reachedBelow = false;
    for (const item of items) {
      const count = item?.attributes?.signature_count;
      if (typeof count !== 'number') continue;
      if (count >= PETITION_SIGNATURE_THRESHOLD) ids.push(item.id);
      else { reachedBelow = true; break; }
    }
    if (reachedBelow || !json.links?.next || items.length === 0) break;
    await sleep(DELAY_MS);
  }
  return ids;
}

function toDateOnly(v) {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;
}

// Standard competition ranking (1, 2, 2, 4) by signature_count descending.
function rankRows(rows) {
  const sorted = [...rows].sort((a, b) => b.signature_count - a.signature_count);
  let prevCount = null;
  let prevRank = 0;
  sorted.forEach((r, i) => {
    if (r.signature_count !== prevCount) { prevRank = i + 1; prevCount = r.signature_count; }
    r.rank_in_petition = prevRank;
  });
  return sorted;
}

function buildRows(json) {
  const id = json?.data?.id;
  const a = json?.data?.attributes;
  if (typeof id !== 'number' || !a) throw new Error('Unexpected petition JSON shape');

  const rawConst = Array.isArray(a.signatures_by_constituency) ? a.signatures_by_constituency : [];
  const constRows = rawConst
    .filter((c) => c && typeof c.ons_code === 'string' && c.ons_code && typeof c.signature_count === 'number' && c.signature_count > 0)
    .map((c) => ({
      petition_id: id,
      constituency_gss_code: c.ons_code,
      constituency_name: c.name || c.ons_code,
      signature_count: c.signature_count,
    }));

  const ukTotal = constRows.reduce((s, r) => s + r.signature_count, 0);
  const now = new Date().toISOString();
  const ranked = rankRows(constRows).map((r) => ({
    ...r,
    share_of_petition_pct: ukTotal > 0 ? Math.round((r.signature_count / ukTotal) * 100 * 10000) / 10000 : null,
    updated_at: now,
  }));

  const gr = a.government_response || null;
  const debate = a.debate || null;

  const petition = {
    id,
    action: a.action,
    background: a.background || null,
    additional_details: a.additional_details || null,
    state: a.state,
    signature_count: a.signature_count,
    uk_constituency_signature_count: ukTotal,
    constituency_count: ranked.length,
    source_created_at: a.created_at || null,
    opened_at: a.opened_at || null,
    closed_at: a.closed_at || null,
    response_threshold_reached_at: a.response_threshold_reached_at || null,
    government_response_at: a.government_response_at || null,
    government_response_summary: gr?.summary || null,
    debate_threshold_reached_at: a.debate_threshold_reached_at || null,
    scheduled_debate_date: toDateOnly(a.scheduled_debate_date),
    debated_on: toDateOnly(debate?.debated_on),
    debate_transcript_url: debate?.transcript_url || null,
    debate_video_url: debate?.video_url || null,
    departments: Array.isArray(a.departments) ? a.departments : [],
    topics: Array.isArray(a.topics) ? a.topics : [],
    url: `${BASE}/petitions/${id}`,
    source_updated_at: a.updated_at || null,
    synced_at: now,
    updated_at: now,
  };

  return { petition, constRows: ranked };
}

async function writePetition({ petition, constRows }) {
  const { error: pErr } = await supabase.from('petitions').upsert(petition, { onConflict: 'id' });
  if (pErr) throw new Error(`petitions upsert ${petition.id}: ${pErr.message}`);

  for (let i = 0; i < constRows.length; i += 500) {
    const batch = constRows.slice(i, i + 500);
    const { error } = await supabase
      .from('petition_constituency_signatures')
      .upsert(batch, { onConflict: 'petition_id,constituency_gss_code' });
    if (error) throw new Error(`constituency upsert ${petition.id}: ${error.message}`);
  }

  // Remove any constituency row that is no longer in the source (e.g. if
  // the petitions site removed invalid signatures and a constituency's
  // count fell to zero). ONS codes are alphanumeric only, so they are safe
  // inside the PostgREST in-list.
  if (constRows.length > 0) {
    const codes = constRows.map((r) => r.constituency_gss_code);
    if (codes.some((c) => !/^[A-Z0-9]+$/.test(c))) {
      throw new Error(`Unexpected constituency code format on petition ${petition.id}`);
    }
    const { error: dErr } = await supabase
      .from('petition_constituency_signatures')
      .delete()
      .eq('petition_id', petition.id)
      .not('constituency_gss_code', 'in', `(${codes.join(',')})`);
    if (dErr) throw new Error(`stale constituency delete ${petition.id}: ${dErr.message}`);
  }
}

async function main() {
  console.log(`Petitions backfill — threshold ${PETITION_SIGNATURE_THRESHOLD.toLocaleString()} signatures${DRY_RUN ? ' (DRY RUN, no writes)' : ''}`);

  // Live set of current constituency codes, used only to REPORT any petition
  // constituency code that doesn't match an MP's constituency (rows are
  // still stored — the petition data stands on its own).
  const { data: mpRows, error: mpErr } = await supabase
    .from('mps')
    .select('constituency_gss_code')
    .not('constituency_gss_code', 'is', null);
  if (mpErr) throw new Error(`mps read: ${mpErr.message}`);
  const knownCodes = new Set(mpRows.map((r) => r.constituency_gss_code));
  console.log(`Known constituency codes in mps table: ${knownCodes.size}`);

  const openIds = await collectIds('open');
  console.log(`Open petitions at/above threshold: ${openIds.length}`);
  const closedIds = await collectIds('closed');
  console.log(`Closed petitions at/above threshold: ${closedIds.length}`);
  const ids = [...new Set([...openIds, ...closedIds])];
  console.log(`Total to fetch: ${ids.length}`);

  let done = 0;
  let constRowTotal = 0;
  const failures = [];
  const unknownCodes = new Map(); // code -> name

  const queue = [...ids];
  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      try {
        const json = await fetchJson(`${BASE}/petitions/${id}.json`);
        const built = buildRows(json);
        for (const r of built.constRows) {
          if (!knownCodes.has(r.constituency_gss_code)) unknownCodes.set(r.constituency_gss_code, r.constituency_name);
        }
        if (!DRY_RUN) await writePetition(built);
        constRowTotal += built.constRows.length;
      } catch (e) {
        failures.push({ id, error: e.message });
      }
      done++;
      if (done % 25 === 0 || done === ids.length) console.log(`  ${done}/${ids.length} processed`);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('');
  console.log(`Petitions processed: ${ids.length - failures.length}/${ids.length}`);
  console.log(`Constituency rows ${DRY_RUN ? 'computed' : 'written'}: ${constRowTotal.toLocaleString()}`);
  if (unknownCodes.size > 0) {
    console.log(`Constituency codes not found in mps table (${unknownCodes.size}):`);
    for (const [code, name] of unknownCodes) console.log(`  ${code}  ${name}`);
  } else {
    console.log('All constituency codes matched the mps table.');
  }
  if (failures.length > 0) {
    console.log(`FAILURES (${failures.length}):`);
    for (const f of failures) console.log(`  ${f.id}: ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
