// Backfill mp_division_votes with the latest Commons divisions.
//
// The frontend reads voting record from `mp_division_votes` (NOT `mp_votes`,
// which is a leftover empty table). The table is keyed by (member_id,
// division_id) — we upsert new (division, voter) pairs since the latest
// division_date in the table.
//
// We use the divisions-search endpoint to enumerate new DivisionIds in the
// window, then GET each /data/division/{id}.json to read its Aye/No/
// Teller voter lists. That's typically a few dozen requests per night,
// vs 650 if we went per-MP.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

const SEARCH_URL = 'https://commonsvotes-api.parliament.uk/data/divisions.json/search';
const DIVISION_URL = (id) => `https://commonsvotes-api.parliament.uk/data/division/${id}.json`;
const DELAY_MS = 300;
const PROGRESS_FILE = '/tmp/mp-votes-progress.json';
const MAP_FILE = path.join(__dirname, '../data/division-bill-map.json');

function loadDivisionBillMap() {
  try { return JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')); } catch { return {}; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch { return { doneIds: [], rows: [] }; }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

async function getLatestDivisionDate() {
  const { data } = await supabase
    .from('mp_division_votes')
    .select('division_date')
    .order('division_date', { ascending: false })
    .limit(1);
  return data && data[0] ? new Date(data[0].division_date) : new Date('2024-07-04');
}

async function getExistingDivisionIds(sinceIso) {
  // Pull the full set of (division_id) already in DB that fall within the
  // backfill window so we can skip them.
  const ids = new Set();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mp_division_votes')
      .select('division_id')
      .gte('division_date', sinceIso)
      .range(from, from + 999);
    if (error) { console.error('[mp-votes] read existing error:', error.message); break; }
    if (!data || data.length === 0) break;
    for (const r of data) ids.add(r.division_id);
    if (data.length < 1000) break;
    from += 1000;
  }
  return ids;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function listDivisionsSince(sinceDate) {
  const start = sinceDate.toISOString().slice(0, 10);
  const end = new Date().toISOString().slice(0, 10);
  const all = [];
  let skip = 0;
  while (true) {
    const url = `${SEARCH_URL}?queryParameters.startDate=${start}&queryParameters.endDate=${end}&queryParameters.take=200&queryParameters.skip=${skip}`;
    const page = await fetchJson(url);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < 200) break;
    skip += 200;
    await sleep(DELAY_MS);
  }
  return all;
}

async function main() {
  // Fixed look-back window. Using "latest division_date in DB" as the start
  // is fragile: a partial insert pushes the latest forward and skips the
  // earlier divisions that were missed. Scan a fixed 60-day window every
  // run; upsert idempotency makes redundant rows free.
  const lookbackDays = Number(process.env.LOOKBACK_DAYS || 60);
  const sinceDate = new Date(Date.now() - lookbackDays * 24 * 3600 * 1000);
  const sinceIso = sinceDate.toISOString().slice(0, 10);
  console.log(`[mp-votes] scanning divisions since ${sinceIso} (${lookbackDays}-day window)`);

  const divisionBillMap = loadDivisionBillMap();
  console.log(`[mp-votes] loaded division→bill map: ${Object.keys(divisionBillMap).length} entries`);

  const latestInDb = await getLatestDivisionDate();
  console.log(`[mp-votes] latest division_date already in DB: ${latestInDb.toISOString()}`);
  const existingIds = await getExistingDivisionIds(sinceIso);
  console.log(`[mp-votes] ${existingIds.size} division_ids already covered in window`);

  const divs = await listDivisionsSince(sinceDate);
  console.log(`[mp-votes] ${divs.length} divisions found from search`);

  const todo = divs.filter((d) => !existingIds.has(d.DivisionId));
  console.log(`[mp-votes] ${todo.length} new divisions to backfill`);
  if (todo.length === 0) {
    console.log('[mp-votes] nothing new — done.');
    return;
  }

  const progress = loadProgress();
  const doneSet = new Set(progress.doneIds);

  for (let i = 0; i < todo.length; i++) {
    const d = todo[i];
    if (doneSet.has(d.DivisionId)) continue;
    let detail;
    try {
      detail = await fetchJson(DIVISION_URL(d.DivisionId));
    } catch (e) {
      console.warn(`  [${i + 1}/${todo.length}] div ${d.DivisionId} fetch failed: ${e.message}`);
      await sleep(DELAY_MS);
      continue;
    }

    const dateIso = String(detail.Date || d.Date);
    const title = detail.Title || d.Title || null;

    const ayes = (detail.Ayes || []).map((m) => ({ member_id: m.MemberId, vote_type: 'aye' }));
    const noes = (detail.Noes || []).map((m) => ({ member_id: m.MemberId, vote_type: 'no' }));
    const ayeTellers = (detail.AyeTellers || []).map((m) => ({ member_id: m.MemberId, vote_type: 'aye' }));
    const noTellers = (detail.NoTellers || []).map((m) => ({ member_id: m.MemberId, vote_type: 'no' }));

    // Tellers don't appear in the regular Aye/No lists — include them.
    const all = [...ayes, ...noes, ...ayeTellers, ...noTellers];
    const billId = divisionBillMap[detail.DivisionId] ?? null;

    for (const v of all) {
      progress.rows.push({
        member_id: v.member_id,
        division_id: detail.DivisionId,
        vote_type: v.vote_type,
        bill_id: billId,
        division_date: dateIso,
        division_title: title,
        is_rebellion: false,
      });
    }

    progress.doneIds.push(d.DivisionId);
    doneSet.add(d.DivisionId);

    if (i % 5 === 0 || i === todo.length - 1) {
      console.log(`  [${i + 1}/${todo.length}] div ${detail.DivisionId} "${title?.slice(0, 50)}" — ${ayes.length} aye, ${noes.length} no`);
      saveProgress(progress);
    }
    await sleep(DELAY_MS);
  }
  saveProgress(progress);

  if (!progress.rows.length) { console.log('[mp-votes] no rows produced.'); return; }
  console.log(`[mp-votes] inserting ${progress.rows.length} vote rows…`);

  // member_slug NOT NULL constraint on mp_votes; mp_division_votes doesn't
  // have it (verified empirically — the frontend reads from the latter).
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < progress.rows.length; i += BATCH) {
    const batch = progress.rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('mp_division_votes')
      .upsert(batch, { onConflict: 'member_id,division_id', ignoreDuplicates: true });
    if (error) {
      console.error(`[mp-votes] insert batch ${i} error:`, error.message || error);
      break;
    }
    inserted += batch.length;
    console.log(`[mp-votes] inserted ${inserted}/${progress.rows.length}`);
    await sleep(150);
  }
  console.log('[mp-votes] done.');
}

main().catch((e) => { console.error('[mp-votes] fatal:', e?.message || e); process.exit(0); });
