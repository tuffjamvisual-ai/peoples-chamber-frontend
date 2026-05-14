require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/photos/mps`;

if (!DATABASE_URL) { console.error('DATABASE_URL missing — needed to bypass RLS for UPDATEs'); process.exit(1); }

const s = createClient(SUPABASE_URL, ANON_KEY);

const LEADING = new Set(['the', 'rt', 'hon', 'sir', 'dame', 'dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'lord', 'baroness', 'lady', 'baron']);
const TRAILING = new Set(['mp', 'kc', 'qc', 'mbe', 'obe', 'cbe', 'dbe', 'kcb', 'gcb', 'gbe', 'dso', 'mc', 'jp', 'pc', 'kcmg', 'gcmg', 'dl', 'frs', 'frcp', 'frcs', 'phd', 'md', 'bsc', 'bem']);

function normalize(name) {
  if (!name) return '';
  let n = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '');
  n = n.toLowerCase().replace(/[–—]/g, '-').replace(/[.,’']/g, '');
  let tokens = n.split(/\s+/).filter(Boolean);
  while (tokens.length && LEADING.has(tokens[0])) tokens.shift();
  while (tokens.length && TRAILING.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(' ').trim();
}

function lastInitialKey(normalized) {
  const t = normalized.split(' ').filter(Boolean);
  if (t.length < 2) return null;
  return `${t[t.length - 1]}:${t[0][0]}`;
}

async function loadAllMps() {
  let all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from('mps').select('member_id, name, display_name').range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  return all;
}

async function run() {
  const mps = await loadAllMps();
  console.log(`Loaded ${mps.length} mps`);

  const exact = new Map();
  const lastInit = new Map();
  const lastInitDup = new Set();

  for (const mp of mps) {
    if (!mp.member_id) continue;
    for (const cand of [mp.display_name, mp.name]) {
      const k = normalize(cand);
      if (!k) continue;
      if (!exact.has(k)) exact.set(k, mp.member_id);
      const li = lastInitialKey(k);
      if (li) {
        if (lastInit.has(li) && lastInit.get(li) !== mp.member_id) lastInitDup.add(li);
        else if (!lastInit.has(li)) lastInit.set(li, mp.member_id);
      }
    }
  }
  for (const k of lastInitDup) lastInit.delete(k);
  console.log(`Exact lookup: ${exact.size}, last+initial fallback: ${lastInit.size}`);

  const { data: ministers, error: mErr } = await s
    .from('dept_ministers')
    .select('id, name, slug')
    .or('member_id.is.null,photo_url.is.null');
  if (mErr) { console.error('Fetch ministers error:', mErr.message); process.exit(1); }
  console.log(`Ministers needing update: ${ministers.length}`);

  const updates = [];
  const unmatched = [];
  for (const m of ministers) {
    const key = normalize(m.name);
    let memberId = exact.get(key);
    let how = 'exact';
    if (!memberId) {
      const li = lastInitialKey(key);
      if (li) memberId = lastInit.get(li);
      how = 'last+initial';
    }
    if (!memberId) { unmatched.push(`${m.name}  [normalized: "${key}"]`); continue; }
    updates.push({ id: m.id, member_id: memberId, name: m.name, how });
  }
  console.log(`Matched: ${updates.length}/${ministers.length}, unmatched: ${unmatched.length}`);

  const sqlPath = path.join(__dirname, '.sync-minister-photos.sql');
  const lines = ['BEGIN;'];
  for (const u of updates) {
    const url = `${STORAGE_BASE}/${u.member_id}.jpg`;
    lines.push(`UPDATE dept_ministers SET member_id = ${u.member_id}, photo_url = '${url}' WHERE id = ${u.id};`);
  }
  lines.push('COMMIT;');
  fs.writeFileSync(sqlPath, lines.join('\n') + '\n');
  console.log(`Wrote ${updates.length} UPDATEs to ${sqlPath}`);

  console.log('Executing via psql...');
  const out = execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], { encoding: 'utf8' });
  process.stdout.write(out);

  for (const u of updates) console.log(`  ${u.how === 'exact' ? '  ' : '~ '}${u.name} → ${u.member_id}`);
  if (unmatched.length) {
    console.log(`\nUnmatched (${unmatched.length}) — likely peers (Lords/Baronesses) not in the mps table:`);
    for (const u of unmatched) console.log(`  - ${u}`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
