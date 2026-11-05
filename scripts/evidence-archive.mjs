#!/usr/bin/env node
// opengovt evidence archive (owner's briefs, 3 Nov 2026). Collects official publications into a local archive on the
// EDGE_SSD (OPENGOVT_ARCHIVE_ROOT, below), outside the repo, with a manifest of every file. Sources, licences and rate limits are in
// scripts/evidence-archive-sources.json. No database access, no site code.
//
//   node scripts/evidence-archive.mjs --source <name[,name]|all> [--days 30] [--limit N] [--max-minutes M]
//   node scripts/evidence-archive.mjs --source <name[,name]|all> --from YYYY-MM-DD --to YYYY-MM-DD [--max-minutes M]
//
//   --days N            the last N days (the pilot); listing progress in <root>/state/, log in <root>/run.log
//   --from/--to         backfill: works backwards from --to one calendar month at a time, down to --from (one date for
//                       every source, or one per source: --from committees=1995-01-01,contracts_finder=2015-02-01). Progress per
//                       source (the month being archived and the position in it) is kept in <root>/backfill-state.json,
//                       so each run carries on where the last stopped; a source that reaches --from is marked
//                       "complete", and once every source asked for is complete the run does nothing. Log in
//                       <root>/backfill.log. With several sources, each first gets an equal share of the time left (a
//                       source that finishes early leaves its time to the next ones); any time still left then goes back
//                       to a source that stopped only because its share ran out (never to one stopped by a block).
//   --max-minutes M     stops cleanly at the end of the current item when the time is up
//   --limit N           at most N items per source (tests)
//
//   committees        Parliament committee publications with a start date in the window (paged, 10 at a time): each
//                     publication's JSON (/api/Publications/{id}) and each document's original file
//                     (/api/Publications/{id}/Document/{docId}/OriginalFormat, base64 decoded).
//   govuk             GOV.UK documents from /api/search.json in the window, of the formats consultation_outcome,
//                     corporate_report, impact_assessment, independent_report, research, statistics,
//                     official_statistics and national_statistics (the API's own names; "publication" is not a
//                     GOV.UK format value), each saved as its /api/content/<base_path> JSON, plus its PDF, CSV, XLSX
//                     and ODS attachments on assets.publishing.service.gov.uk up to 50 MB each.
//   contracts_finder  Contracts Finder OCDS search for releases published in the window, limit 100, following the
//                     cursor; each page's releases saved as one JSON file per OCID.
//
// Rules: the user agent below on every request, never a browser one; one request at a time, paced at each source's
// rate; a 403, 429 or bot challenge is logged, waited out as the source's rule says (Contracts Finder: 5 minutes on
// 403; otherwise Retry-After, or 60 seconds), retried once, and then that source stops for this run. The committees
// listing is stricter (owner, 5 Nov 2026): a 403, 429 or challenge stops the source at once, and a network timeout is
// retried up to 3 more times, after 30, 60 and 120 seconds, before the source stops. Nothing is ever got round.
// Safety: if the drive (OPENGOVT_ARCHIVE_ROOT, /Volumes/EDGE_SSD unless set) is not mounted the run prints "skipped: SSD not mounted" and exits cleanly, writing
// nothing. Only one run at a time: <root>/archive.lock is held for the run; a run that finds it logs "skipped: another
// run in progress" and exits; a lock older than 12 hours is treated as stale and removed.
// Files: <root>/<source>/<yyyy>/<mm>/<id>.<ext>. Never overwritten: the same id fetched again with a different sha256
// is saved as <id>.<utc timestamp to the millisecond>.<first 8 characters of the sha256>.<ext>, so two versions can never
// share a name; if that name exists anyway, its content is the same and it counts as unchanged. Files saved earlier keep
// their names. <root>/manifest.csv gets a row after every file (and every failure).
// Resumable: an id already in the manifest with the same sha256 is skipped, and a document or attachment URL already
// archived is not fetched again.
import { createHash } from 'node:crypto';
import { promises as fs, existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The drive that holds the archive and the research data (owner, 4 Nov 2026: moved from GoliathSSD to EDGE_SSD, with a
// weekly copy back to GoliathSSD by scripts/launchd/opengovt.archive-backup.sh). One setting for both scripts.
const VOLUME = process.env.OPENGOVT_ARCHIVE_ROOT || '/Volumes/EDGE_SSD';
const ROOT = `${VOLUME}/opengovt-evidence-archive`;
const UA = 'opengovt-evidence-archive/0.1 (+https://opengovt.uk; contact@opengovt.uk)';
const SOURCES = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'evidence-archive-sources.json'), 'utf8'));
const PACE_MS = { committees: 1000, govuk: 500, contracts_finder: 1000 };
const GOVUK_FORMATS = ['consultation_outcome', 'corporate_report', 'impact_assessment', 'independent_report', 'research',
  'statistics', 'official_statistics', 'national_statistics'];
const ATTACHMENT_EXT = new Set(['pdf', 'csv', 'xlsx', 'ods']);
const MAX_ATTACHMENT = 50 * 1024 * 1024;
const MANIFEST_COLS = ['source', 'id', 'url', 'title', 'published_at', 'retrieved_at_utc', 'bytes', 'sha256', 'licence',
  'local_path', 'personal_data_flag', 'status'];
const STALE_LOCK_MS = 12 * 3600_000;

// ---- options ------------------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const SOURCE_ARG = opt('source', null);
const LIMIT = opt('limit', null) == null ? Infinity : Number(opt('limit'));
const MAX_MINUTES = opt('max-minutes', null) == null ? Infinity : Number(opt('max-minutes'));
const FROM_ARG = opt('from', null);
const TO_ARG = opt('to', null);
const BACKFILL = FROM_ARG != null || TO_ARG != null;
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const SOURCE_LIST = SOURCE_ARG === 'all' ? Object.keys(SOURCES) : (SOURCE_ARG || '').split(',').map((s) => s.trim()).filter(Boolean);
// --from: one date for every source, or name=date pairs.
const FROM_BY = {};
if (FROM_ARG != null) {
  if (FROM_ARG.includes('=')) for (const pair of FROM_ARG.split(',')) { const [k, v] = pair.split('=').map((x) => x.trim()); FROM_BY[k] = v; }
  else for (const s0 of SOURCE_LIST) FROM_BY[s0] = FROM_ARG;
}
const fromFor = (src) => FROM_BY[src];
const usage = () => {
  console.error('usage: node scripts/evidence-archive.mjs --source <committees|govuk|contracts_finder>[,...]|all [--days 30 | --from YYYY-MM-DD --to YYYY-MM-DD] [--limit N] [--max-minutes M]');
  process.exit(2);
};
if (!SOURCE_LIST.length || SOURCE_LIST.some((s) => !SOURCES[s]) || !(LIMIT > 0) || !(MAX_MINUTES > 0)) usage();
if (BACKFILL && (!isDate(TO_ARG) || SOURCE_LIST.some((s0) => !isDate(fromFor(s0)) || fromFor(s0) > TO_ARG))) usage();
const DAYS = Number(opt('days', '30'));
if (!BACKFILL && !(DAYS > 0)) usage();

// The volume must really be mounted (not just an empty folder under /Volumes).
function ssdMounted() {
  try { return statSync(VOLUME).dev !== statSync(dirname(VOLUME)).dev; } catch { return false; }
}
if (!ssdMounted()) { console.log(`${new Date().toISOString()} skipped: SSD not mounted`); process.exit(0); }
mkdirSync(join(ROOT, 'state'), { recursive: true });

const started = Date.now();
const runDeadline = started + MAX_MINUTES * 60_000;
let sourceDeadline = runDeadline;
const outOfTime = () => Date.now() > sourceDeadline;
const day = (d) => d.toISOString().slice(0, 10);

// ---- log ----------------------------------------------------------------------------------------------------------
const LOG = join(ROOT, BACKFILL ? 'backfill.log' : 'run.log');
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  appendFileSync(LOG, line + '\n');
  console.log(line);
}

// ---- backfill state (read before the lock: a finished backfill does nothing at all) --------------------------------
const BACKFILL_STATE = join(ROOT, 'backfill-state.json');
function readBackfillState() { try { return JSON.parse(readFileSync(BACKFILL_STATE, 'utf8')); } catch { return {}; } }
function writeBackfillState(s) {
  const tmp = `${BACKFILL_STATE}.tmp`;
  writeFileSync(tmp, JSON.stringify(s, null, 2));
  writeFileSync(BACKFILL_STATE, readFileSync(tmp)); // the old state stays readable until the new one is complete
  unlinkSync(tmp);
}
if (BACKFILL) {
  const st = readBackfillState();
  const open = SOURCE_LIST.filter((s) => !(st[s]?.complete && st[s].from === fromFor(s) && st[s].to === TO_ARG));
  if (!open.length) { log(`nothing to do: ${SOURCE_LIST.map((s) => `${s} complete from ${fromFor(s)}`).join(', ')} to ${TO_ARG}`); process.exit(0); }
}

// ---- lock ---------------------------------------------------------------------------------------------------------
const LOCK = join(ROOT, 'archive.lock');
function acquireLock() {
  try {
    const age = Date.now() - statSync(LOCK).mtimeMs;
    if (age < STALE_LOCK_MS) { log('skipped: another run in progress'); process.exit(0); }
    unlinkSync(LOCK);
    log(`removed a stale lock (${Math.round(age / 3600_000)} hours old)`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  try {
    writeFileSync(LOCK, JSON.stringify({ pid: process.pid, started: new Date(started).toISOString(), args: argv.join(' ') }), { flag: 'wx' });
  } catch (e) {
    if (e.code === 'EEXIST') { log('skipped: another run in progress'); process.exit(0); }
    throw e;
  }
  const release = () => {
    try { if (JSON.parse(readFileSync(LOCK, 'utf8')).pid === process.pid) unlinkSync(LOCK); } catch { /* already gone */ }
  };
  process.on('exit', release);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { log(`run: stopped by ${sig}`); process.exit(130); });
}
acquireLock();

// ---- manifest -----------------------------------------------------------------------------------------------------
const MANIFEST = join(ROOT, 'manifest.csv');
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
if (!existsSync(MANIFEST)) appendFileSync(MANIFEST, MANIFEST_COLS.join(',') + '\n');
// What is already archived: sha256s per source|id, and the URLs fetched successfully.
const seenSha = new Map();
const seenUrl = new Set();
{
  const rows = parseCsv(readFileSync(MANIFEST, 'utf8')).slice(1);
  for (const r of rows) {
    const o = Object.fromEntries(MANIFEST_COLS.map((c, i) => [c, r[i] ?? '']));
    if (!o.status.startsWith('ok')) continue;
    const k = `${o.source}|${o.id}`;
    if (!seenSha.has(k)) seenSha.set(k, new Set());
    seenSha.get(k).add(o.sha256);
    seenUrl.add(`${o.source}|${o.url}`);
  }
}
function manifest(row) {
  appendFileSync(MANIFEST, MANIFEST_COLS.map((c) => csvCell(row[c])).join(',') + '\n');
}
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---- polite fetch ---------------------------------------------------------------------------------------------------
class SourceStop extends Error {}
const lastCall = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitFor(source, status, res) {
  if (source === 'contracts_finder' && status === 403) return 5 * 60_000;
  const ra = Number(res?.headers.get('retry-after'));
  return Number.isFinite(ra) && ra > 0 ? Math.min(ra, 300) * 1000 : 60_000;
}
const isChallenge = (res, body) => /text\/html/i.test(res.headers.get('content-type') || '') &&
  /just a moment|cf-chl|captcha|challenge-platform/i.test(body.slice(0, 5000));

// One request at a time, paced; returns { res, buf } for any status other than a block (403, 429, challenge), which
// is waited out once as the source's rule says and then stops the source (at once, with stopOnBlock).
async function get(source, url, { accept = '*/*', maxBytes = Infinity, stopOnBlock = false } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const gap = PACE_MS[source] - (Date.now() - (lastCall[source] || 0));
    if (gap > 0) await sleep(gap);
    lastCall[source] = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
    } catch (e) {
      return { res: null, buf: null, error: `network: ${e.message}`, timedOut: e.name === 'TimeoutError' };
    }
    const len = Number(res.headers.get('content-length'));
    if (res.ok && Number.isFinite(len) && len > maxBytes) {
      try { await res.body?.cancel(); } catch { /* ignore */ }
      return { res, buf: null, tooLarge: len };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const blocked = res.status === 403 || res.status === 429 || (res.status !== 200 ? false : isChallenge(res, buf.toString('utf8', 0, 5000)));
    if (!blocked) {
      if (buf.length > maxBytes) return { res, buf: null, tooLarge: buf.length };
      return { res, buf };
    }
    const why = res.status === 200 ? 'bot challenge page' : `HTTP ${res.status}`;
    if (stopOnBlock) {
      log(`${source}: ${why} for ${url}; stopping this source for this run, no retry`);
      throw new SourceStop(`${why} at ${url}`);
    }
    if (attempt === 0) {
      const ms = waitFor(source, res.status, res);
      log(`${source}: ${why} for ${url}; waiting ${Math.round(ms / 1000)} s, then one retry`);
      await sleep(ms);
      continue;
    }
    log(`${source}: ${why} again for ${url}; stopping this source for this run`);
    throw new SourceStop(`${why} at ${url}`);
  }
  throw new Error('unreachable');
}

// A committees listing page: a network timeout is tried up to 3 more times, a block stops the source at once.
const LISTING_RETRY_MS = [30_000, 60_000, 120_000];
async function getCommitteesListing(url) {
  for (let retry = 0; ; retry++) {
    const out = await get('committees', url, { accept: 'application/json', stopOnBlock: true });
    if (!out.timedOut || retry >= LISTING_RETRY_MS.length) return out;
    log(`committees: listing timed out for ${url}; waiting ${LISTING_RETRY_MS[retry] / 1000} s, then retry ${retry + 1} of ${LISTING_RETRY_MS.length}`);
    await sleep(LISTING_RETRY_MS[retry]);
  }
}

// ---- writing files --------------------------------------------------------------------------------------------------
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const safeId = (s) => String(s).replace(/^\/+/, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);
const stats = {};
function stat(source) { return (stats[source] ||= { items: 0, files: 0, bytes: 0, unchanged: 0, failures: {}, windows: 0 }); }
function fail(source, row, status) {
  stat(source).failures[status] = (stat(source).failures[status] || 0) + 1;
  manifest({ ...row, source, retrieved_at_utc: new Date().toISOString(), bytes: '', sha256: '', local_path: '',
    licence: SOURCES[source].licence, personal_data_flag: SOURCES[source].personal_data, status });
}

// Saves buf as <id>.<ext> (or a new version when the id already holds different content); appends the manifest.
async function save(source, { id, ext, url, title, published_at }, buf) {
  const digest = sha256(buf);
  const key = `${source}|${id}`;
  if (seenSha.get(key)?.has(digest)) { stat(source).unchanged++; return 'unchanged'; }
  const d = published_at && /^\d{4}-\d{2}/.test(published_at) ? published_at : new Date().toISOString();
  const dir = join(ROOT, source, d.slice(0, 4), d.slice(5, 7));
  await fs.mkdir(dir, { recursive: true });
  let path = join(dir, `${id}.${ext}`);
  let status = 'ok';
  if (existsSync(path)) {
    const existing = await fs.readFile(path);
    if (sha256(existing) === digest) { stat(source).unchanged++; return 'unchanged'; }
    path = join(dir, `${id}.${new Date().toISOString().replace(/[-:.]/g, '')}.${digest.slice(0, 8)}.${ext}`);
    status = 'ok-new-version';
  }
  try {
    await fs.writeFile(path, buf, { flag: 'wx' }); // wx: never overwrite
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    // The same millisecond and the same sha256 prefix: the same content.
    stat(source).unchanged++;
    return 'unchanged';
  }
  if (!seenSha.has(key)) seenSha.set(key, new Set());
  seenSha.get(key).add(digest);
  seenUrl.add(`${source}|${url}`);
  manifest({ source, id, url, title, published_at, retrieved_at_utc: new Date().toISOString(), bytes: buf.length,
    sha256: digest, licence: SOURCES[source].licence, local_path: path, personal_data_flag: SOURCES[source].personal_data, status });
  const s = stat(source); s.files++; s.bytes += buf.length;
  return status;
}

// ---- runners: each archives one window [from, to] (inclusive dates) from position pos, calling save(pos) after
// every item; returns true when the window is finished, false when stopped by time or the item limit. --------------
let itemsThisRun = {};
const limitReached = (src) => (itemsThisRun[src] || 0) >= LIMIT;
const counted = (src) => { itemsThisRun[src] = (itemsThisRun[src] || 0) + 1; stat(src).items++; };

async function runCommittees(from, to, pos, savePos) {
  const src = 'committees';
  const base = SOURCES[src].base;
  let skip = pos.skip || 0;
  for (;;) {
    if (limitReached(src) || outOfTime()) return false;
    // Pages of 10: larger pages can answer HTTP 500 (3 Nov 2026).
    const url = `${base}/Publications?StartDate=${from}&EndDate=${to}&Skip=${skip}&Take=10&SortOrder=PublicationDateAscending`;
    const { res, buf, error } = await getCommitteesListing(url);
    if (!res || !res.ok) {
      fail(src, { id: `listing-${from}-skip-${skip}`, url }, error ? 'network' : `http-${res.status}`);
      throw new SourceStop(`listing failed (${error || `HTTP ${res.status}`}) for ${from} to ${to} at skip ${skip}`);
    }
    const page = JSON.parse(buf.toString('utf8'));
    const items = page.items || [];
    if (!items.length) return true;
    for (const it of items) {
      if (limitReached(src) || outOfTime()) return false;
      const pubUrl = `${base}/Publications/${it.id}`;
      const published = it.publicationStartDate || '';
      const title = it.description || it.type?.name || '';
      const one = await get(src, pubUrl, { accept: 'application/json' });
      if (!one.res || !one.res.ok) {
        fail(src, { id: `publication-${it.id}`, url: pubUrl, title, published_at: published }, one.error ? 'network' : `http-${one.res.status}`);
      } else {
        await save(src, { id: `publication-${it.id}`, ext: 'json', url: pubUrl, title, published_at: published }, one.buf);
        const pub = JSON.parse(one.buf.toString('utf8'));
        for (const d of pub.documents || []) {
          const file = (d.files || []).find((f) => f.fileDataFormat === 'OriginalFormat') || (d.files || [])[0];
          if (!file) continue;
          const docUrl = `${base}/Publications/${it.id}/Document/${d.documentId}/OriginalFormat`;
          if (seenUrl.has(`${src}|${docUrl}`)) { stat(src).unchanged++; continue; }
          const r = await get(src, docUrl, { accept: 'application/json' });
          const docTitle = file.fileName || title;
          const docId = `publication-${it.id}-document-${d.documentId}`;
          if (!r.res || !r.res.ok) { fail(src, { id: docId, url: docUrl, title: docTitle, published_at: published }, r.error ? 'network' : `http-${r.res.status}`); continue; }
          let body;
          try { body = JSON.parse(r.buf.toString('utf8')); } catch { body = null; }
          if (!body || typeof body.data !== 'string') { fail(src, { id: docId, url: docUrl, title: docTitle, published_at: published }, 'no-data'); continue; }
          const bytes = Buffer.from(body.data, 'base64');
          // The API's own format first: a file name can end in a date ("…02.10.2026") rather than an extension.
          const ext = (file.format || extname(body.fileName || file.fileName || '').slice(1) || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
          await save(src, { id: docId, ext, url: docUrl, title: docTitle, published_at: published }, bytes);
        }
      }
      skip++; counted(src);
      await savePos({ skip });
    }
    if (skip >= (page.totalResults || 0)) return true;
  }
}

async function runGovuk(from, to, pos, savePos) {
  const src = 'govuk';
  const base = SOURCES[src].base;
  let start = pos.start || 0;
  const filter = GOVUK_FORMATS.map((f) => `filter_format[]=${f}`).join('&');
  for (;;) {
    if (limitReached(src) || outOfTime()) return false;
    const url = `${base}/search.json?${filter}&filter_public_timestamp=from:${from},to:${to}&order=public_timestamp&fields[]=link&fields[]=title&fields[]=public_timestamp&fields[]=format&count=100&start=${start}`;
    const { res, buf, error } = await get(src, url, { accept: 'application/json' });
    if (!res || !res.ok) {
      fail(src, { id: `search-${from}-start-${start}`, url }, error ? 'network' : `http-${res.status}`);
      throw new SourceStop(`search failed (${error || `HTTP ${res.status}`}) for ${from} to ${to} at start ${start}`);
    }
    const page = JSON.parse(buf.toString('utf8'));
    const results = page.results || [];
    if (!results.length) return true;
    for (const it of results) {
      if (limitReached(src) || outOfTime()) return false;
      if (it.link && it.link.startsWith('/')) {
        const contentUrl = `${base}/content${it.link}`;
        const id = safeId(it.link);
        const published = it.public_timestamp || '';
        const r = await get(src, contentUrl, { accept: 'application/json' });
        if (!r.res || !r.res.ok) {
          fail(src, { id, url: contentUrl, title: it.title, published_at: published }, r.error ? 'network' : `http-${r.res.status}`);
        } else {
          await save(src, { id, ext: 'json', url: contentUrl, title: it.title, published_at: published }, r.buf);
          let content; try { content = JSON.parse(r.buf.toString('utf8')); } catch { content = {}; }
          for (const a of content.details?.attachments || []) {
            const aurl = a.url || '';
            let host = ''; try { host = new URL(aurl).host; } catch { /* not a full URL */ }
            if (host !== 'assets.publishing.service.gov.uk') continue;
            const ext = extname(new URL(aurl).pathname).slice(1).toLowerCase();
            if (!ATTACHMENT_EXT.has(ext)) continue;
            const aid = `${id}--${safeId(a.id || a.attachment_id || new URL(aurl).pathname.split('/').pop())}`;
            if (seenUrl.has(`${src}|${aurl}`)) { stat(src).unchanged++; continue; }
            if (Number(a.file_size) > MAX_ATTACHMENT) { fail(src, { id: aid, url: aurl, title: a.title, published_at: published }, 'too-large'); continue; }
            const ar = await get(src, aurl, { maxBytes: MAX_ATTACHMENT });
            if (ar.tooLarge) { fail(src, { id: aid, url: aurl, title: a.title, published_at: published }, 'too-large'); continue; }
            if (!ar.res || !ar.res.ok) { fail(src, { id: aid, url: aurl, title: a.title, published_at: published }, ar.error ? 'network' : `http-${ar.res.status}`); continue; }
            await save(src, { id: aid, ext, url: aurl, title: a.title, published_at: published }, ar.buf);
          }
        }
        counted(src);
      }
      start++;
      await savePos({ start });
    }
    if (start >= (page.total || 0)) return true;
  }
}

async function runContractsFinder(from, to, pos, savePos) {
  const src = 'contracts_finder';
  const base = SOURCES[src].base;
  let next = pos.next || `${base}?publishedFrom=${from}T00:00:00&publishedTo=${to}T23:59:59&limit=100`;
  // A page is one item here: its releases are saved together, then the cursor moves on.
  while (next) {
    if (limitReached(src) || outOfTime()) return false;
    const { res, buf, error } = await get(src, next, { accept: 'application/json' });
    if (!res || !res.ok) {
      fail(src, { id: `search-${from}`, url: next }, error ? 'network' : `http-${res.status}`);
      throw new SourceStop(`search failed (${error || `HTTP ${res.status}`}) for ${from} to ${to}`);
    }
    const page = JSON.parse(buf.toString('utf8'));
    const byOcid = new Map();
    for (const rel of page.releases || []) {
      if (!rel.ocid) continue;
      if (!byOcid.has(rel.ocid)) byOcid.set(rel.ocid, []);
      byOcid.get(rel.ocid).push(rel);
    }
    for (const [ocid, releases] of byOcid) {
      const latest = releases.map((r) => r.date || '').sort().pop();
      const title = releases[0].tender?.title || '';
      const body = Buffer.from(JSON.stringify({ ocid, license: page.license, publishedDate: page.publishedDate, retrievedFrom: next, releases }, null, 1));
      await save(src, { id: safeId(ocid), ext: 'json', url: next, title, published_at: latest }, body);
      counted(src);
    }
    next = page.links?.next || null;
    await savePos({ next });
  }
  return true;
}

const RUNNERS = { committees: runCommittees, govuk: runGovuk, contracts_finder: runContractsFinder };

// ---- the last N days (pilot mode) ---------------------------------------------------------------------------------
async function runDays(src) {
  const to = day(new Date(started));
  const from = day(new Date(started - DAYS * 86_400_000));
  const file = join(ROOT, 'state', `${src}-${from}-${to}${LIMIT === Infinity ? '' : `-limit${LIMIT}`}.json`);
  let st = {}; try { st = JSON.parse(readFileSync(file, 'utf8')); } catch { /* new */ }
  if (st.complete) { log(`${src}: window ${from} to ${to} already complete`); return; }
  const done = await RUNNERS[src](from, to, st.pos || {}, async (pos) => { st.pos = pos; await fs.writeFile(file, JSON.stringify(st)); });
  if (done) { st.complete = true; await fs.writeFile(file, JSON.stringify(st)); }
}

// ---- backfill: one month at a time, backwards from --to to --from -----------------------------------------------------
const dayBefore = (d) => day(new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000));
const monthStart = (d) => `${d.slice(0, 8)}01`;
async function runBackfill(src) {
  const FROM = fromFor(src);
  const all = readBackfillState();
  let st = all[src];
  if (!st || st.from !== FROM || st.to !== TO_ARG) {
    if (st) log(`${src}: backfill range changed (${st.from} to ${st.to} -> ${FROM} to ${TO_ARG}); starting again from ${TO_ARG}`);
    st = { from: FROM, to: TO_ARG, window_end: TO_ARG, pos: {}, complete: false, months_done: 0, items: 0, started_at: new Date().toISOString() };
  }
  if (st.complete) { log(`${src}: complete from ${FROM} to ${TO_ARG}`); return 'complete'; }
  // st.items: items archived over every run of this backfill (this run's new ones added as they are saved).
  let counted = itemsThisRun[src] || 0;
  const persist = () => {
    const nowCount = itemsThisRun[src] || 0;
    st.items += nowCount - counted;
    counted = nowCount;
    st.updated_at = new Date().toISOString();
    const s = readBackfillState();
    s[src] = st;
    writeBackfillState(s);
  };
  while (!st.complete) {
    const end = st.window_end;
    const start = monthStart(end) < FROM ? FROM : monthStart(end);
    const done = await RUNNERS[src](start, end, st.pos, async (pos) => { st.pos = pos; persist(); });
    if (!done) { persist(); log(`${src}: stopped in ${start} to ${end} (time or limit); carries on from here`); return 'time'; }
    stat(src).windows++;
    st.months_done++;
    st.pos = {};
    if (start <= FROM) { st.complete = true; st.completed_at = new Date().toISOString(); delete st.window_end; }
    else st.window_end = dayBefore(start);
    persist();
    log(`${src}: finished ${start} to ${end}${st.complete ? `; backfill complete down to ${FROM}` : ''}`);
  }
  return 'complete';
}

// ---- run ----------------------------------------------------------------------------------------------------------
log(`run: --source ${SOURCE_LIST.join(',')} ${BACKFILL ? `--from ${FROM_ARG} --to ${TO_ARG}` : `--days ${DAYS}`}${LIMIT === Infinity ? '' : ` --limit ${LIMIT}`}${MAX_MINUTES === Infinity ? '' : ` --max-minutes ${MAX_MINUTES}`}`);
const stopped = {};
const result = {};
const todo = BACKFILL ? SOURCE_LIST.filter((s) => { const st = readBackfillState()[s]; return !(st?.complete && st.from === fromFor(s) && st.to === TO_ARG); }) : SOURCE_LIST;
async function runSource(s, deadline) {
  sourceDeadline = deadline;
  const t0 = Date.now();
  const before = { ...stat(s) };
  try { result[s] = BACKFILL ? await runBackfill(s) : (await runDays(s), 'complete'); }
  catch (e) {
    result[s] = 'blocked';
    stopped[s] = e.message;
    if (e instanceof SourceStop) log(`${s}: stopped (${e.message})`);
    else log(`${s}: error ${e.stack || e.message}`);
  }
  const t = stat(s);
  log(`${s}: items ${t.items - (before.items || 0)}, files ${t.files - (before.files || 0)}, ${((t.bytes - (before.bytes || 0)) / 1048576).toFixed(1)} MB, unchanged ${t.unchanged - (before.unchanged || 0)}, failures ${JSON.stringify(t.failures)}${BACKFILL ? `, months finished ${t.windows - (before.windows || 0)}` : ''}, ${((Date.now() - t0) / 60_000).toFixed(1)} min`);
}
// First pass: an equal share of the time left each; a source that ends early leaves its time to the ones after it.
for (let i = 0; i < todo.length; i++) {
  if (Date.now() >= runDeadline) { log(`${todo[i]}: not started (time budget reached)`); continue; }
  await runSource(todo[i], Number.isFinite(runDeadline) ? Date.now() + (runDeadline - Date.now()) / (todo.length - i) : Infinity);
}
// Second pass: time still left goes back to sources that stopped only because their share ran out.
for (const s of todo) {
  if (Date.now() >= runDeadline - 60_000) break;
  if (result[s] === 'time' && !(LIMIT < Infinity)) { log(`${s}: carrying on with the time left`); await runSource(s, runDeadline); }
}
log(`run: done in ${Math.round((Date.now() - started) / 1000)} s`);
if (Object.keys(stopped).length) process.exitCode = 1;
