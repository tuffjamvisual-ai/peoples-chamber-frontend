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
// Only Second and Third Reading divisions are used (the vote on the bill itself); Third
// Reading is preferred, then Second Reading, then the most recent by date.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { realtime: { transport: ws } });

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
  let t = String(divTitle || '').trim();
  // "Third Reading of the European Union (Withdrawal Agreement) Bill"
  t = t.replace(/^(second|third) reading of (the )?/i, '');
  const colon = t.indexOf(':');
  t = (colon !== -1 ? t.slice(0, colon) : t).trim();
  // "Bank of England and Financial Services (Third Reading) Bill"
  return t.replace(/\s*\((second|third) reading\)\s*/i, ' ').replace(/\s+/g, ' ').trim();
}

// 4 = Third Reading, 3 = Second Reading, 0 = anything else. A reading counts only when the
// division IS the reading: the words after the bill name end with it and are not an
// amendment, motion or instruction about it ("Reasoned Amendment to Second Reading" is not
// the vote on the bill, audit P10). "(Amendment)" inside the bill's own name is fine.
function stageScore(title) {
  const t = String(title || '').trim();
  const lower = t.toLowerCase();
  const pre = lower.match(/^(second|third) reading of /);
  if (pre) return pre[1] === 'third' ? 4 : 3;
  const inName = lower.match(/\((second|third) reading\)\s*bill/);
  if (inName) return inName[1] === 'third' ? 4 : 3;
  const colon = t.indexOf(':');
  if (colon === -1) return 0;
  const rest = lower.slice(colon + 1).trim();
  if (/amendment|amdt|motion|instruction|resolution|programme|revival|closure/.test(rest)) return 0;
  if (/^third reading[\s.]*$/.test(rest)) return 4;
  if (/^second reading[\s.]*$/.test(rest)) return 3;
  return 0;
}

// The days a bill was before Parliament: first to last stage sitting, a day either side.
// A division outside that window is not on this bill, however alike the names (the 2016
// Investigatory Powers Bill vote was matched to the 2024 Investigatory Powers (Amendment)
// Act, audit P10).
const DAY = 86400000;
function billWindow(bill) {
  const dates = [];
  for (const st of (bill.stages && bill.stages.items) || []) {
    for (const s of st.stageSittings || []) if (s && s.date) dates.push(new Date(s.date).getTime());
  }
  if (!dates.length) return null;
  return { from: Math.min(...dates) - DAY, to: Math.max(...dates) + DAY };
}

// "X Act 2016" → "x bill"; "X Bill [HL]" → "x bill", so an Act and the bill it came from compare equal.
function billName(title) {
  return normalise(String(title || '').replace(/\[(hl|lords)\]/ig, '').replace(/\s+act(\s+\d{4})?\s*$/i, ' bill'));
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
    const { data, error } = await supabase.from('bill').select('id, title, stages').order('id').range(from, from + 999);
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
  const prepared = bills
    .map((b) => ({ bill: b, name: billName(b.title), kws: keyWords(String(b.title || '').replace(/\[(hl|lords)\]/ig, '')), win: billWindow(b) }))
    .filter((p) => p.win); // a bill with no sitting dates cannot be checked, so is not matched

  // bill_id → best-candidate division
  const candidates = new Map();
  // division id → bill id, for every matched division
  const divisionBill = new Map();

  for (const div of divisions) {
    const seg = billSegment(div.Title);
    const segName = billName(seg);
    const segKws = keyWords(seg.replace(/\[(hl|lords)\]/ig, ''));
    const divDate = new Date(div.Date).getTime();

    // Bills whose name matches (exactly, or by word overlap) AND that were before Parliament
    // on the day of the vote. Exact name beats overlap; higher overlap beats lower.
    let matchedBill = null;
    let confidence = 0;
    for (const p of prepared) {
      if (divDate < p.win.from || divDate > p.win.to) continue;
      let score = 0;
      if (p.name === segName) score = 1.0;
      else if (segKws.size >= 2) { const j = jaccard(segKws, p.kws); if (j >= FUZZY_THRESHOLD) score = Math.min(j, 0.99); }
      if (score > confidence) { confidence = score; matchedBill = p.bill; }
    }
    if (!matchedBill) continue;

    // Every matched division maps to its bill for vote rows (data/division-bill-map.json),
    // including amendment votes; only the bill's own headline figure is readings-only.
    divisionBill.set(div.DivisionId, matchedBill.id);
    const thisScore = stageScore(div.Title);
    if (thisScore < 3) continue;
    const existing = candidates.get(matchedBill.id);
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

  return { matches: [...candidates.values()], divisionBill };
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
  const { matches, divisionBill } = matchDivisionsToBills(divisions, bills);
  console.log(`[bill-divisions] ${matches.length} bills matched`);

  if (matches.length === 0) { console.log('[bill-divisions] nothing to update.'); return; }

  console.log('\nSample matches (first 8):');
  matches.slice(0, 8).forEach(m =>
    console.log(`  [${m.confidence === 1.0 ? 'exact' : `fuzz ${m.confidence.toFixed(2)}`}] "${m.billTitle}" ← "${m.divisionTitle.slice(0, 70)}"`)
  );

  // Update bill rows
  let updated = 0, errors = 0;
  for (const m of matches) {
    // Fills bills that have no Commons division yet; never replaces one already saved
    // (app/api/sync-bill-commons-votes fills the same fields for Third Readings, and the two
    // used to overwrite each other).
    const { error } = await supabase.from('bill').update({
      commons_division_id:    m.divisionId,
      commons_division_title: m.divisionTitle,
      commons_vote_date:      m.voteDate,
      commons_ayes:           m.ayes,
      commons_noes:           m.noes,
    }).eq('id', m.billId).is('commons_division_id', null);
    if (error) { console.error(`  update error bill ${m.billId}:`, error.message); errors++; }
    else updated++;
    await sleep(50);
  }
  console.log(`\n[bill-divisions] updated ${updated} bills (${errors} errors)`);

  // Write division→bill_id mapping for sync-mp-votes.js
  const map = {};
  for (const [divisionId, billId] of divisionBill) map[divisionId] = billId;
  fs.mkdirSync(path.dirname(MAP_FILE), { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`[bill-divisions] wrote ${MAP_FILE} (${Object.keys(map).length} entries)`);
  // Any failed update fails the run so the workflow reports it.
  if (errors) process.exit(1);
}

main().catch(e => { console.error('[bill-divisions] fatal:', e?.message || e); process.exit(1); });
