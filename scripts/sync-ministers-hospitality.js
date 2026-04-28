// Sync ministerial hospitality publication metadata from GOV.UK search API.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SEARCH_URL = 'https://www.gov.uk/api/search.json';
const QUERY = 'ministerial gifts hospitality';
const PAGE_SIZE = 100;

async function fetchAll() {
  const out = [];
  let start = 0;
  while (true) {
    const url = `${SEARCH_URL}?filter_format=transparency&q=${encodeURIComponent(QUERY)}&count=${PAGE_SIZE}&start=${start}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`GOV.UK search failed (${res.status}) at start=${start}`);
      break;
    }
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) break;
    for (const r of results) {
      out.push({
        title: r.title || null,
        description: r.description || null,
        link: r.link || null,
        organisation: (r.organisations && r.organisations[0] && r.organisations[0].title) || null,
        publication_date: r.public_timestamp ? r.public_timestamp.slice(0, 10) : null,
      });
    }
    start += results.length;
    if (start >= (data.total || 0)) break;
    await sleep(DELAY_MS);
  }
  return out;
}

async function main() {
  console.log('[ministers-hospitality] fetching from GOV.UK search API…');
  const rows = await fetchAll();
  console.log(`[ministers-hospitality] fetched ${rows.length} publications`);
  if (rows.length === 0) { console.log('Nothing to upsert.'); return; }
  const { error } = await supabase
    .from('ministers_hospitality')
    .upsert(rows, { onConflict: 'link' });
  if (error) {
    console.error('[ministers-hospitality] upsert error:', error.message || error);
  } else {
    console.log(`[ministers-hospitality] upsert ok (${rows.length} rows)`);
  }
}

main().catch((e) => { console.error('[ministers-hospitality] fatal:', e?.message || e); process.exit(0); });
