require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required (psql is used to bypass anon RLS for the writes)'); process.exit(1); }

const s = createClient(SUPABASE_URL, ANON_KEY);
const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function loadAllBills() {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from('bill').select('id, parliament_id').not('parliament_id', 'is', null).range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  return all;
}

async function processBill(b) {
  try {
    const d = await fetchJson(`https://bills-api.parliament.uk/api/v1/Bills/${b.parliament_id}`);
    const sponsors = (d.sponsors || []).filter((sp) => sp && sp.member && sp.member.memberId);
    sponsors.sort((a, x) => (a.sortOrder ?? 9999) - (x.sortOrder ?? 9999));
    const sp = sponsors[0];
    if (!sp) return { id: b.id, none: true };
    const m = sp.member;
    return {
      id: b.id,
      sponsor_member_id: m.memberId,
      sponsor_name: m.name || '',
      sponsor_party: m.party || '',
      sponsor_party_colour: m.partyColour || '',
      sponsor_photo: m.memberPhoto || '',
      sponsor_page: m.memberPage || '',
      sponsor_constituency: m.memberFrom || '',
    };
  } catch (e) {
    return { id: b.id, error: e.message };
  }
}

async function withConcurrency(items, n, worker) {
  const out = new Array(items.length);
  let i = 0;
  async function run() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx]);
      if ((idx + 1) % 250 === 0) console.log(`  progress: ${idx + 1} / ${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: n }, run));
  return out;
}

async function main() {
  const bills = await loadAllBills();
  console.log(`Bills with parliament_id: ${bills.length}`);

  console.log('Fetching upstream sponsor data (concurrency=8)...');
  const t0 = Date.now();
  const results = await withConcurrency(bills, 8, processBill);
  console.log(`Upstream pass complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const ok = results.filter((r) => r && r.sponsor_member_id);
  const none = results.filter((r) => r && r.none);
  const errs = results.filter((r) => r && r.error);
  console.log(`  with sponsor: ${ok.length}`);
  console.log(`  no sponsor (legitimate, e.g. Lords / petitioned): ${none.length}`);
  console.log(`  errors: ${errs.length}`);
  if (errs.length) {
    console.log('  first 5 errors:');
    errs.slice(0, 5).forEach((e) => console.log(`    bill_id=${e.id}: ${e.error}`));
  }

  const sqlPath = path.join(__dirname, '.backfill-bill-sponsors.sql');
  const lines = [
    'BEGIN;',
    'ALTER TABLE bill ADD COLUMN IF NOT EXISTS sponsor_member_id integer;',
    'CREATE INDEX IF NOT EXISTS idx_bill_sponsor_member_id ON bill(sponsor_member_id);',
  ];
  for (const r of ok) {
    lines.push(`UPDATE bill SET sponsor_member_id=${r.sponsor_member_id}, sponsor_name=${sqlEsc(r.sponsor_name)}, sponsor_party=${sqlEsc(r.sponsor_party)}, sponsor_party_colour=${sqlEsc(r.sponsor_party_colour)}, sponsor_photo=${sqlEsc(r.sponsor_photo)}, sponsor_page=${sqlEsc(r.sponsor_page)}, sponsor_constituency=${sqlEsc(r.sponsor_constituency)} WHERE id=${r.id};`);
  }
  // Recompute mps.bills_sponsored_count from the freshly-populated column.
  lines.push('UPDATE mps SET bills_sponsored_count = 0;');
  lines.push("UPDATE mps SET bills_sponsored_count = t.cnt FROM (SELECT sponsor_member_id, count(*) AS cnt FROM bill WHERE sponsor_member_id IS NOT NULL GROUP BY sponsor_member_id) t WHERE mps.member_id = t.sponsor_member_id;");
  lines.push('COMMIT;');
  fs.writeFileSync(sqlPath, lines.join('\n') + '\n');
  console.log(`Wrote ${ok.length + 4} SQL lines to ${sqlPath} (one txn)`);

  console.log('Executing via psql...');
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], { stdio: 'inherit' });
  fs.unlinkSync(sqlPath);
  console.log('Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
