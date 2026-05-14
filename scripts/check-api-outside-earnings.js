// Read-only. For every current MP, ask Parliament's RegisteredInterests
// API whether they have any entries in category "1. Employment and
// earnings" (excluding deleted entries). Compare against our
// mp_outside_earnings_summary table.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const CONCURRENCY = 12;
const CATEGORY_PREFIX = '1. Employment and earnings';

async function fetchEarnings(memberId) {
  try {
    const res = await fetch(`https://members-api.parliament.uk/api/Members/${memberId}/RegisteredInterests`);
    if (!res.ok) return { memberId, ok: false, status: res.status };
    const data = await res.json();
    const cat = (data.value || []).find((c) => (c.name || '').startsWith(CATEGORY_PREFIX));
    if (!cat) return { memberId, ok: true, count: 0 };
    const live = (cat.interests || []).filter((i) => !i.deletedWhen);
    return { memberId, ok: true, count: live.length };
  } catch (e) {
    return { memberId, ok: false, error: e.message };
  }
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

(async () => {
  console.log('Fetching current MPs…');
  const { data: mps, error } = await supabase
    .from('mps')
    .select('member_id, name, display_name')
    .eq('current_member', true);
  if (error) { console.error(error); process.exit(1); }
  console.log(`Current MPs: ${mps.length}`);

  console.log(`Probing Parliament API (concurrency=${CONCURRENCY})…`);
  const t0 = Date.now();
  const results = await runWithConcurrency(mps.map((m) => m.member_id), CONCURRENCY, fetchEarnings);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s.\n`);

  const apiHasEarnings = new Set();
  const apiCounts = new Map();
  let apiFailed = 0;
  for (const r of results) {
    if (!r.ok) { apiFailed++; continue; }
    if (r.count > 0) {
      apiHasEarnings.add(r.memberId);
      apiCounts.set(r.memberId, r.count);
    }
  }
  console.log(`API failures: ${apiFailed}`);
  console.log(`API says have Category-1 earnings: ${apiHasEarnings.size}`);

  // DB side
  const { data: oe } = await supabase
    .from('mp_outside_earnings_summary')
    .select('member_id, total_extracted, claim_count')
    .gt('total_extracted', 0);
  const dbHasEarnings = new Set(oe.map((r) => r.member_id));
  console.log(`DB says have outside earnings (mp_outside_earnings_summary.total_extracted > 0): ${dbHasEarnings.size}`);

  // Diff
  const onlyAPI = [...apiHasEarnings].filter((m) => !dbHasEarnings.has(m));
  const onlyDB  = [...dbHasEarnings].filter((m) => !apiHasEarnings.has(m));
  const both    = [...apiHasEarnings].filter((m) => dbHasEarnings.has(m));
  console.log(`\nOverlap: ${both.length}`);
  console.log(`API only (we're missing them): ${onlyAPI.length}`);
  console.log(`DB only (API doesn't list them in cat 1): ${onlyDB.length}`);

  if (onlyAPI.length) {
    console.log(`\nSample API-only (we should backfill these):`);
    for (const id of onlyAPI.slice(0, 20)) {
      const mp = mps.find((m) => m.member_id === id);
      console.log(`  member_id ${id}  ${mp?.display_name || mp?.name}  (API claims: ${apiCounts.get(id)} cat-1 interests)`);
    }
    if (onlyAPI.length > 20) console.log(`  … +${onlyAPI.length - 20} more`);
  }
  if (onlyDB.length) {
    console.log(`\nSample DB-only (in our table but not in current API cat 1):`);
    for (const id of onlyDB.slice(0, 10)) {
      const mp = mps.find((m) => m.member_id === id);
      const e = oe.find((r) => r.member_id === id);
      console.log(`  member_id ${id}  ${mp?.display_name || mp?.name || '(not current MP)'}  £${Number(e.total_extracted).toLocaleString()} extracted`);
    }
    if (onlyDB.length > 10) console.log(`  … +${onlyDB.length - 10} more`);
  }
})();
