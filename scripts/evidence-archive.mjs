#!/usr/bin/env node
// opengovt evidence archive, pilot (owner's brief, 3 Nov 2026). Collects official publications into a local archive on
// the GoliathSSD, outside the repo, with a manifest of every file. Sources, licences and rate limits are in
// scripts/evidence-archive-sources.json. No database access, no site code, foreground only.
//
//   node scripts/evidence-archive.mjs --source <committees|govuk|contracts_finder|all> [--days 30] [--limit N]
//                                     [--max-minutes M]
//
//   committees        Parliament committee publications with a start date in the window (paged through): each
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
// 403; otherwise Retry-After, or 60 seconds), retried once, and then that source stops for this run. Nothing is ever
// got round.
// Files: <root>/<source>/<yyyy>/<mm>/<id>.<ext>. Never overwritten: the same id fetched again with a different sha256
// is saved as <id>.<utc timestamp>.<ext>. <root>/manifest.csv gets a row after every file (and every failure);
// <root>/run.log logs the run. Resumable: an id already in the manifest with the same sha256 is skipped, a document
// or attachment URL already archived is not fetched again, and listing progress is kept in <root>/state/ so a run cut
// short by --max-minutes carries on where it stopped.
import { createHash } from 'node:crypto';
import { promises as fs, existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = '/Volumes/GoliathSSD/opengovt-evidence-archive';
const UA = 'opengovt-evidence-archive/0.1 (+https://opengovt.uk; contact@opengovt.uk)';
const SOURCES = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'evidence-archive-sources.json'), 'utf8'));
const PACE_MS = { committees: 1000, govuk: 500, contracts_finder: 1000 };
const GOVUK_FORMATS = ['consultation_outcome', 'corporate_report', 'impact_assessment', 'independent_report', 'research',
  'statistics', 'official_statistics', 'national_statistics'];
const ATTACHMENT_EXT = new Set(['pdf', 'csv', 'xlsx', 'ods']);
const MAX_ATTACHMENT = 50 * 1024 * 1024;
const MANIFEST_COLS = ['source', 'id', 'url', 'title', 'published_at', 'retrieved_at_utc', 'bytes', 'sha256', 'licence',
  'local_path', 'personal_data_flag', 'status'];

// ---- options ------------------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const SOURCE = opt('source', null);
const DAYS = Number(opt('days', '30'));
const LIMIT = opt('limit', null) == null ? Infinity : Number(opt('limit'));
const MAX_MINUTES = opt('max-minutes', null) == null ? Infinity : Number(opt('max-minutes'));
if (!SOURCE || !(SOURCE === 'all' || SOURCES[SOURCE]) || !(DAYS > 0) || !(LIMIT > 0)) {
  console.error('usage: node scripts/evidence-archive.mjs --source <committees|govuk|contracts_finder|all> [--days 30] [--limit N] [--max-minutes M]');
  process.exit(2);
}
if (!existsSync('/Volumes/GoliathSSD')) { console.error('STOP: /Volumes/GoliathSSD is not mounted'); process.exit(3); }
mkdirSync(join(ROOT, 'state'), { recursive: true });
const started = Date.now();
const outOfTime = () => Date.now() - started > MAX_MINUTES * 60_000;

const now = new Date();
const day = (d) => d.toISOString().slice(0, 10);
const TO = day(now);
const FROM = day(new Date(now.getTime() - DAYS * 86_400_000));

// ---- log and manifest ---------------------------------------------------------------------------------------------
const LOG = join(ROOT, 'run.log');
const MANIFEST = join(ROOT, 'manifest.csv');
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  appendFileSync(LOG, line + '\n');
  console.log(line);
}
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
if (!existsSync(MANIFEST)) appendFileSync(MANIFEST, MANIFEST_COLS.join(',') + '\n');
// What is already archived: sha256s per source|id, and the URLs fetched successfully.
const seenSha = new Map();
const seenUrl = new Set();
{
  const text = readFileSync(MANIFEST, 'utf8');
  const rows = parseCsv(text).slice(1);
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
// is waited out once as the source's rule says and then stops the source.
async function get(source, url, { accept = '*/*', maxBytes = Infinity } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const gap = PACE_MS[source] - (Date.now() - (lastCall[source] || 0));
    if (gap > 0) await sleep(gap);
    lastCall[source] = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
    } catch (e) {
      return { res: null, buf: null, error: `network: ${e.message}` };
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

// ---- writing files --------------------------------------------------------------------------------------------------
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const safeId = (s) => String(s).replace(/^\/+/, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);
const stats = {};
function stat(source) { return (stats[source] ||= { items: 0, files: 0, bytes: 0, unchanged: 0, failures: {} }); }
function fail(source, row, status) {
  stat(source).failures[status] = (stat(source).failures[status] || 0) + 1;
  manifest({ ...row, source, retrieved_at_utc: new Date().toISOString(), bytes: '', sha256: '', local_path: '',
    licence: SOURCES[source].licence, personal_data_flag: SOURCES[source].personal_data, status });
}

// Saves buf as <id>.<ext> (or a timestamped version when the id already holds different content); appends the manifest.
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
    path = join(dir, `${id}.${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}.${ext}`);
    status = 'ok-new-version';
  }
  await fs.writeFile(path, buf, { flag: 'wx' }); // wx: never overwrite
  if (!seenSha.has(key)) seenSha.set(key, new Set());
  seenSha.get(key).add(digest);
  seenUrl.add(`${source}|${url}`);
  manifest({ source, id, url, title, published_at, retrieved_at_utc: new Date().toISOString(), bytes: buf.length,
    sha256: digest, licence: SOURCES[source].licence, local_path: path, personal_data_flag: SOURCES[source].personal_data, status });
  const s = stat(source); s.files++; s.bytes += buf.length;
  return status;
}

// Listing progress per source and window, so a run cut short carries on.
const stateFile = (source) => join(ROOT, 'state', `${source}-${FROM}-${TO}${LIMIT === Infinity ? '' : `-limit${LIMIT}`}.json`);
const loadState = (source) => { try { return JSON.parse(readFileSync(stateFile(source), 'utf8')); } catch { return {}; } };
const saveState = (source, s) => fs.writeFile(stateFile(source), JSON.stringify(s));

// ---- committees ---------------------------------------------------------------------------------------------------
async function runCommittees() {
  const src = 'committees';
  const base = SOURCES[src].base;
  const st = loadState(src);
  let skip = st.skip || 0;
  let done = st.items || 0;
  if (st.complete) { log(`${src}: window ${FROM} to ${TO} already complete`); return; }
  for (;;) {
    if (done >= LIMIT || outOfTime()) break;
    const url = `${base}/Publications?StartDate=${FROM}&EndDate=${TO}&Skip=${skip}&Take=10&SortOrder=PublicationDateAscending`; // pages of 10: larger pages can answer HTTP 500 (3 Nov 2026)
    const { res, buf, error } = await get(src, url, { accept: 'application/json' });
    if (!res || !res.ok) { log(`${src}: listing failed (${error || `HTTP ${res.status}`}) at skip ${skip}; stopping`); fail(src, { id: `listing-skip-${skip}`, url }, error ? 'network' : `http-${res.status}`); break; }
    const page = JSON.parse(buf.toString('utf8'));
    const items = page.items || [];
    if (!items.length) { await saveState(src, { skip, items: done, complete: true }); break; }
    // n: how many of this page were handled, so a run cut short resumes at the next one (not at the next page).
    let n = 0;
    for (const it of items) {
      if (done >= LIMIT || outOfTime()) break;
      n++;
      const pubUrl = `${base}/Publications/${it.id}`;
      const published = it.publicationStartDate || '';
      const title = it.description || it.type?.name || '';
      const one = await get(src, pubUrl, { accept: 'application/json' });
      if (!one.res || !one.res.ok) { fail(src, { id: `publication-${it.id}`, url: pubUrl, title, published_at: published }, one.error ? 'network' : `http-${one.res.status}`); done++; stat(src).items++; continue; }
      await save(src, { id: `publication-${it.id}`, ext: 'json', url: pubUrl, title, published_at: published }, one.buf);
      const pub = JSON.parse(one.buf.toString('utf8'));
      for (const d of pub.documents || []) {
        const file = (d.files || []).find((f) => f.fileDataFormat === 'OriginalFormat') || (d.files || [])[0];
        if (!file) continue;
        const docUrl = `${base}/Publications/${it.id}/Document/${d.documentId}/OriginalFormat`;
        if (seenUrl.has(`${src}|${docUrl}`)) { stat(src).unchanged++; continue; }
        const r = await get(src, docUrl, { accept: 'application/json' });
        const docTitle = file.fileName || title;
        if (!r.res || !r.res.ok) { fail(src, { id: `publication-${it.id}-document-${d.documentId}`, url: docUrl, title: docTitle, published_at: published }, r.error ? 'network' : `http-${r.res.status}`); continue; }
        let body;
        try { body = JSON.parse(r.buf.toString('utf8')); } catch { body = null; }
        if (!body || typeof body.data !== 'string') { fail(src, { id: `publication-${it.id}-document-${d.documentId}`, url: docUrl, title: docTitle, published_at: published }, 'no-data'); continue; }
        const bytes = Buffer.from(body.data, 'base64');
        // The API's own format first: a file name can end in a date ("…02.10.2026") rather than an extension.
        const ext = (file.format || extname(body.fileName || file.fileName || '').slice(1) || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        await save(src, { id: `publication-${it.id}-document-${d.documentId}`, ext, url: docUrl, title: docTitle, published_at: published }, bytes);
      }
      done++; stat(src).items++;
    }
    skip += n;
    const finished = n === items.length && skip >= (page.totalResults || 0);
    await saveState(src, { skip, items: done, ...(finished ? { complete: true } : {}) });
    if (finished || n < items.length) break;
  }
}

// ---- GOV.UK -------------------------------------------------------------------------------------------------------
async function runGovuk() {
  const src = 'govuk';
  const base = SOURCES[src].base;
  const st = loadState(src);
  let start = st.start || 0;
  let done = st.items || 0;
  if (st.complete) { log(`${src}: window ${FROM} to ${TO} already complete`); return; }
  const filter = GOVUK_FORMATS.map((f) => `filter_format[]=${f}`).join('&');
  for (;;) {
    if (done >= LIMIT || outOfTime()) break;
    const url = `${base}/search.json?${filter}&filter_public_timestamp=from:${FROM},to:${TO}&order=public_timestamp&fields[]=link&fields[]=title&fields[]=public_timestamp&fields[]=format&count=100&start=${start}`;
    const { res, buf, error } = await get(src, url, { accept: 'application/json' });
    if (!res || !res.ok) { log(`${src}: search failed (${error || `HTTP ${res.status}`}) at start ${start}; stopping`); fail(src, { id: `search-start-${start}`, url }, error ? 'network' : `http-${res.status}`); break; }
    const page = JSON.parse(buf.toString('utf8'));
    const results = page.results || [];
    if (!results.length) { await saveState(src, { start, items: done, complete: true }); break; }
    let n = 0; // as in committees: resume at the next result, not the next page
    for (const it of results) {
      if (done >= LIMIT || outOfTime()) break;
      n++;
      if (!it.link || !it.link.startsWith('/')) continue;
      const contentUrl = `${base}/content${it.link}`;
      const id = safeId(it.link);
      const published = it.public_timestamp || '';
      const r = await get(src, contentUrl, { accept: 'application/json' });
      if (!r.res || !r.res.ok) { fail(src, { id, url: contentUrl, title: it.title, published_at: published }, r.error ? 'network' : `http-${r.res.status}`); done++; stat(src).items++; continue; }
      await save(src, { id, ext: 'json', url: contentUrl, title: it.title, published_at: published }, r.buf);
      let content; try { content = JSON.parse(r.buf.toString('utf8')); } catch { content = {}; }
      for (const a of content.details?.attachments || []) {
        const aurl = a.url || '';
        let host = ''; try { host = new URL(aurl).host; } catch { /* not a full URL */ }
        if (host !== 'assets.publishing.service.gov.uk') continue;
        const ext = extname(new URL(aurl).pathname).slice(1).toLowerCase();
        if (!ATTACHMENT_EXT.has(ext)) continue;
        const aid = `${id}--${safeId(a.id || a.attachment_id || new URL(aurl).pathname.split('/').pop())}`;
        if (Number(a.file_size) > MAX_ATTACHMENT) { fail(src, { id: aid, url: aurl, title: a.title, published_at: published }, 'too-large'); continue; }
        if (seenUrl.has(`${src}|${aurl}`)) { stat(src).unchanged++; continue; }
        const ar = await get(src, aurl, { maxBytes: MAX_ATTACHMENT });
        if (ar.tooLarge) { fail(src, { id: aid, url: aurl, title: a.title, published_at: published }, 'too-large'); continue; }
        if (!ar.res || !ar.res.ok) { fail(src, { id: aid, url: aurl, title: a.title, published_at: published }, ar.error ? 'network' : `http-${ar.res.status}`); continue; }
        await save(src, { id: aid, ext, url: aurl, title: a.title, published_at: published }, ar.buf);
      }
      done++; stat(src).items++;
    }
    start += n;
    const finished = n === results.length && start >= (page.total || 0);
    await saveState(src, { start, items: done, ...(finished ? { complete: true } : {}) });
    if (finished || n < results.length) break;
  }
}

// ---- Contracts Finder ---------------------------------------------------------------------------------------------
async function runContractsFinder() {
  const src = 'contracts_finder';
  const base = SOURCES[src].base;
  const st = loadState(src);
  let next = st.next || `${base}?publishedFrom=${FROM}T00:00:00&publishedTo=${TO}T23:59:59&limit=100`;
  let done = st.items || 0;
  if (st.complete) { log(`${src}: window ${FROM} to ${TO} already complete`); return; }
  while (next) {
    if (done >= LIMIT || outOfTime()) break;
    const { res, buf, error } = await get(src, next, { accept: 'application/json' });
    if (!res || !res.ok) { log(`${src}: search failed (${error || `HTTP ${res.status}`}); stopping`); fail(src, { id: 'search-page', url: next }, error ? 'network' : `http-${res.status}`); break; }
    const page = JSON.parse(buf.toString('utf8'));
    const byOcid = new Map();
    for (const rel of page.releases || []) {
      if (!rel.ocid) continue;
      if (!byOcid.has(rel.ocid)) byOcid.set(rel.ocid, []);
      byOcid.get(rel.ocid).push(rel);
    }
    for (const [ocid, releases] of byOcid) {
      if (done >= LIMIT) break;
      const latest = releases.map((r) => r.date || '').sort().pop();
      const title = releases[0].tender?.title || '';
      const body = Buffer.from(JSON.stringify({ ocid, license: page.license, publishedDate: page.publishedDate, retrievedFrom: next, releases }, null, 1));
      await save(src, { id: safeId(ocid), ext: 'json', url: next, title, published_at: latest }, body);
      done++; stat(src).items++;
    }
    next = page.links?.next || null;
    await saveState(src, next ? { next, items: done } : { items: done, complete: true });
  }
}

// ---- run ----------------------------------------------------------------------------------------------------------
const RUNNERS = { committees: runCommittees, govuk: runGovuk, contracts_finder: runContractsFinder };
log(`run: --source ${SOURCE} --days ${DAYS} (${FROM} to ${TO})${LIMIT === Infinity ? '' : ` --limit ${LIMIT}`}${MAX_MINUTES === Infinity ? '' : ` --max-minutes ${MAX_MINUTES}`}`);
const stopped = {};
for (const s of SOURCE === 'all' ? Object.keys(RUNNERS) : [SOURCE]) {
  if (outOfTime()) { log(`${s}: not started (time budget reached)`); continue; }
  try { await RUNNERS[s](); }
  catch (e) {
    if (e instanceof SourceStop) { stopped[s] = e.message; log(`${s}: stopped (${e.message})`); }
    else { stopped[s] = e.message; log(`${s}: error ${e.stack || e.message}`); }
  }
  const t = stat(s);
  log(`${s}: items ${t.items}, files ${t.files}, ${(t.bytes / 1048576).toFixed(1)} MB, unchanged ${t.unchanged}, failures ${JSON.stringify(t.failures)}${loadState(s).complete ? ', window complete' : ''}`);
}
log(`run: done in ${Math.round((Date.now() - started) / 1000)} s${outOfTime() ? ' (time budget reached; run again to carry on)' : ''}`);
if (Object.keys(stopped).length) process.exitCode = 1;
