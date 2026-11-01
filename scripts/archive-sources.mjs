#!/usr/bin/env node
// Backs up every outside source the site cites, two ways (owner's job, 1 Nov 2026):
//   1. a private local copy in "Claude outputs/source-archive/files/" with a manifest, and
//   2. a public timestamped copy on the Internet Archive Wayback Machine (anonymous Save Page Now only).
// Reads "Claude outputs/source-archive/urls.csv" (url, used_in) and maintains manifest.csv next to it.
// It is resumable: a URL already done in the manifest is skipped, and the manifest is rewritten after every URL.
// It never touches the database or the site, never fetches opengovt.uk, and never tries to get past a bot check:
// a 403/406 or challenge page is recorded as "blocked" and not retried. Default Node fetch user agent only.
//
// Usage: node scripts/archive-sources.mjs [--local-only] [--wayback-only] [--limit N] [--new]
//   --new  only URLs not yet in the manifest (for sources added by new articles)

import { readFileSync, writeFileSync, appendFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const DIR = 'Claude outputs/source-archive';
const URLS = path.join(DIR, 'urls.csv');
const MANIFEST = path.join(DIR, 'manifest.csv');
const FILES = path.join(DIR, 'files');
const LOG = path.join(DIR, 'run.log');
const COLS = ['url', 'used_in', 'local_status', 'local_file', 'bytes', 'sha256', 'saved_at_utc',
  'wayback_status', 'wayback_url', 'wayback_at_utc', 'note'];

const LOCAL_TIMEOUT_MS = 30_000;
const WAYBACK_TIMEOUT_MS = 120_000;
const SAVE_GAP_MS = 20_000;            // at most 3 Save Page Now requests a minute
const RATE_LIMIT_WAIT_MS = 5 * 60_000; // after a 429, wait 5 minutes and try that URL once more
const MAX_CONSECUTIVE_429 = 3;
const RECENT_DAYS = 30;

const args = process.argv.slice(2);
const opt = {
  localOnly: args.includes('--local-only'),
  waybackOnly: args.includes('--wayback-only'),
  onlyNew: args.includes('--new'),
  limit: args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity,
};
if (opt.localOnly && opt.waybackOnly) { console.error('Pick one of --local-only and --wayback-only.'); process.exit(1); }
if (!(opt.limit > 0)) { console.error('--limit needs a positive number.'); process.exit(1); }
const doLocal = !opt.waybackOnly;
const doWayback = !opt.localOnly;

// ---------- CSV ----------
function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1 || r[0]).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const q = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function writeManifest(rows) {
  const tmp = MANIFEST + '.tmp';
  writeFileSync(tmp, [COLS.join(','), ...rows.map((r) => COLS.map((c) => q(r[c])).join(','))].join('\n') + '\n');
  renameSync(tmp, MANIFEST);
}

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowUtc = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
function log(line) {
  const text = `${nowUtc()} ${line}`;
  appendFileSync(LOG, text + '\n');
  if (process.stdout.isTTY) console.log(text);
}
function skipped(u) {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return h === 'opengovt.uk' || h === 'www.opengovt.uk' || h === 'supabase.co' || h.endsWith('.supabase.co') || h === 'localhost';
  } catch { return true; }
}
function extFor(contentType) {
  const t = (contentType || '').toLowerCase();
  if (t.includes('pdf')) return 'pdf';
  if (t.includes('html')) return 'html';
  if (t.includes('csv')) return 'csv';
  if (t.includes('spreadsheetml')) return 'xlsx';
  if (t.includes('json')) return 'json';
  return 'bin';
}
// A bot check page served with any status. Recorded as blocked; never retried or worked around.
function looksLikeChallenge(res, buf) {
  if (res.headers.get('cf-mitigated') === 'challenge') return true;
  if (!(res.headers.get('content-type') || '').includes('html') || buf.length > 200_000) return false;
  const s = buf.toString('utf8');
  return /<title>\s*(Just a moment|Attention Required|Access denied|Are you a robot)/i.test(s)
    || /challenges\.cloudflare\.com|\/cdn-cgi\/challenge-platform|captcha-delivery\.com|_Incapsula_Resource|px-captcha/i.test(s);
}
function tsToUtc(ts) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(ts || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : '';
}

// ---------- local copy ----------
async function localCopy(url, row) {
  row.local_file = ''; row.bytes = ''; row.sha256 = ''; row.saved_at_utc = '';
  let res, buf;
  try {
    res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS) });
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    row.local_status = 'error';
    return `local error: ${e.name === 'TimeoutError' ? 'timeout 30s' : (e.cause?.code || e.message)}`;
  }
  if (res.status === 403 || res.status === 406 || looksLikeChallenge(res, buf)) { row.local_status = 'blocked'; return `local blocked: HTTP ${res.status}`; }
  if (res.status === 404 || res.status === 410) { row.local_status = 'gone'; return `local gone: HTTP ${res.status}`; }
  if (res.status !== 200) { row.local_status = 'error'; return `local error: HTTP ${res.status}`; }
  const file = `${sha256(url).slice(0, 16)}.${extFor(res.headers.get('content-type'))}`;
  writeFileSync(path.join(FILES, file), buf);
  Object.assign(row, { local_status: 'saved', local_file: file, bytes: buf.length, sha256: sha256(buf), saved_at_utc: nowUtc() });
  return res.url !== url ? `local saved (redirected to ${res.url})` : 'local saved';
}

// ---------- Wayback ----------
let lastSaveAt = 0;
let consecutive429 = 0;

async function availability(url) {
  const res = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    { signal: AbortSignal.timeout(WAYBACK_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`availability HTTP ${res.status}`);
  const snap = (await res.json())?.archived_snapshots?.closest;
  return snap?.available && snap.url ? { url: snap.url.replace(/^http:/, 'https:'), at: tsToUtc(snap.timestamp) } : null;
}

async function saveOnce(url) {
  const wait = lastSaveAt + SAVE_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastSaveAt = Date.now();
  const res = await fetch(`https://web.archive.org/save/${url}`, { redirect: 'follow', signal: AbortSignal.timeout(WAYBACK_TIMEOUT_MS) });
  const body = await res.text().catch(() => '');
  const loc = res.headers.get('content-location') || '';
  const m = /\/web\/(\d{14})\//.exec(res.url) || /\/web\/(\d{14})\//.exec(loc);
  return { status: res.status, snapshot: m ? { url: `https://web.archive.org/web/${m[1]}/${url}`, at: tsToUtc(m[1]) } : null, body };
}

// Returns a note; sets row fields. Throws 'RATE_LIMITED' when the run must stop.
async function wayback(url, row) {
  row.wayback_url = ''; row.wayback_at_utc = '';
  try {
    const snap = await availability(url);
    if (snap && snap.at && Date.now() - Date.parse(snap.at) < RECENT_DAYS * 86_400_000) {
      Object.assign(row, { wayback_status: 'recent', wayback_url: snap.url, wayback_at_utc: snap.at });
      return 'wayback recent snapshot kept';
    }
  } catch (e) {
    // Not fatal: fall through to a save.
    row.note = `availability check failed (${e.message}); `;
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    let r;
    try { r = await saveOnce(url); } catch (e) {
      row.wayback_status = 'error';
      return `wayback error: ${e.name === 'TimeoutError' ? 'timeout' : (e.cause?.code || e.message)}`;
    }
    if (r.status === 429) {
      consecutive429++;
      if (consecutive429 >= MAX_CONSECUTIVE_429) throw new Error('RATE_LIMITED');
      if (attempt === 1) { log(`429 from Save Page Now for ${url}; waiting 5 minutes`); await sleep(RATE_LIMIT_WAIT_MS); continue; }
      row.wayback_status = 'rate_limited';
      return 'wayback 429 twice; moved on';
    }
    consecutive429 = 0;
    if (r.snapshot) {
      Object.assign(row, { wayback_status: 'saved', wayback_url: r.snapshot.url, wayback_at_utc: r.snapshot.at });
      return 'wayback saved';
    }
    if (r.status === 403 || r.status === 406) { row.wayback_status = 'blocked'; return `wayback blocked: HTTP ${r.status}`; }
    if (r.status === 200) {
      // Save Page Now accepted the request but gave no snapshot address (the capture runs as a job).
      const hint = /class="?[^"]*error[^"]*"?[^>]*>([^<]{5,200})/i.exec(r.body)?.[1]?.trim();
      row.wayback_status = hint ? 'error' : 'submitted';
      return hint ? `wayback error: ${hint}` : 'wayback submitted (no snapshot address returned)';
    }
    row.wayback_status = 'error';
    return `wayback error: HTTP ${r.status}`;
  }
}

// ---------- main ----------
if (!existsSync(URLS)) { console.error(`Missing ${URLS}`); process.exit(1); }
mkdirSync(FILES, { recursive: true });
const urls = parseCsv(readFileSync(URLS, 'utf8')).filter((r) => r.url && !skipped(r.url));
const manifest = existsSync(MANIFEST) ? parseCsv(readFileSync(MANIFEST, 'utf8')) : [];
const byUrl = new Map(manifest.map((r) => [r.url, r]));

const isDone = (r) => r && (!doLocal || r.local_status) && (!doWayback || (r.wayback_status && r.wayback_status !== 'rate_limited'));
const todo = urls.filter((u) => (opt.onlyNew ? !byUrl.has(u.url) : !isDone(byUrl.get(u.url)))).slice(0, opt.limit);
log(`start: ${todo.length} to do of ${urls.length} (local ${doLocal ? 'on' : 'off'}, wayback ${doWayback ? 'on' : 'off'}${opt.onlyNew ? ', new only' : ''})`);

let stopped = false;
for (const u of todo) {
  let row = byUrl.get(u.url);
  if (!row) { row = Object.fromEntries(COLS.map((c) => [c, ''])); row.url = u.url; manifest.push(row); byUrl.set(u.url, row); }
  row.used_in = u.used_in;
  const notes = [];
  row.note = '';
  if (doLocal && !row.local_status) notes.push(await localCopy(u.url, row));
  if (doWayback && (!row.wayback_status || row.wayback_status === 'rate_limited')) {
    try { notes.push(await wayback(u.url, row)); } catch (e) {
      if (e.message !== 'RATE_LIMITED') throw e;
      row.wayback_status = '';
      stopped = true;
    }
  }
  row.note = (row.note + notes.join('; ')).slice(0, 500);
  writeManifest(manifest);
  log(`${row.local_status || '-'} / ${row.wayback_status || '-'} ${u.url} ${row.note}`);
  if (stopped) { log('stopped: rate limited'); break; }
}
if (!stopped) log(`done: ${todo.length} processed`);
