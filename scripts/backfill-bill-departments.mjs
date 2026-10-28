// One-off fill of bill.bill_type_id and bill.sponsor_departments (migration 2026-10-21m) from Parliament's Bills API,
// the same fields /api/sync-bill-sponsors now keeps (owner's approval, 21 Oct 2026). One request a second, 429
// Retry-After honoured. Resumable: it only reads bills whose bill_type_id is still empty.
//   node scripts/backfill-bill-departments.mjs           dry run (reads 5 bills, writes nothing)
//   node scripts/backfill-bill-departments.mjs --write
import { createClient } from '@supabase/supabase-js';
try { (await import('dotenv')).config({ path: '.env.local', quiet: true }); } catch { /* CI sets the environment */ }

const WRITE = process.argv.includes('--write');
const API = 'https://bills-api.parliament.uk/api/v1/Bills';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function get(id) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/${id}`, { headers: { 'User-Agent': 'opengovt/1.0 (+https://opengovt.uk)', Accept: 'application/json' } });
    if (r.status === 429) { const w = Number(r.headers.get('retry-after')) || 60; console.log(`  429: waiting ${w}s`); await sleep(w * 1000); continue; }
    await sleep(1000);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  throw new Error('HTTP 429 four times');
}

const todo = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('bill').select('id, parliament_id').is('bill_type_id', null).not('parliament_id', 'is', null).order('id').range(from, from + 999);
  if (error) throw new Error(error.message);
  todo.push(...data);
  if (data.length < 1000) break;
}
console.log(`${todo.length} bills without a bill type`);
let ok = 0, failed = 0;
for (const b of WRITE ? todo : todo.slice(0, 5)) {
  try {
    const j = await get(b.parliament_id);
    const departments = [...new Set((j.sponsors || []).map((s) => s?.organisation?.name?.trim()).filter(Boolean))];
    const row = { bill_type_id: typeof j.billTypeId === 'number' ? j.billTypeId : null, sponsor_departments: departments };
    if (!WRITE) { console.log(b.id, JSON.stringify(row)); continue; }
    const { error } = await db.from('bill').update(row).eq('id', b.id);
    if (error) throw new Error(error.message);
    if (++ok % 250 === 0) console.log(`${ok} written`);
  } catch (e) {
    failed++; console.log(`bill ${b.id} (Parliament ${b.parliament_id}): ${e.message}`);
  }
}
console.log(`${WRITE ? `written ${ok}` : 'dry run'}; failed ${failed}`);
if (failed) process.exit(1);
