// QA1 A2, A3, A6 and A9 (owner approved, 9 to 11 Nov 2026): rules checked on a built site. Reads only: it loads pages
// from a local build; it writes nothing but its report. Run by the pre-push check
// (scripts/checks/mobile-audit-prepush.mjs) against the commit being pushed, or by hand against a running build:
//   node scripts/checks/qa/rendered-checks.mjs --base http://localhost:3000 [--all] [--write-baseline] [--json <file>]
// Pages: one example of each page type in scripts/checks/mobile-audit-fast.txt (--all: every type in
// mobile-audit-pages.csv), the examples taken from mobile-audit-pages.csv as the mobile audit does.
//   A2  no time relative word in what readers see: "present", "now", "currently", "this Parliament", "to date", "so far",
//       "this week", "last week", a weekday with no date ("on Friday"), "ago", "weeks on", "months on"
//       in the page's visible text. Allowed phrases: time_words_allow in house-style-exceptions.json; page types that show the
//       official record word for word (Hansard, petitions, motions, written questions) are skipped: time_words_skip_routes.
//   A3  phone length: at 375px, as the page first opens (folds closed), at most 2,500px tall, not counting article text
//       (elements marked data-article-body: editorials, briefings, press releases; owner, 9 Nov 2026, QA2d). Baseline: audit/mp2's
//       page-lengths.csv when MP2 writes it, else page-length-baseline.json (measured when this check was added).
//   A6  first screen on phones (QA6, owner, 10 Nov 2026): the page's main action, the element marked data-main-action (the
//       search field, postcode field, first question or first record), must start above 760px at 430 x 932 (UX3h), above
//       700px at 390 x 844 and above 520px at 320 x 568; at 844 x 390 the h1 and the main action must both start within
//       390px. Measured from the top of the page as it opens, JavaScript on. Each page's failures are codes (no-main-action,
//       main-hidden, main-430x932, main-390x844, main-320x568, h1-844x390, main-844x390, no-h1). no-main-action always
//       fails (UX3c): every page type, new ones included, marks its main action. Other codes in the baseline (a6) are
//       expected; the baseline is empty since UX3 marked every page type and brought each within the limits.
//       Desktop (owner, 10 Nov 2026): at 1280 x 720 the main action, and the first result where a page marks one with
//       data-first-result, must start above 720px (codes main-1280x720, first-1280x720).
//       Consent (T1-7ab, owner via Cowork, 10 Nov 2026): these positions are measured with the cookie choice already made,
//       as a returning reader sees the page. A separate first-visit pass, with no choice made, checks at each size that
//       the cookie banner (fixed to the foot of the screen at every width) does not cover the main action as the page
//       opens (code banner-<size>).
//   A9  only sources link outside (EL1, owner, 10 and 11 Nov 2026; T1-5c): a link to another site may only be in the
//       page's Sources fold (data-og-sources, app/components/PageSources.tsx), a row's own official document (marked
//       data-og-row-source), inline citations in article or biography text (inside data-article-body or
//       data-og-citations), the footer licence line, a licence or data attribution (a licence address, rel="license" or
//       data-og-attribution), or mailto. Each other one is a failure, always (no baseline).
//       A4 (official record links on bill and division pages) was dropped by T1-5c: those links are in the Sources fold.
// A2 and A3 found problems on pages that existed before the check; those are in rendered-baseline.json and are
// expected: a run fails only on a new one (a page over the limit that was not, or longer than its baseline by more than
// 200px; a time word on a page that did not have it).
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
// A6 (QA6): viewport, and the most px from the top of the page at which the main action (and, landscape, the h1) may start.
// 430 x 932, a large phone (UX3h, owner approved, 10 Nov 2026): the main action above 760px.
const A6_VIEWS = [
  { name: '430x932', width: 430, height: 932, main: 760 },
  { name: '390x844', width: 390, height: 844, main: 700 },
  { name: '320x568', width: 320, height: 568, main: 520 },
  { name: '844x390', width: 844, height: 390, main: 390, h1: 390 },
  { name: '1280x720', width: 1280, height: 720, main: 720, first: 720, desktop: true },
];
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
// QA8 (owner, 10 Nov 2026): also "this week", "last week", a weekday with no date after it ("on Friday"; "on Friday
// 17 July 2026" is fine), "ago", and "weeks on" or "months on".
const TIME_WORDS = [/\bpresent\b/i, /\bnow\b/i, /\bcurrently\b/i, /\bthis Parliament\b/i, /\bto date\b/i, /\bso far\b/i,
  /\bthis week\b/i, /\blast week\b/i, /\bon (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b(?![ ,]+\d)/i, /\bago\b/, /\b(?:weeks|months) on\b/i]; // "ago" in lower case only: "AGO" is the Attorney General's Office

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

// A9 (T1-5c): every link to another site on the page that is not in an allowed place, as "host: label".
export const A9_LICENCE = /^https?:\/\/(www\.)?(nationalarchives\.gov\.uk\/doc\/open-government-licence|creativecommons\.org\/licenses|parliament\.uk\/site-information\/copyright-parliament\/open-parliament-licence)/i;
function outsideLinks(licence) {
  const re = new RegExp(licence);
  const out = [];
  for (const a of document.querySelectorAll('a[href]')) {
    let u; try { u = new URL(a.getAttribute('href'), location.href); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || u.host === location.host || /(^|\.)opengovt\.uk$/.test(u.hostname)) continue;
    if (a.closest('[data-og-sources], footer, [data-og-row-source], [data-article-body], [data-og-citations], [data-og-attribution]')) continue;
    if (re.test(u.href) || (a.getAttribute('rel') ?? '').split(/\s+/).includes('license')) continue;
    out.push(`${u.hostname.replace(/^www\./, '')}: ${(a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)}`);
  }
  return [...new Set(out)];
}

// A6: the measured position behind a code, for the report.
function a6Detail(r, code) {
  const b = /^banner-(\d+x\d+)$/.exec(code);
  if (b) { const x = r.a6Banner?.[b[1]]; return x ? ` (main action ${x.mainTop} to ${x.mainBottom}px, banner from ${x.bannerTop}px, first visit)` : ''; }
  const m = /^(main|h1|first)-(\d+x\d+)$/.exec(code);
  if (!m) return '';
  const v = A6_VIEWS.find((x) => x.name === m[2]);
  const at = r.a6Tops?.[m[2]]?.[m[1]];
  return ` (starts at ${at ?? 'hidden'}px, limit ${m[1] === 'h1' ? v.h1 : m[1] === 'first' ? v.first : v.main}px)`;
}

async function main() {
  // One page at a time, in every pass (owner, 10 Nov 2026): a local build reads the production database, so our own
  // checks must never add to a burst of page loads. Keep it so: no Promise.all over pages here.
  const list = pages();
  const extra = ALL ? [] : [{ route: '/bills/[id]', url: '/bills/3942' }, { route: '/bills/[id]', url: '/bills/4080' }, { route: '/divisions/[slug]', url: '/divisions/pw-2019-01-15-293-commons' }];
  // The extra pages (once A4's bill and division samples) are loaded for A9 like the others.
  const results = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.route('**/*', (r) => (/opengovt\.uk|posthog|vercel-insights|_vercel\/(insights|speed)/.test(r.request().url()) ? r.abort() : r.continue()));
  const page = await ctx.newPage();
  for (const p of [...list, ...extra]) {
    const r = { route: p.route, url: p.url, status: null, height: null, timeWords: [], outside: [], dates: [], a6: null, a6Tops: null };
    try {
      const res = await fetch(BASE + p.url, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
      r.status = res.status;
      const html = res.status === 200 ? await res.text() : '';
      if (html && !(exceptions.time_words_skip_routes ?? []).includes(p.route)) r.timeWords = timeWords(visibleText(html));
      if (html) r.dates = judgeDates(recordDates(html), p.route, SOURCES).map((d) => ({ ...d, date: d.date.toISOString().slice(0, 10) }));
      if (res.status === 200) {
        await page.goto(BASE + p.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(300);
        r.outside = await page.evaluate(outsideLinks, A9_LICENCE.source);
      }
      if (res.status === 200 && !extra.includes(p)) {
        // QA2d (owner, 9 Nov 2026): article text is never folded, so the limit applies to the page minus the article body.
        r.height = await page.evaluate(() => Math.round(document.documentElement.scrollHeight - [...document.querySelectorAll('[data-article-body]')].reduce((n, el) => n + el.getBoundingClientRect().height, 0)));
      }
    } catch (e) { r.error = e.message.split('\n')[0]; }
    results.push(r);
  }
  // A6: the same pages at four phone sizes and one desktop size, one context each.
  for (const v of A6_VIEWS) {
    const c = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1, isMobile: !v.desktop, hasTouch: !v.desktop });
    // A returning reader: the cookie choice is made, so no banner (T1-7ab).
    await c.addCookies([{ name: 'og_cookies_policy', value: encodeURIComponent(JSON.stringify({ analytics: false })), url: BASE }]);
    await c.route('**/*', (q) => (/opengovt\.uk|posthog|vercel-insights|_vercel\/(insights|speed)/.test(q.request().url()) ? q.abort() : q.continue()));
    const pg = await c.newPage();
    for (const r of results) {
      if (r.status !== 200 || r.height == null) continue;
      try {
        await pg.goto(BASE + r.url, { waitUntil: 'load', timeout: 60000 });
        await pg.waitForTimeout(300);
        const t = await pg.evaluate(() => {
          const top = (el) => (el && el.getClientRects().length ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null);
          const main = document.querySelector('[data-main-action]');
          const first = document.querySelector('[data-first-result]');
          return { main: main ? top(main) : undefined, h1: top(document.querySelector('h1')), first: first ? top(first) : undefined };
        });
        r.a6 ??= []; r.a6Tops ??= {};
        r.a6Tops[v.name] = t;
        if (t.main === undefined) { if (!r.a6.includes('no-main-action')) r.a6.push('no-main-action'); }
        else if (t.main === null) { if (!r.a6.includes('main-hidden')) r.a6.push('main-hidden'); }
        else if (t.main >= v.main) r.a6.push(`main-${v.name}`);
        if (v.h1 != null) { if (t.h1 == null) r.a6.push('no-h1'); else if (t.h1 >= v.h1) r.a6.push(`h1-${v.name}`); }
        // The first result is checked only where a page marks one (not every page has results).
        if (v.first != null && t.first !== undefined && (t.first === null || t.first >= v.first)) r.a6.push(`first-${v.name}`);
      } catch (e) { r.a6 ??= []; r.a6.push(`error-${v.name}`); }
    }
    await c.close();
    // First visit (no cookie choice yet): the banner must not cover the main action as the page opens.
    const fv = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1, isMobile: !v.desktop, hasTouch: !v.desktop });
    await fv.route('**/*', (q) => (/opengovt\.uk|posthog|vercel-insights|_vercel\/(insights|speed)/.test(q.request().url()) ? q.abort() : q.continue()));
    const fp = await fv.newPage();
    for (const r of results) {
      if (r.status !== 200 || r.height == null) continue;
      try {
        await fp.goto(BASE + r.url, { waitUntil: 'load', timeout: 60000 });
        await fp.waitForTimeout(300);
        const x = await fp.evaluate(() => {
          const main = document.querySelector('[data-main-action]');
          const banner = [...document.querySelectorAll('.og-cookie-banner')].find((b) => b.getClientRects().length);
          if (!main || !main.getClientRects().length || !banner) return null;
          const m = main.getBoundingClientRect(), b = banner.getBoundingClientRect();
          return { mainTop: Math.round(m.top), mainBottom: Math.round(m.bottom), bannerTop: Math.round(b.top), bannerBottom: Math.round(b.bottom) };
        });
        // Covered: the main action starts on the first screen but its top line is under the banner.
        if (x && x.mainTop < v.height && x.mainTop + 20 > x.bannerTop && x.mainTop < x.bannerBottom) {
          r.a6 ??= []; r.a6Banner ??= {};
          r.a6Banner[v.name] = x;
          r.a6.push(`banner-${v.name}`);
        }
      } catch (e) { r.a6 ??= []; r.a6.push(`error-first-visit-${v.name}`); }
    }
    await fv.close();
  }
  await browser.close();

  if (WRITE) {
    const b = { about: 'QA1 rendered checks baseline: page heights at 375px and the time words found when the check was added (or last accepted). A run fails on anything new.', written: new Date().toISOString().slice(0, 10), pages: {} };
    for (const r of results) if (r.height != null || r.timeWords.length) b.pages[r.url] = { height: r.height, timeWords: r.timeWords.map((w) => w.split(':')[0]), ...(r.a6?.length ? { a6: r.a6 } : {}) };
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
    for (const code of r.a6 ?? []) {
      const line = `A6 ${r.url}: ${code}${a6Detail(r, code)}`;
      if (code.startsWith('error-')) fails.push(`${line} (could not measure)`);
      // Every page type marks its main action (UX3c, owner approved, 10 Nov 2026): an unmarked page always fails, baseline or not.
      else if (code === 'no-main-action') fails.push(`${line} (every page type must mark its main action with data-main-action)`);
      else if ((b.a6 ?? []).includes(code)) expected.push(line);
      else fails.push(`${line} (new)`);
    }
    for (const d of r.dates) if (d.stale) expected.push(`date ${r.url}: "Updated ${d.date}" is ${d.age} days old, over ${d.limit} for ${d.judgedBy === 'source' ? d.source : "this page's data"} (data, reported only)`);
    for (const o of r.outside ?? []) fails.push(`A9 ${r.url}: links outside the site, not as a source (${o})`);
  }
  const summary = {
    pages: results.length,
    a2_pages_with_time_words: results.filter((r) => r.timeWords.length).length,
    a3_over_limit: results.filter((r) => r.height != null && r.height > LIMIT_PX).length,
    a9_pages_with_outside_links: results.filter((r) => r.outside?.length).length,
    a9_outside_links: results.reduce((n, r) => n + (r.outside?.length ?? 0), 0),
    date_lines: results.reduce((n, r) => n + r.dates.length, 0),
    date_lines_by_source: results.reduce((n, r) => n + r.dates.filter((d) => d.judgedBy === 'source').length, 0),
    dates_stale: results.reduce((n, r) => n + r.dates.filter((d) => d.stale).length, 0),
    a6_pages_failing: results.filter((r) => r.a6?.length).length,
    a6_main_action_marked: results.filter((r) => r.a6Tops && Object.values(r.a6Tops).some((t) => t.main !== undefined)).length,
    new_problems: fails.length,
    expected: expected.length,
  };
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary, fails, expected, results }, null, 1));
  console.log(`rendered checks (A2 time words, A3 phone length, A6 first screen, A9 outside links): ${JSON.stringify(summary)}`);
  for (const e of expected) console.log(`  expected: ${e}`);
  for (const f of fails) console.log(`  FAIL ${f}`);
  return fails.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => { console.error(`rendered checks could not run: ${e.message}`); process.exit(1); });
