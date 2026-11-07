// One IndexNow submission of a given list of changed pages (owner, 7 Nov 2026, V1): for corrections made before the site
// submitted changes itself (lib/indexnow.ts). Not for the whole site: IndexNow is for changed pages only.
//   node scripts/indexnow-once.mjs <list.json> <reason>
// list.json: an array of paths ("/standards") or an object keyed by path. Up to 10,000 a request. Records each address in
// sync_cursor 'indexnow:recent' like the site does, so it is not sent again within 10 minutes. Prints one line: the count and
// the response code. Reads .env.local for the database; prints no secrets.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

try { (await import('dotenv')).config({ path: '.env.local', quiet: true }); } catch { /* the environment is set */ }
const [file, reason = 'once'] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/indexnow-once.mjs <list.json> <reason>'); process.exit(1); }
const HOST = 'www.opengovt.uk';
const keyFile = fs.readdirSync('public').find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) { console.error('no IndexNow key file in public/'); process.exit(1); }
const key = fs.readFileSync(`public/${keyFile}`, 'utf8').trim();
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const paths = Array.isArray(raw) ? raw : Object.keys(raw);
const urls = [...new Set(paths.filter((p) => typeof p === 'string' && p.startsWith('/') && !p.includes('[')).map((p) => `https://${HOST}${p === '/' ? '' : p}`))];
if (urls.length > 10000) { console.error('more than 10,000 addresses: split the list'); process.exit(1); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: urls }),
  signal: AbortSignal.timeout(30000),
});
const body = (await res.text()).slice(0, 200).replace(/\s+/g, ' ');
console.log(`[indexnow] ${reason}: ${urls.length} sent, HTTP ${res.status}${body ? ` (${body})` : ''}`);

if (res.status === 200 || res.status === 202) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data } = await db.from('sync_cursor').select('cursor').eq('route', 'indexnow:recent').maybeSingle();
  const now = Date.now();
  const recent = Object.fromEntries(Object.entries(data?.cursor ?? {}).filter(([, t]) => now - t < 600000));
  for (const u of urls) recent[u] = now;
  const { error } = await db.from('sync_cursor').upsert({ route: 'indexnow:recent', cursor: recent, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  if (error) console.error(`sync_cursor indexnow:recent not written: ${error.message}`);
}
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
