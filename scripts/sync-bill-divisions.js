// Match Commons Votes API divisions to bills in Supabase and backfill
// commons_division_id, commons_division_title, commons_vote_date,
// commons_ayes, commons_noes on the bill table.
//
// Also writes data/division-bill-map.json so sync-mp-votes.js can set
// bill_id on individual vote rows without re-running the matching.
//
// Matching strategy (in order of priority):
//   1. Exact normalised match on the pre-colon segment of the division title
//      ("Pension Schemes Bill: Third Reading" → "Pension Schemes Bill")
//   2. Jaccard word-overlap >= 0.65 on the same segment vs bill title
// Where a bill has multiple matching divisions, we prefer Third Reading,
// then Second Reading, then the most recent division by date.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEARCH_URL = 'https://commonsvotes-api.parliament.uk/data/divisions.json/search';
const MAP_FILE = path.join(__dirname, '../data/division-bill-map.json');
const DELAY_MS = 250;
const FUZZY_THRESHOLD = 0.65;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Text normalisation ────────────────────────────────────────────────────

// Words that carry no discriminating signal for bill title matching.
const STOP = new Set([
  'the','a','an','and','or','of','for','to','in','on','at','by','with',
  'from','bill','act','hl','amendment','amendments',
]);

function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b\d{4}\b/g, '')   // strip years
    .replace(/\s+/g, ' ')
    .trim();
}

function keyWords(s) {
  return new Set(normalise(s).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter(x => b.has(x)).length;
  return intersection / (a.size + b.size - intersection);
}

// Extract the bill-name segment from a division title.
// "Pension Schemes Bill: Third Reading" → "Pension Schemes Bill"
// "Pension Schemes Bill"               → "Pension Schemes Bill"
function billSegment(divTitle) {
  const colon = divTitle.indexOf(':');
  return (colon !== -1 ? divTitle.slice(0, colon) : divTitle).trim();
}

// Preference score for a division — prefer the definitive vote on a bill.
function stageScore(title) {
  const t = title.toLowerCase();
  if (/third reading/.test(t))  return 4;
  if (/second reading/.test(t)) return 3;
  if (/report stage/.test(t))   return 2;
  if (/committee stage/.test(t)) return 1;
  return 0;
}

// ─── Fetch all divisions ──────────────────────────────────────────────────

async function fetchAllDivisions() {
  // The API hard-caps pages at 25 results regardless of queryParameters.take.
  const all = [];
  let skip = 0;
  const PAGE = 25;
  while (true) {
    const url = `${SEARCH_URL}?queryParameters.take=${PAGE}&queryParameters.skip=${skip}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) { console.error(`[bill-divisions] API ${res.status} at skip=${skip}`); break; }
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (all.length % 500 === 0) console.log(`  …${all.length} divisions fetched`);
    skip += page.length;
    if (page.length < PAGE) break;
    await sleep(DELAY_MS);
  }
  return all;
}

// ─── Load bills ───────────────────────────────────────────────────────────

async function loadBills() {
  const bills = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('bill').select('id, title').range(from, from + 999);
    if (error) { console.error('[bill-divisions] bill fetch error:', error.message); break; }
    if (!data || data.length === 0) break;
    bills.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return bills;
}

// ─── Match ────────────────────────────────────────────────────────────────

function matchDivisionsToBills(divisions, bills) {
  // Exact-match lookup: normalised bill title → bill
  const exactMap = new Map();
  for (const bill of bills) exactMap.set(normalise(bill.title), bill);

  // Keyword sets for fuzzy fallback
  const billKws = bills.map(b => ({ bill: b, kws: keyWords(b.title) }));

  // bill_id → best-candidate division
  const candidates = new Map();

  for (const div of divisions) {
    const seg = billSegment(div.Title);
    const normSeg = normalise(seg);

    let matchedBill = null;
    let confidence = 0;

    // 1. Exact
    if (exactMap.has(normSeg)) {
      matchedBill = exactMap.get(normSeg);
      confidence = 1.0;
    }

    // 2. Fuzzy fallback
    if (!matchedBill) {
      const segKws = keyWords(seg);
      if (segKws.size < 2) continue; // too short to match reliably
      let best = 0, bestBill = null;
      for (const { bill, kws } of billKws) {
        const score = jaccard(segKws, kws);
        if (score > best) { best = score; bestBill = bill; }
      }
      if (best >= FUZZY_THRESHOLD) { matchedBill = bestBill; confidence = best; }
    }

    if (!matchedBill) continue;

    const existing = candidates.get(matchedBill.id);
    const thisScore = stageScore(div.Title);
    const divDate = new Date(div.Date).getTime();

    if (
      !existing ||
      thisScore > existing.stageScore ||
      (thisScore === existing.stageScore && divDate > existing.date)
    ) {
      candidates.set(matchedBill.id, {
        billId: matchedBill.id,
        billTitle: matchedBill.title,
        divisionId: div.DivisionId,
        divisionTitle: div.Title,
        voteDate: div.Date,
        ayes: div.AyeCount,
        noes: div.NoCount,
        confidence,
        stageScore: thisScore,
        date: divDate,
      });
    }
  }

  return [...candidates.values()];
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('[bill-divisions] loading bills from Supabase…');
  const bills = await loadBills();
  console.log(`[bill-divisions] ${bills.length} bills loaded`);

  console.log('[bill-divisions] fetching all divisions from Commons Votes API…');
  const divisions = await fetchAllDivisions();
  console.log(`[bill-divisions] ${divisions.length} divisions fetched`);

  console.log('[bill-divisions] matching…');
  const matches = matchDivisionsToBills(divisions, bills);
  console.log(`[bill-divisions] ${matches.length} bills matched`);

  if (matches.length === 0) { console.log('[bill-divisions] nothing to update.'); return; }

  console.log('\nSample matches (first 8):');
  matches.slice(0, 8).forEach(m =>
    console.log(`  [${m.confidence === 1.0 ? 'exact' : `fuzz ${m.confidence.toFixed(2)}`}] "${m.billTitle}" ← "${m.divisionTitle.slice(0, 70)}"`)
  );

  // Update bill rows
  let updated = 0, errors = 0;
  for (const m of matches) {
    const { error } = await supabase.from('bill').update({
      commons_division_id:    m.divisionId,
      commons_division_title: m.divisionTitle,
      commons_vote_date:      m.voteDate,
      commons_ayes:           m.ayes,
      commons_noes:           m.noes,
    }).eq('id', m.billId);
    if (error) { console.error(`  update error bill ${m.billId}:`, error.message); errors++; }
    else updated++;
    await sleep(50);
  }
  console.log(`\n[bill-divisions] updated ${updated} bills (${errors} errors)`);

  // Write division→bill_id mapping for sync-mp-votes.js
  const map = {};
  for (const m of matches) map[m.divisionId] = m.billId;
  fs.mkdirSync(path.dirname(MAP_FILE), { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`[bill-divisions] wrote ${MAP_FILE} (${Object.keys(map).length} entries)`);
}

main().catch(e => { console.error('[bill-divisions] fatal:', e?.message || e); process.exit(1); });
