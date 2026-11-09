// QA1 A2, A3 and A4 (owner approved, 9 Nov 2026): rules checked on a built site. Reads only: it loads pages from a local
// build and reads two ids from the database; it writes nothing but its report. Run by the pre-push check
// (scripts/checks/mobile-audit-prepush.mjs) against the commit being pushed, or by hand against a running build:
//   node scripts/checks/qa/rendered-checks.mjs --base http://localhost:3000 [--all] [--write-baseline] [--json <file>]
// Pages: one example of each page type in scripts/checks/mobile-audit-fast.txt (--all: every type in
// mobile-audit-pages.csv), the examples taken from mobile-audit-pages.csv as the mobile audit does.
//   A2  no time relative word in what readers see: "present", "now", "currently", "this Parliament", "to date", "so far"
//       in the page's visible text. Allowed phrases: time_words_allow in house-style-exceptions.json; page types that show the
//       official record word for word (Hansard, petitions, motions, written questions) are skipped: time_words_skip_routes.
//   A3  phone length: at 375px, as the page first opens (folds closed), at most 2,500px tall. Baseline: audit/mp2's
//       page-lengths.csv when MP2 writes it, else page-length-baseline.json (measured when this check was added).
//   A4  official record links: each bill page links to bills.parliament.uk for that bill, each division page to
//       votes.parliament.uk for that division (ids read from the database).
// A2 and A3 found problems on pages that existed before the check; those are in rendered-baseline.json and are
// expected: a run fails only on a new one (a page over the limit that was not, or longer than its baseline by more than
// 200px; a time word on a page that did not have it). A4 for divisions is an expected failure until division pages link
// to Parliament's record (EXPECTED_A4_DIVISIONS below); A4 for bills is a hard rule.
// Dates (QA2c): each "Updated" line is judged against the limit of the source it names (record-dates.mjs) and reported
// with the counts; a stale date is data, not code, so it is listed but never refuses a push (the weekly live check and
// the freshness monitor report data age).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { loadSources, recordDates, judgeDates } from './record-dates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:3000').replace(/\/$/, '');
const ALL = argv.includes('--all');
const WRITE = argv.includes('--write-baseline');
const JSON_OUT = arg('--json', null);
const LIMIT_PX = 2500;
const GROWTH_PX = 200;
const EXPECTED_A4_DIVISIONS = true;
const BASELINE_FILE = path.join(HERE, 'rendered-baseline.json');
const MP2_CSV = '/Volumes/GoliathSSD/opengovt-work/Claude outputs/audit/mp2/page-lengths.csv';

function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}

function pages() {
  const all = parseCsv(fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-pages.csv'), 'utf8')).map((r) => ({ route: r.route, url: r.example_url }));
  const first = new Map();
  for (const p of all) if (!first.has(p.route)) first.set(p.route, p);
  if (ALL) return [...first.values()];
  const types = fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-fast.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return [...new Set(types.map((t) => first.get(t) ?? all.find((p) => p.url === t)).filter(Boolean))];
}

const SOURCES = loadSources(ROOT);
const exceptions = JSON.parse(fs.readFileSync(path.join(HERE, 'house-style-exceptions.json'), 'utf8'));
const TIME_WORDS = [/\bpresent\b/i, /\bnow\b/i, /\bcurrently\b/i, /\bthis Parliament\b/i, /\bto date\b/i, /\bso far\b/i];

// The text a reader sees: the body without scripts, styles, templates, hidden inputs and tags.
export function visibleText(html) {
  return html
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<head\b[\s\S]*?<\/head>/i, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&#x27;|&#39;/g, "'").replace(/&ldquo;|&rdquo;|&quot;/g, '"').replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ');
}

export function timeWords(text) {
  let t = text;
  for (const a of exceptions.time_words_allow ?? []) t = t.split(a).join(' ');
  const out = [];
  for (const re of TIME_WORDS) {
    const m = re.exec(t);
    if (m) out.push(`${m[0].toLowerCase()}: …${t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30).trim()}…`);
  }
  return out;
}

async function rest(pathAndQuery) {
  if (fs.existsSync(path.join(ROOT, '.env.local')) && !process.env.SUPABASE_SECRET_KEY) process.loadEnvFile(path.join(ROOT, '.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY missing');
  const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`database read ${res.status}`);
  return res.json();
}

// The official record each bill or division page must link to, from the database.
async function officialLink(urlPath) {
  let m = /^\/bills\/(\d+)$/.exec(urlPath);
  if (m) {
    const [b] = await rest(`bill?select=parliament_id&id=eq.${m[1]}`);
    return b?.parliament_id ? { kind: 'bill', href: `https://bills.parliament.uk/bills/${b.parliament_id}` } : null;
  }
  m = /^\/divisions\/pw-(\d{4}-\d{2}-\d{2})-(\d+)(?:-commons)?$/.exec(urlPath);
  if (m) {
    const [d] = await rest(`commons_division_totals?select=division_id&division_number=eq.${m[2]}&division_date=eq.${m[1]}&limit=1`).catch(() => []);
    return { kind: 'division', href: d?.division_id ? `https://votes.parliament.uk/Votes/Commons/Division/${d.division_id}` : null };
  }
  return null;
}

async function main() {
  const list = pages();
  const extra = ALL ? [] : [{ route: '/bills/[id]', url: '/bills/3942' }, { route: '/bills/[id]', url: '/bills/4080' }, { route: '/divisions/[slug]', url: '/divisions/pw-2019-01-15-293-commons' }];
  const results = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.route('**/*', (r) => (/opengovt\.uk|posthog|vercel-insights|_vercel\/(insights|speed)/.test(r.request().url()) ? r.abort() : r.continue()));
  const page = await ctx.newPage();
  for (const p of [...list, ...extra]) {
    const r = { route: p.route, url: p.url, status: null, height: null, timeWords: [], link: null, dates: [] };
    try {
      const res = await fetch(BASE + p.url, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
      r.status = res.status;
      const html = res.status === 200 ? await res.text() : '';
      if (html && !(exceptions.time_words_skip_routes ?? []).includes(p.route)) r.timeWords = timeWords(visibleText(html));
      if (html) r.dates = judgeDates(recordDates(html), p.route, SOURCES).map((d) => ({ ...d, date: d.date.toISOString().slice(0, 10) }));
      const want = await officialLink(p.url).catch((e) => ({ kind: 'error', href: null, error: e.message }));
      if (want) r.link = { ...want, found: want.href ? html.includes(want.href) : false };
      if (res.status === 200 && !extra.includes(p)) {
        await page.goto(BASE + p.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(300);
        r.height = await page.evaluate(() => Math.round(document.documentElement.scrollHeight));
      }
    } catch (e) { r.error = e.message.split('\n')[0]; }
    results.push(r);
  }
  await browser.close();

  if (WRITE) {
    const b = { about: 'QA1 rendered checks baseline: page heights at 375px and the time words found when the check was added (or last accepted). A run fails on anything new.', written: new Date().toISOString().slice(0, 10), pages: {} };
    for (const r of results) if (r.height != null || r.timeWords.length) b.pages[r.url] = { height: r.height, timeWords: r.timeWords.map((w) => w.split(':')[0]) };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 1) + '\n');
    console.log(`rendered checks: baseline written for ${Object.keys(b.pages).length} pages`);
  }
  const base = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).pages : {};
  // MP2's measured lengths, when it has written them, override the baseline for the pages they cover.
  if (fs.existsSync(MP2_CSV)) for (const row of parseCsv(fs.readFileSync(MP2_CSV, 'utf8'))) {
    const u = row.url || row.example_url, h = Number(row.height_closed || row.height || row.px);
    if (u && Number.isFinite(h)) base[u] = { ...(base[u] ?? {}), height: h };
  }

  const fails = [], expected = [];
  for (const r of results) {
    if (r.error || (r.status != null && r.status >= 500)) fails.push(`${r.url}: could not check (${r.error ?? `HTTP ${r.status}`})`);
    const b = base[r.url] ?? {};
    if (r.height != null && r.height > LIMIT_PX) {
      const known = b.height != null && b.height > LIMIT_PX;
      if (!known) fails.push(`A3 ${r.url}: ${r.height}px at 375px, over ${LIMIT_PX}px (new)`);
      else if (r.height > b.height + GROWTH_PX) fails.push(`A3 ${r.url}: ${r.height}px, longer than its baseline ${b.height}px`);
      else expected.push(`A3 ${r.url}: ${r.height}px (baseline ${b.height}px, page not yet shortened)`);
    }
    for (const w of r.timeWords) {
      const word = w.split(':')[0];
      if ((b.timeWords ?? []).includes(word)) expected.push(`A2 ${r.url}: ${w}`);
      else fails.push(`A2 ${r.url}: ${w} (new)`);
    }
    for (const d of r.dates) if (d.stale) expected.push(`date ${r.url}: "Updated ${d.date}" is ${d.age} days old, over ${d.limit} for ${d.judgedBy === 'source' ? d.source : "this page's data"} (data, reported only)`);
    if (r.link && !r.link.found) {
      const line = `A4 ${r.url}: no link to ${r.link.href ?? `Parliament's record (${r.link.error ?? 'id not found'})`}`;
      if (r.link.kind === 'division' && EXPECTED_A4_DIVISIONS) expected.push(line);
      else fails.push(line);
    }
  }
  const summary = {
    pages: results.length,
    a2_pages_with_time_words: results.filter((r) => r.timeWords.length).length,
    a3_over_limit: results.filter((r) => r.height != null && r.height > LIMIT_PX).length,
    a4_checked: results.filter((r) => r.link).length,
    a4_missing: results.filter((r) => r.link && !r.link.found).length,
    date_lines: results.reduce((n, r) => n + r.dates.length, 0),
    date_lines_by_source: results.reduce((n, r) => n + r.dates.filter((d) => d.judgedBy === 'source').length, 0),
    dates_stale: results.reduce((n, r) => n + r.dates.filter((d) => d.stale).length, 0),
    new_problems: fails.length,
    expected: expected.length,
  };
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary, fails, expected, results }, null, 1));
  console.log(`rendered checks (A2 time words, A3 phone length, A4 official links): ${JSON.stringify(summary)}`);
  for (const e of expected) console.log(`  expected: ${e}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  return fails.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => { console.error(`rendered checks could not run: ${e.message}`); process.exit(1); });
