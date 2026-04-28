// Sync recent political donations from the Electoral Commission API.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ENDPOINT = 'https://search.electoralcommission.org.uk/api/svc/Donations/GetDonations';
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety cap — 2,000 most-recent donations

function parseAmount(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[£,]/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function fetchPage(start) {
  const url = `${ENDPOINT}?start=${start}&rows=${PAGE_SIZE}&sort=AcceptedDate&order=desc`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Electoral Commission ${res.status}`);
  return res.json();
}

async function fetchAll() {
  const out = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * PAGE_SIZE;
    let data;
    try {
      data = await fetchPage(start);
    } catch (e) {
      console.error(`page ${page} failed:`, e.message);
      break;
    }
    const items = data.Result || data.result || [];
    if (items.length === 0) break;
    for (const d of items) {
      out.push({
        ec_ref: d.ECRef ?? d.ECRefNumber ?? null,
        donor_name: d.DonorName ?? null,
        donor_status: d.DonorStatus ?? null,
        recipient_name: d.RegulatedEntityName ?? null,
        recipient_type: d.RegulatedEntityType ?? null,
        donation_type: d.DonationType ?? null,
        nature_of_donation: d.NatureOfDonation ?? null,
        value: parseAmount(d.Value),
        accepted_date: d.AcceptedDate ? String(d.AcceptedDate).slice(0, 10) : null,
        received_date: d.ReceivedDate ? String(d.ReceivedDate).slice(0, 10) : null,
        reported_date: d.ReportedDate ? String(d.ReportedDate).slice(0, 10) : null,
      });
    }
    await sleep(DELAY_MS);
  }
  return out;
}

async function main() {
  console.log('[political-donations] fetching from Electoral Commission API…');
  const rows = await fetchAll();
  console.log(`[political-donations] fetched ${rows.length} donations`);
  if (rows.length === 0) { console.log('Nothing to upsert.'); return; }
  // Batch upserts to keep payload sizes reasonable.
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await supabase
      .from('political_donations')
      .upsert(batch, { onConflict: 'ec_ref' });
    if (error) {
      console.error(`[political-donations] batch ${i}/${rows.length} upsert error:`, error.message || error);
      break;
    }
    await sleep(DELAY_MS);
  }
  console.log('[political-donations] done.');
}

main().catch((e) => { console.error('[political-donations] fatal:', e?.message || e); process.exit(0); });
