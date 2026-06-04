#!/usr/bin/env node
// One-off: backfill press_releases.body for the 100 retained rows.
// Uses supabase-js with the service role key — avoids the psql escape
// hell that arbitrary HTML body content (quotes, dollar signs) creates.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon key) in .env.local');
  process.exit(1);
}

const supabase = createClient(URL, KEY);

(async () => {
  const { data: rows, error } = await supabase
    .from('press_releases')
    .select('id, gov_url')
    .is('body', null)
    .not('gov_url', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('Select failed:', error.message);
    process.exit(1);
  }
  console.log(`Found ${rows.length} press_releases without a body — backfilling.`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const r of rows) {
    const path = r.gov_url.replace(/^https?:\/\/[^/]+/, '');
    try {
      const res = await fetch(`https://www.gov.uk/api/content${path}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
      });
      if (!res.ok) {
        console.log(`  ✗ ${r.id}  HTTP ${res.status}  ${path}`);
        fail++;
        continue;
      }
      const data = await res.json();
      const body = data?.details?.body || null;
      if (!body) {
        console.log(`  ⌀ ${r.id}  no body in payload  ${path}`);
        skip++;
        continue;
      }
      const { error: updErr } = await supabase
        .from('press_releases')
        .update({ body, body_fetched_at: new Date().toISOString() })
        .eq('id', r.id);
      if (updErr) {
        console.log(`  ✗ ${r.id}  update failed: ${updErr.message}`);
        fail++;
        continue;
      }
      ok++;
      if (ok % 10 === 0) console.log(`  ${ok}/${rows.length} done`);
    } catch (e) {
      console.log(`  ✗ ${r.id}  ${e.message.split('\n')[0]}`);
      fail++;
    }
    await new Promise((res) => setTimeout(res, 100));
  }
  console.log(`\nDone. ok=${ok} skip=${skip} fail=${fail}`);
})();
