// Sync All-Party Parliamentary Groups from data.parliament.uk OData feed.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ENDPOINT = 'https://data.parliament.uk/api/odata/AllPartyGroups';
const PAGE_SIZE = 100;

async function fetchAll() {
  const out = [];
  let url = `${ENDPOINT}?$top=${PAGE_SIZE}&$format=json`;
  while (url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`Parliament OData failed (${res.status}) at ${url}`);
      break;
    }
    const data = await res.json();
    const value = data.value || data.d?.results || [];
    if (value.length === 0) break;
    for (const g of value) {
      out.push({
        group_id: g.GroupId ?? g.Id ?? null,
        title: g.Title ?? g.Name ?? null,
        purpose: g.Purpose ?? g.PurposeDescription ?? null,
        chair: g.Chair ?? null,
        registered_secretariat: g.RegisteredSecretariat ?? g.Secretariat ?? null,
        contact: g.PublicEnquiryPoint ?? g.Contact ?? null,
        last_updated: g.UpdatedDate ? String(g.UpdatedDate).slice(0, 10) : null,
      });
    }
    url = data['odata.nextLink'] || data['@odata.nextLink'] || null;
    if (url && !url.startsWith('http')) url = `${ENDPOINT}?${url.split('?').pop()}`;
    await sleep(DELAY_MS);
  }
  return out;
}

async function main() {
  console.log('[appgs] fetching from data.parliament.uk OData…');
  const rows = await fetchAll();
  console.log(`[appgs] fetched ${rows.length} groups`);
  if (rows.length === 0) { console.log('Nothing to upsert.'); return; }
  const { error } = await supabase
    .from('appg_register')
    .upsert(rows, { onConflict: 'group_id' });
  if (error) {
    console.error('[appgs] upsert error:', error.message || error);
  } else {
    console.log(`[appgs] upsert ok (${rows.length} rows)`);
  }
}

main().catch((e) => { console.error('[appgs] fatal:', e?.message || e); process.exit(0); });
