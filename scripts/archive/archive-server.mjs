// Archive search from the SSD only (Cowork ENTRY 480 PART A, owner approved 21 Nov 2026 22:44; plan in
// audit/archive-480/SSD-ONLY-PLAN.md; owner standing rule 18:12: anything archive is SSD only, nothing in Supabase).
// Reads the full text index /Volumes/EDGE_SSD/opengovt-index/opengovt-archive.sqlite (SQLite FTS5 table docs: dataset,
// title, date, path, url, body; 3,194,300 records) READ ONLY, and answers our own server (app/archive) through the
// ngrok tunnel. Never linked, never public. Run by a LaunchAgent (scripts/archive/launchd/).
//
//   ARCHIVE_KEY_FILE=<file holding the secret, mode 600> node scripts/archive/archive-server.mjs [--db <file.sqlite>]
//
//   GET /search?q=<words>&dataset=<name>&page=<0..24>
//        -> 200 {"hits":[{"id","dataset","title","date","url","snippet"}], "more": bool, "page": n}   (20 a page)
//   GET /datasets -> 200 {"datasets":[{"name","records"}]}   (from datasets.json, read once at start)
//   GET /r/<id>   -> 200 {"id","dataset","title","date","url","text"}   (one record; text at most 300,000 characters)
//
// Security design (as the ENTRY 480 full text server T2 reviewed, widened to the SQLite file):
//   - binds 127.0.0.1 only (port 3391): nothing on the network reaches it except through the tunnel on this Mac;
//   - refuses to start without the key (ARCHIVE_KEY_FILE, a file readable by this user only; or ARCHIVE_KEY; at least 32
//     characters); every request needs the header x-archive-key equal to it, compared in constant time (SHA-256 of both,
//     crypto.timingSafeEqual), else 401; the key is never logged;
//   - read only: the database is opened with readOnly (SQLite refuses every write); GET only (else 405), no request body
//     read; this server writes nothing anywhere except its log line;
//   - rate limits: 5 requests a second and 600 a minute in all (sliding windows over every request, before the key check,
//     so guessing the key is slow too), else 429 with Retry-After;
//   - the search words never reach SQL as SQL: they are bound parameters, and the FTS5 query is built only from word
//     characters (letters and digits), each word in double quotes (so FTS5 operators such as NEAR, OR, NOT, column
//     filters and * cannot be passed in); at most 12 words, each 2 to 40 characters; a quoted phrase stays a phrase;
//   - the dataset filter must be exactly one of the names read from the file at start, else 400; page 0 to 24;
//   - /r/<id> takes digits only (the record's rowid), else 404;
//   - answers: JSON, Cache-Control no-store, X-Content-Type-Options nosniff, X-Robots-Tag noindex, no server banner;
//     errors carry a status word only (no paths, no SQL, no stack);
//   - logs one line a request: time, kind (search, record, datasets or -), status, ms, result count. No search words,
//     no IP addresses, no headers, no query strings.
// The file is opened once at start. If the SQLite file is replaced, restart the service (T2's note): launchctl kickstart -k
// gui/$(id -u)/uk.opengovt.archive-server.
// ngrok adds basic auth in front of this (its traffic policy, a second and different secret); this server does not depend
// on it.
import http from 'node:http';
import fs from 'node:fs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const HOST = '127.0.0.1';
const PORT = Number(process.env.ARCHIVE_PORT || 3391);
const DB_FILE = opt('--db', process.env.ARCHIVE_DB || '/Volumes/EDGE_SSD/opengovt-index/opengovt-archive.sqlite');
const LIMIT_PER_MINUTE = 600;
const LIMIT_PER_SECOND = 5;
const PAGE_SIZE = 20;
const MAX_PAGE = 24;
const MAX_TEXT = 300_000;

function readKey() {
  const file = process.env.ARCHIVE_KEY_FILE;
  if (!file) return process.env.ARCHIVE_KEY || '';
  const st = fs.statSync(file);
  if (st.mode & 0o077) { console.error('STOP: the key file must be readable by this user only (chmod 600)'); process.exit(2); }
  return fs.readFileSync(file, 'utf8').trim();
}
const KEY = readKey();
if (KEY.length < 32) { console.error('STOP: the key is not set (ARCHIVE_KEY_FILE or ARCHIVE_KEY, at least 32 characters)'); process.exit(2); }
const KEY_HASH = createHash('sha256').update(KEY).digest();
if (!fs.existsSync(DB_FILE)) { console.error('STOP: the archive file is not there (is EDGE_SSD mounted?)'); process.exit(2); }

const db = new DatabaseSync(DB_FILE, { readOnly: true });
// Dataset names and counts from datasets.json beside this file (written by list-datasets.mjs; counting them at start would
// read the whole file, about two minutes). A name not in the file simply cannot be filtered on.
const DATASETS_FILE = opt('--datasets', new URL('./datasets.json', import.meta.url).pathname);
const DATASETS = JSON.parse(fs.readFileSync(DATASETS_FILE, 'utf8')).datasets
  .filter((d) => typeof d.name === 'string' && Number.isInteger(d.records))
  .map((d) => ({ name: d.name, records: d.records }));
const DATASET_NAMES = new Set(DATASETS.map((d) => d.name));
const COLS = "rowid AS id, dataset, title, date, url, snippet(docs, 5, '', '', ' … ', 24) AS snippet";
const searchAll = db.prepare(`SELECT ${COLS} FROM docs WHERE docs MATCH ? ORDER BY rank LIMIT ? OFFSET ?`);
const searchIn = db.prepare(`SELECT ${COLS} FROM docs WHERE docs MATCH ? AND dataset = ? ORDER BY rank LIMIT ? OFFSET ?`);
const record = db.prepare('SELECT rowid AS id, dataset, title, date, url, body FROM docs WHERE rowid = ?');

// Very common words are dropped outside quoted phrases: each matches most of the 3.2 million records, and ranking them
// took 8 s for 'the' alone, which would hold up every other search (this server answers one at a time). Words such as
// 'government' take under 2 s. A search of only such words gets 400 'no words' (the page asks for more specific words).
const STOP = new Set('a an and are as at be been but by for from had has have he her his i if in into is it its of on or our she so that the their them there these they this to was we were which who will with you'.split(' '));
// The FTS5 query from the reader's words: quoted phrases kept as phrases, every other word quoted on its own; only letters
// and digits survive, so nothing the reader types can act as an FTS5 operator. All words must match (FTS5's implicit AND).
export function ftsQuery(raw) {
  const parts = [];
  const words = (s) => (s.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || []).filter((w) => w.length >= 2 && w.length <= 40);
  let rest = String(raw || '').slice(0, 200).replace(/"([^"]*)"/g, (_, phrase) => {
    const w = words(phrase);
    if (w.length) parts.push(w);
    return ' ';
  });
  for (const w of words(rest)) if (!STOP.has(w.toLowerCase())) parts.push([w]);
  const kept = [];
  let n = 0;
  for (const p of parts) { if (n + p.length > 12) break; kept.push(p); n += p.length; }
  return kept.map((p) => `"${p.join(' ')}"`).join(' ');
}

const keyOk = (given) => typeof given === 'string' && given.length > 0 && timingSafeEqual(createHash('sha256').update(given).digest(), KEY_HASH);
const hits = [];
function limited(now) {
  while (hits.length && hits[0] <= now - 60_000) hits.shift();
  if (hits.length >= LIMIT_PER_MINUTE) return Math.ceil((hits[0] + 60_000 - now) / 1000);
  let lastSecond = 0;
  for (let i = hits.length - 1; i >= 0 && hits[i] > now - 1000; i--) lastSecond++;
  if (lastSecond >= LIMIT_PER_SECOND) return 1;
  hits.push(now);
  return 0;
}

const server = http.createServer((req, res) => {
  const t0 = Date.now();
  let kind = '-';
  let count = '';
  const send = (status, body, extra = {}) => {
    const json = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(json),
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...extra });
    res.end(json);
    console.log(`${new Date().toISOString()} ${kind} ${status} ${Date.now() - t0}ms${count === '' ? '' : ` ${count}`}`);
  };
  const wait = limited(t0);
  if (wait) return send(429, { error: 'too many requests' }, { 'Retry-After': String(wait) });
  if (req.method !== 'GET') return send(405, { error: 'method not allowed' }, { Allow: 'GET' });
  if (!keyOk(req.headers['x-archive-key'])) return send(401, { error: 'unauthorised' });
  let url;
  try { url = new URL(req.url || '/', 'http://127.0.0.1'); } catch { return send(404, { error: 'not found' }); }
  try {
    if (url.pathname === '/datasets') {
      kind = 'datasets';
      return send(200, { datasets: DATASETS });
    }
    if (url.pathname === '/search') {
      kind = 'search';
      const q = ftsQuery(url.searchParams.get('q'));
      const dataset = url.searchParams.get('dataset') || '';
      const page = Number(url.searchParams.get('page') || 0);
      if (!q) return send(400, { error: 'no words' });
      if (dataset && !DATASET_NAMES.has(dataset)) return send(400, { error: 'unknown dataset' });
      if (!Number.isInteger(page) || page < 0 || page > MAX_PAGE) return send(400, { error: 'bad page' });
      const rows = dataset ? searchIn.all(q, dataset, PAGE_SIZE + 1, page * PAGE_SIZE) : searchAll.all(q, PAGE_SIZE + 1, page * PAGE_SIZE);
      const list = rows.slice(0, PAGE_SIZE).map((r) => ({ id: Number(r.id), dataset: r.dataset, title: r.title, date: r.date, url: r.url, snippet: r.snippet }));
      count = list.length;
      return send(200, { hits: list, more: rows.length > PAGE_SIZE && page < MAX_PAGE, page });
    }
    const m = /^\/r\/(\d{1,9})$/.exec(url.pathname);
    if (m) {
      kind = 'record';
      const r = record.get(Number(m[1]));
      if (!r) return send(404, { error: 'not found' });
      const body = String(r.body || '');
      return send(200, { id: Number(r.id), dataset: r.dataset, title: r.title, date: r.date, url: r.url,
        text: body.length > MAX_TEXT ? body.slice(0, MAX_TEXT) : body, cut: body.length > MAX_TEXT });
    }
    return send(404, { error: 'not found' });
  } catch {
    return send(500, { error: 'unavailable' });
  }
});
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 50;
if (process.env.ARCHIVE_NO_LISTEN !== '1') {
  server.listen(PORT, HOST, () => console.log(`${new Date().toISOString()} archive server on http://${HOST}:${PORT}, ${DATASETS.length} datasets, ${DATASETS.reduce((s, d) => s + d.records, 0)} records, read only, ${LIMIT_PER_SECOND} a second, ${LIMIT_PER_MINUTE} a minute`));
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => { db.close(); process.exit(0); }));
