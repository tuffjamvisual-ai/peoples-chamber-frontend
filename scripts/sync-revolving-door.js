// Sync ACOBA (Advisory Committee on Business Appointments) publications —
// the closest public record of "revolving door" cases between government and
// the private sector. Stored at publication-level metadata; per-case PDF
// parsing is a separate concern.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SEARCH_URL = 'https://www.gov.uk/api/search.json';
const ACOBA = 'advisory-committee-on-business-appointments';
const PAGE_SIZE = 100;

async function fetchAll() {
  const out = [];
  let start = 0;
  while (true) {
    const url = `${SEARCH_URL}?filter_organisations=${ACOBA}&count=${PAGE_SIZE}&start=${start}`;
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
        document_type: r.format || null,
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
  console.log('[revolving-door] fetching ACOBA publications from GOV.UK…');
  const rows = await fetchAll();
  console.log(`[revolving-door] fetched ${rows.length} publications`);
  if (rows.length === 0) { console.log('Nothing to upsert.'); return; }
  const { error } = await supabase
    .from('revolving_door')
    .upsert(rows, { onConflict: 'link' });
  if (error) {
    console.error('[revolving-door] upsert error:', error.message || error);
  } else {
    console.log(`[revolving-door] upsert ok (${rows.length} rows)`);
  }
}

main().catch((e) => { console.error('[revolving-door] fatal:', e?.message || e); process.exit(0); });
