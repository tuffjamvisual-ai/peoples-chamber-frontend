// Sync political donations from the Electoral Commission search API.
// Endpoint: https://search.electoralcommission.org.uk/api/search/Donations
// Filtered to donations reported on/after the current government took office (2024-07-04).
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ENDPOINT = 'https://search.electoralcommission.org.uk/api/search/Donations';
const FROM_DATE = '2024-07-04';
const TO_DATE = '2026-12-31';
const PAGE_SIZE = 50; // API hard-caps at 50 regardless of requested rows.
const MAX_PAGES = 200; // safety cap — covers up to 10,000 donations
const DELAY_MS = 400;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseAmount(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[£,]/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isoDate(v) {
  if (!v) return null;
  const s = String(v);
  // Microsoft /Date(milliseconds)/ format used by the EC API.
  const msMatch = s.match(/\/Date\((-?\d+)\)\//);
  if (msMatch) {
    const ms = Number(msMatch[1]);
    if (!Number.isFinite(ms)) return null;
    const iso = new Date(ms).toISOString().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  const head = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : null;
}

function buildUrl(start) {
  const params = new URLSearchParams({
    start: String(start),
    rows: String(PAGE_SIZE),
    query: '',
    sort: 'AcceptedDate',
    order: 'desc',
    date: 'Reported',
    from: FROM_DATE,
    to: TO_DATE,
    prePoll: 'false',
    postPoll: 'true',
    register: 'gb',
    isIrishSourceYes: 'true',
    isIrishSourceNo: 'true',
    includeOutsideSection75: 'true',
  });
  // Donor entity types — must be appended as repeated `et=` values.
  const etValues = ['pp', 'ppm', 'tp', 'perpar', 'rd'];
  for (const et of etValues) params.append('et', et);
  return `${ENDPOINT}?${params.toString()}`;
}

async function fetchPage(start) {
  const url = buildUrl(start);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Electoral Commission ${res.status}`);
  return res.json();
}

async function fetchAll() {
  const out = [];
  let total = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * PAGE_SIZE;
    let data;
    try {
      data = await fetchPage(start);
    } catch (e) {
      console.error(`[political-donations] page ${page} failed:`, e.message);
      break;
    }
    const items = data.Result || data.result || [];
    if (total == null) {
      total = data.Total ?? data.total ?? null;
      console.log(`[political-donations] API reports Total=${total}`);
    }
    if (items.length === 0) break;
    for (const d of items) {
      out.push({
        ec_ref: d.ECRef ?? d.ECRefNumber ?? null,
        donor_name: d.DonorName ?? null,
        donor_type: d.DonorStatus ?? null,
        recipient_name: d.RegulatedEntityName ?? null,
        recipient_type: d.RegulatedDoneeType ?? d.RegulatedEntityType ?? null,
        nature: d.NatureOfDonation ?? d.DonationType ?? null,
        amount: parseAmount(d.Value),
        accepted_date: isoDate(d.AcceptedDate),
        received_date: isoDate(d.ReceivedDate) ?? isoDate(d.AcceptedDate),
        reported_date: isoDate(d.ReportedDate),
      });
    }
    console.log(`[political-donations] page ${page}: +${items.length} rows (running total ${out.length})`);
    if (items.length < PAGE_SIZE) break;
    await sleep(DELAY_MS);
  }
  return out;
}

async function main() {
  console.log(`[political-donations] fetching from Electoral Commission API (reported ${FROM_DATE} → ${TO_DATE})…`);
  const rows = await fetchAll();
  console.log(`[political-donations] fetched ${rows.length} donations`);
  if (rows.length === 0) {
    console.log('[political-donations] nothing to insert.');
    return;
  }

  // Wipe-and-insert: drop the date-filtered window plus any null-date orphans
  // from earlier malformed runs. Two passes since PostgREST can't OR a comparison
  // with IS NULL in a single .delete().
  console.log(`[political-donations] wiping rows with reported_date >= ${FROM_DATE}…`);
  const { error: delErr } = await supabase
    .from('political_donations')
    .delete()
    .gte('reported_date', FROM_DATE);
  if (delErr) {
    console.error('[political-donations] wipe error:', delErr.message || delErr);
    return;
  }
  const { error: nullErr } = await supabase
    .from('political_donations')
    .delete()
    .is('reported_date', null);
  if (nullErr) {
    console.error('[political-donations] null-date wipe error:', nullErr.message || nullErr);
    return;
  }

  // Batch inserts to keep payload sizes reasonable.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('political_donations').insert(batch);
    if (error) {
      console.error(`[political-donations] insert batch ${i}/${rows.length} error:`, error.message || error);
      break;
    }
    inserted += batch.length;
    console.log(`[political-donations] inserted ${inserted}/${rows.length}`);
    await sleep(200);
  }
  console.log('[political-donations] done.');
}

main().catch((e) => { console.error('[political-donations] fatal:', e?.message || e); process.exit(0); });
