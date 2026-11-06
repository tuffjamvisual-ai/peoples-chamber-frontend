// Mobile audit (owner, 4 Nov 2026): every page type on phones, against a local production build, so nothing is missed.
// Reads only: it loads pages and changes nothing. Pages come from scripts/checks/mobile-audit-pages.csv (made by
// mobile-audit-pages.ts). Each page loads once per width, is measured with the cookie banner showing, then the banner is
// dismissed and it is measured again.
//   a) sideways scroll; elements wider than the screen; rows whose content is cut off with no scroll cue
//   b) visible a, button, input, select, summary under 44px tall, except links in running paragraph text and the footer
//   c) text under 15px
//   d) h1 below 812px, or the first real content after it below 1,200px
//   e) images or figures taller than 400px
//   f) more than 6 rows of links or buttons before the first real content
//   g) the same set of links twice on the page
//   h) page height over 10,000px at 375px as it first opens (owner, 5 Nov 2026); over 9,000px is a warning, not a failure
//   i) console errors and failed requests
//
//   npm run audit:mobile                                       full run; starts next start on a spare port (needs a build)
//   node scripts/checks/mobile-audit.mjs --base <url>          against a server already running
//   node scripts/checks/mobile-audit.mjs --fast                375px, the page types in mobile-audit-fast.txt, checks a, b,
//                                                              c and h; exit 1 if any fails (the pre-push check). Pages over
//                                                              9,000px are listed as warnings and do not fail it
//   --out <dir> (default "Claude outputs/mobile-audit"), --limit <n> (first n pages, to try it)
//   --engine webkit, --widths 375[,414], --no-shots (mobile-audit-deep.mjs runs it this way in Safari's engine)
//
// Requests to opengovt.uk, analytics and Next.js link prefetches are blocked and not counted: a local run must not fetch
// the live site, and prefetches would render hundreds of other pages against the production database.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const FAST = argv.includes('--fast');
const OUT = opt('out') ?? 'Claude outputs/mobile-audit';
const LIMIT = opt('limit') ? Number(opt('limit')) : null;
const ENGINE = opt('engine') === 'webkit' ? webkit : chromium;
const WIDTHS = FAST ? [375] : opt('widths') ? opt('widths').split(',').map(Number) : [360, 375, 414];
const HEIGHT = 812;
const CONCURRENCY = Number(opt('concurrency') ?? 4);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const WARN_HEIGHT = 9000, MAX_HEIGHT = 10000; // owner, 5 Nov 2026: warn, then fail, at 375px as the page first opens

function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split('\n').slice(1)) {
    const cells = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
    rows.push({ route: cells[0], url: cells[1], why: cells[2] });
  }
  return rows;
}

// Every published report and briefing, from the site's own sitemap, so a new one is measured from the day it appears
// (owner, 5 Nov 2026: all of them, not a sample). A missing or unreadable sitemap stops the audit rather than skip them.
async function reportPages(base) {
  const res = await fetch(`${base}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const paths = [...(await res.text()).matchAll(/<loc>[^<]*?(\/(editorials|briefings)\/[^/<]+)<\/loc>/g)];
  if (!paths.length) throw new Error('sitemap: no reports or briefings found');
  return paths.map((m) => ({ route: `/${m[2]}/[slug]`, url: m[1], why: 'every report and briefing' }));
}

// A page's height at 375px with JavaScript off (owner, 5 Nov 2026; every page in the full audit since 6 Nov), read from a full page image:
// scripts cannot run. Every page in the full audit and in the fast audit before a push (owner, 6 Nov 2026).
const isReport = (url) => /^\/(editorials|briefings)\/[^/]+$/.test(url);
async function noJsHeight(browser, base, url) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: HEIGHT }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, javaScriptEnabled: false });
  try {
    const page = await ctx.newPage();
    await page.route('**/*', (route) => (blocked(route.request().url()) ? route.abort() : route.continue()));
    await page.goto(base + url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    return (await page.screenshot({ fullPage: true })).readUInt32BE(20);
  } finally {
    await ctx.close();
  }
}

function choosePages() {
  const all = parseCsv(fs.readFileSync(path.join(HERE, 'mobile-audit-pages.csv'), 'utf8'));
  if (!FAST) return LIMIT ? all.slice(0, LIMIT) : all;
  // One page per type: the typical example, which the list gives first for each route.
  const types = fs.readFileSync(path.join(HERE, 'mobile-audit-fast.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  // A line is a route (its typical example) or one exact page, for pages near the height limit.
  return [...new Set(types.map((t) => all.find((p) => p.route === t) ?? all.find((p) => p.url === t)).filter(Boolean))];
}

// Runs in the page. Returns every measure for the page as it now is.
function measure() {
  const vw = window.innerWidth;
  const visible = (el) => {
    if (!el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    const s = getComputedStyle(el);
    if (s.clipPath && s.clipPath.startsWith('inset(50%')) return false;
    if (s.clip === 'rect(0px, 0px, 0px, 0px)') return false;
    return !el.closest('[aria-hidden="true"]');
  };
  const label = (e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('src') || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
  const absY = (e) => Math.round(e.getBoundingClientRect().top + window.scrollY);
  const chrome = (e) => e.closest('.og-cookie-banner, .og-mbar, .og-navwrap, .ng-tab, .og-menu-panel, footer');

  // a) sideways scroll, too wide, cut off
  const scroller = (e) => { let p = e.parentElement; while (p && p !== document.body) { if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowX)) return true; p = p.parentElement; } return false; };
  const wide = [...document.querySelectorAll('body *')].filter((e) => visible(e) && e.getBoundingClientRect().width > vw + 1 && !scroller(e));
  const cut = [];
  for (const e of document.querySelectorAll('body, body *')) {
    const s = getComputedStyle(e);
    if (!/(hidden|auto|scroll|clip)/.test(s.overflowX) || e.scrollWidth <= e.clientWidth + 1 || e.clientWidth === 0 || !visible(e)) continue;
    if (s.textOverflow === 'ellipsis') continue;
    const box = e.getBoundingClientRect();
    const cue = (s.maskImage && s.maskImage !== 'none') || (s.webkitMaskImage && s.webkitMaskImage !== 'none') || e.offsetHeight > e.clientHeight + 1 || e.matches('.more-right');
    if (cue) continue;
    // Only real content past the edge: text or a control, not a decorative layer.
    const past = [...e.querySelectorAll('a, button, td, th, li, p, span, h1, h2, h3, img')].find((c) => {
      if (!visible(c)) return false;
      const r = c.getBoundingClientRect();
      return r.right > box.right + 1 && (c.textContent || '').trim();
    });
    if (past) cut.push(`${label(e).slice(0, 40)} (${e.scrollWidth} in ${e.clientWidth}): ${label(past)}`);
  }

  // b) tap targets
  const running = (el) => {
    if (el.tagName !== 'A') return false;
    const block = el.closest('p, blockquote, figcaption');
    if (!block) return false;
    return (block.textContent || '').trim().length > (el.textContent || '').trim().length + 15;
  };
  const targets = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')].filter((e) => visible(e) && !e.closest('footer'));
  const small = targets.filter((e) => !running(e) && e.getBoundingClientRect().height < 43.99);

  // c) text under 15px
  const tiny = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.nodeValue.trim()) continue;
    const p = t.parentElement;
    if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(p.tagName) || tiny.has(p) || !visible(p)) continue;
    const size = parseFloat(getComputedStyle(p).fontSize);
    if (size < 14.95) tiny.set(p, size);
  }

  // d) heading and first real content
  const h1 = [...document.querySelectorAll('h1')].find(visible);
  const after = (e) => !h1 || (h1.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
  // MP figure tiles and folded section buttons are content, not navigation (owner, 4 Nov 2026), as are a form and a block
  // of text of any tag. The highest one on the screen counts, as a phone layout can reorder the page.
  const isContent = (e) => {
    if (!visible(e) || chrome(e) || !after(e) || (e.closest('nav') && !e.matches('.mp-headline-tile, .pf-btn'))) return false;
    const text = (e.textContent || '').trim();
    if (e.matches('div, span, dd')) return text.length >= 20 && !e.querySelector('div, p, ul, ol, table, section, article, a, button');
    if (e.tagName === 'FORM') return true;
    return e.tagName === 'P' ? text.length >= 20 : text.length > 0;
  };
  const content = [...document.querySelectorAll('p, li, tr, article, form, div, span, dd, [class*="card"], .mp-headline-tile, .pf-btn')].filter(isContent)
    .reduce((best, e) => (!best || e.getBoundingClientRect().top < best.getBoundingClientRect().top ? e : best), null);

  // e) tall images and figures
  const tall = [...document.querySelectorAll('img, figure, picture')].filter((e) => visible(e) && e.getBoundingClientRect().height > 400);

  // f) rows of links or buttons before the first real content
  let run = new Set(), most = 0;
  for (const e of document.querySelectorAll('a[href], button, summary, h1, h2, h3, h4, label, p')) {
    if (content && (content === e || content.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
    if (!visible(e) || chrome(e)) continue;
    if (e.matches('a, button, summary')) { run.add(Math.round(e.getBoundingClientRect().top + window.scrollY)); most = Math.max(most, run.size); } else if (!e.querySelector('a, button')) run = new Set();
  }

  // g) the same set of links twice
  const sets = new Map();
  for (const c of document.querySelectorAll('nav, ul, ol, details, aside, [role=navigation]')) {
    if (!visible(c) || c.closest('.og-menu-panel')) continue;
    const links = [...new Set([...c.querySelectorAll('a[href]')].filter(visible).map((a) => a.getAttribute('href')))].sort();
    if (links.length < 3) continue;
    const k = links.join('|');
    if (!sets.has(k)) sets.set(k, []);
    const held = sets.get(k);
    if (!held.some((o) => o.contains(c) || c.contains(o))) held.push(c);
  }
  const dup = [...sets.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${v.length} times: ${k.split('|').slice(0, 4).join(' ')}`);

  const h1Y = h1 ? absY(h1) : null;
  const contentY = content ? absY(content) : null;
  return {
    horizontal_scroll: Math.max(0, document.documentElement.scrollWidth - vw),
    too_wide: wide.length, too_wide_eg: wide.slice(0, 3).map(label),
    cut_off: cut.length, cut_off_eg: cut.slice(0, 3),
    under_44: small.length, under_44_eg: small.slice(0, 5).map((e) => `${label(e)} ${Math.round(e.getBoundingClientRect().height)}px`),
    under_15: tiny.size, under_15_eg: [...tiny.entries()].slice(0, 5).map(([e, s]) => `${label(e)} ${s}px`),
    h1_y: h1Y, h1_text: h1 ? (h1.textContent || '').trim().slice(0, 60) : null,
    first_content_y: contentY, first_content_eg: content ? label(content) : null,
    tall_media: tall.length, tall_media_eg: tall.slice(0, 3).map((e) => `${label(e)} ${Math.round(e.getBoundingClientRect().height)}px`),
    link_rows_before_content: most,
    duplicate_link_sets: dup.length, duplicate_link_sets_eg: dup.slice(0, 2),
    page_height: document.documentElement.scrollHeight,
  };
}

const blocked = (url) => /_rsc=|\/_vercel\/|posthog\.com|(^|\/\/)([a-z0-9-]+\.)?opengovt\.uk/.test(url);

async function auditPage(browser, base, page0, width, shotDir) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const consoleErrors = [], failed = [];
  await page.route('**/*', (route) => (blocked(route.request().url()) ? route.abort() : route.continue()));
  page.on('console', (m) => { if (m.type() === 'error' && !blocked(m.location()?.url || '') && !/ERR_FAILED/.test(m.text())) consoleErrors.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => consoleErrors.push(`page error: ${e.message.slice(0, 140)}`));
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!blocked(r.url()) && !/ERR_ABORTED/.test(f)) failed.push(`${f} ${r.url().slice(0, 110)}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !blocked(r.url()) && r.url() !== base + page0.url) failed.push(`${r.status()} ${r.url().slice(0, 110)}`); });
  const row = { route: page0.route, url: page0.url, why: page0.why, width };
  const started = Date.now();
  try {
    const res = await page.goto(base + page0.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    row.status = res?.status() ?? 0;
    row.final_url = page.url().replace(base, '');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    row.load_ms = Date.now() - started;
    row.showing = await page.evaluate(measure);
    const reject = page.getByRole('button', { name: 'Reject analytics' }).first();
    row.banner = (await reject.count()) > 0;
    if (row.banner) { await reject.click(); await page.waitForTimeout(200); }
    row.dismissed = await page.evaluate(measure);
    if (shotDir) {
      row.shots = [];
      const height = row.dismissed.page_height;
      for (const y of [0, 812, 1624]) {
        if (y >= height) break;
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
        const name = `${page0.url === '/' ? 'home' : page0.url.slice(1).replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 110)}-${y}.jpg`;
        const png = await page.screenshot();
        await sharp(png).jpeg({ quality: 62 }).toFile(path.join(shotDir, name));
        row.shots.push(`shots/${name}`);
      }
    }
  } catch (e) {
    row.status = row.status ?? 0;
    row.error = e.message.split('\n')[0].slice(0, 160);
  }
  row.console_errors = [...new Set(consoleErrors)];
  row.failed_requests = [...new Set(failed)];
  await ctx.close();
  return row;
}

// The problems on one row, per check letter.
function problems(row) {
  const out = [];
  const add = (check, text, n = 1) => out.push({ check, text, n });
  if (row.error || !row.status || row.status >= 400) add('i', `page did not load: ${row.error || `HTTP ${row.status}`}`);
  for (const state of ['showing', 'dismissed']) {
    const m = row[state];
    if (!m) continue;
    if (m.horizontal_scroll > 0) add('a', `sideways scroll ${m.horizontal_scroll}px`);
    if (m.too_wide) add('a', `${m.too_wide} element(s) wider than the screen: ${m.too_wide_eg.join('; ')}`, m.too_wide);
    if (m.cut_off) add('a', `${m.cut_off} row(s) cut off with no scroll cue: ${m.cut_off_eg.join('; ')}`, m.cut_off);
    if (m.under_44) add('b', `${m.under_44} target(s) under 44px: ${m.under_44_eg.join('; ')}`, m.under_44);
    if (m.under_15) add('c', `${m.under_15} text element(s) under 15px: ${m.under_15_eg.join('; ')}`, m.under_15);
    if (state === 'dismissed' || !row.dismissed) {
      if (m.tall_media) add('e', `${m.tall_media} image(s) over 400px: ${m.tall_media_eg.join('; ')}`, m.tall_media);
      if (m.link_rows_before_content > 6) add('f', `${m.link_rows_before_content} rows of links before the first content`);
      if (m.duplicate_link_sets) add('g', `same links twice: ${m.duplicate_link_sets_eg.join('; ')}`, m.duplicate_link_sets);
    }
    if (row.width === 375 && m.page_height > MAX_HEIGHT) add('h', `page height ${m.page_height}px (banner ${state})`);
    if (state === 'showing' && row.no_js_height > MAX_HEIGHT) add('h', `page height ${row.no_js_height}px with JavaScript off`);
    if (m.h1_y === null) add('d', `no h1 (banner ${state})`);
    else if (m.h1_y >= HEIGHT) add('d', `h1 at ${m.h1_y}px, below the first screen (banner ${state})`);
    if (m.first_content_y === null) add('d', `no first content found (banner ${state})`);
    else if (m.first_content_y >= 1200) add('d', `first content at ${m.first_content_y}px (banner ${state})`);
  }
  if (row.console_errors?.length) add('i', `${row.console_errors.length} console error(s): ${row.console_errors.slice(0, 2).join('; ')}`, row.console_errors.length);
  if (row.failed_requests?.length) add('i', `${row.failed_requests.length} failed request(s): ${row.failed_requests.slice(0, 3).join('; ')}`, row.failed_requests.length);
  return out;
}

// Pages at 375px over the warning height but not over the limit, tallest first.
function nearLimit(rows) {
  return rows.filter((r) => r.width === 375).map((r) => ({ url: r.url, height: Math.max(r.showing?.page_height ?? 0, r.dismissed?.page_height ?? 0, r.no_js_height ?? 0) }))
    .filter((x) => x.height > WARN_HEIGHT && x.height <= MAX_HEIGHT).sort((a, b) => b.height - a.height);
}
function printNear(near) {
  if (!near.length) return;
  console.log(`warning: ${near.length} page(s) over ${WARN_HEIGHT.toLocaleString('en-GB')}px at 375px (the limit is ${MAX_HEIGHT.toLocaleString('en-GB')}px)`);
  for (const x of near) console.log(`  ${x.height} ${x.url}`);
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const flat = (v) => (Array.isArray(v) ? v.join(' | ') : v);

function writeCsv(rows) {
  const keys = ['horizontal_scroll', 'too_wide', 'too_wide_eg', 'cut_off', 'cut_off_eg', 'under_44', 'under_44_eg', 'under_15', 'under_15_eg', 'h1_y', 'h1_text', 'first_content_y', 'first_content_eg', 'tall_media', 'tall_media_eg', 'link_rows_before_content', 'duplicate_link_sets', 'duplicate_link_sets_eg', 'page_height'];
  const head = ['route', 'url', 'final_url', 'why', 'width', 'status', 'load_ms', 'banner', 'no_js_page_height', ...keys.map((k) => `showing_${k}`), ...keys.map((k) => `dismissed_${k}`), 'console_errors', 'failed_requests', 'problem_checks', 'error'];
  const lines = rows.map((r) => [r.route, r.url, r.final_url, r.why, r.width, r.status, r.load_ms, r.banner, r.no_js_height ?? '', ...keys.map((k) => flat(r.showing?.[k])), ...keys.map((k) => flat(r.dismissed?.[k])), flat(r.console_errors), flat(r.failed_requests), [...new Set(problems(r).map((p) => p.check))].sort().join(''), r.error].map(csvCell).join(','));
  fs.writeFileSync(path.join(OUT, 'results.csv'), [head.join(','), ...lines].join('\n') + '\n');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pageSummaries(rows) {
  const byUrl = new Map();
  for (const r of rows) { if (!byUrl.has(r.url)) byUrl.set(r.url, []); byUrl.get(r.url).push(r); }
  return [...byUrl.entries()].map(([url, list]) => {
    const seen = new Map();
    for (const r of list) for (const p of problems(r)) {
      const key = `${p.check}|${p.text.replace(/\d+/g, '#').slice(0, 70)}`;
      if (!seen.has(key)) seen.set(key, { ...p, widths: new Set([r.width]) }); else seen.get(key).widths.add(r.width);
    }
    const found = [...seen.values()].sort((a, b) => a.check.localeCompare(b.check));
    const checks = new Set(found.map((p) => p.check));
    const elements = Math.max(0, ...list.map((r) => problems(r).reduce((a, p) => a + p.n, 0)));
    const shots = list.find((r) => r.shots)?.shots ?? [];
    return { url, route: list[0].route, why: list[0].why, status: list[0].status, found, checks, count: found.length, elements, shots };
  }).sort((a, b) => b.checks.size - a.checks.size || b.count - a.count || b.elements - a.elements || a.url.localeCompare(b.url));
}

function totals(rows, pages) {
  const letters = 'abcdefghi'.split('');
  const t = {};
  for (const c of letters) {
    const failing = pages.filter((p) => p.checks.has(c));
    t[c] = { pages: failing.length, rows: rows.filter((r) => problems(r).some((p) => p.check === c)).length };
  }
  return t;
}

const CHECK_NAMES = { a: 'sideways scroll, too wide or cut off', b: 'targets under 44px', c: 'text under 15px', d: 'heading or first content too low', e: 'images over 400px', f: 'over 6 rows of links before content', g: 'same links twice', h: 'page over 10,000px at 375px', i: 'errors and failed requests' };

function writeHtml(rows, pages, t, meta) {
  const summary = Object.entries(t).map(([c, v]) => `<li><b>${c}</b> ${esc(CHECK_NAMES[c])}: ${v.pages} of ${pages.length} pages</li>`).join('');
  const cards = pages.map((p, i) => `<section><h2>${i + 1}. <span class="u">${esc(p.url)}</span></h2><p class="m">${esc(p.route)} · ${esc(p.why)} · HTTP ${esc(p.status)} · ${p.checks.size} checks failing, ${p.count} problems</p>
<div class="s">${p.shots.map((s) => `<img loading="lazy" src="${esc(encodeURI(s))}" width="250" alt="">`).join('')}</div>
${p.found.length ? `<ul>${p.found.map((f) => `<li><b>${f.check}</b> ${esc(f.text)} <i>(${[...f.widths].sort().join(', ')}px)</i></li>`).join('')}</ul>` : '<p>No problems.</p>'}</section>`).join('\n');
  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobile audit</title>
<style>body{font:15px/1.45 Georgia,serif;margin:16px;color:#14100d;background:#fff}h1{font-size:24px}h2{font-size:17px;margin:0 0 2px}.u{overflow-wrap:anywhere}section{border-top:2px solid #14100d;padding:12px 0}.m{margin:0 0 8px}.s{display:flex;gap:8px;overflow-x:auto}.s img{border:1px solid #999;flex:none;height:auto}ul{margin:8px 0;padding-left:18px}li{overflow-wrap:anywhere}i{color:#555}</style></head><body>
<h1>Mobile audit</h1><p>${esc(meta)}</p><ul>${summary}</ul>
${cards}</body></html>`);
}

async function startServer() {
  const base = opt('base');
  if (base) return { base, stop: () => {} };
  const port = Number(opt('port') ?? 3199);
  if (!fs.existsSync('.next/BUILD_ID')) throw new Error('no build: run npx next build first');
  // Pages rendered by an earlier server reference script chunks a new build no longer has.
  if (fs.existsSync('.next/server/route-cache')) fs.rmSync('.next/server/route-cache', { recursive: true, force: true });
  const child = spawn('npx', ['next', 'start', '-p', String(port)], { env: { ...process.env, RECOMMENDATIONS_PUBLIC: '1' }, stdio: 'ignore', detached: true });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${url}/support`); return { base: url, stop: () => { try { process.kill(-child.pid); } catch { /* already gone */ } } }; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error('next start did not answer');
}

async function main() {
  const server = await startServer();
  const pages = choosePages();
  if (!FAST && !LIMIT) {
    const seen = new Set(pages.map((p) => p.url));
    const reports = await reportPages(server.base);
    for (const p of reports) if (!seen.has(p.url)) pages.push(p);
    console.log(`${reports.length} reports and briefings from the sitemap, all measured`);
  }
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const shotDir = FAST || argv.includes('--no-shots') ? null : path.join(OUT, 'shots');
  const browser = await ENGINE.launch();
  const jobs = pages.flatMap((p) => WIDTHS.map((w) => ({ p, w })));
  const rows = [];
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const { p, w } = jobs[next++];
      const row = await auditPage(browser, server.base, p, w, w === 375 ? shotDir : null);
      rows.push(row);
      done++;
      if (done % 25 === 0 || done === jobs.length) console.log(`${done} of ${jobs.length}`);
    }
  }));
  const reportRows = rows.filter((r) => r.width === 375);
  let nextReport = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (nextReport < reportRows.length) {
      const r = reportRows[nextReport++];
      r.no_js_height = await noJsHeight(browser, server.base, r.url).catch(() => null);
    }
  }));
  await browser.close();
  server.stop();
  rows.sort((a, b) => a.url.localeCompare(b.url) || a.width - b.width);

  if (FAST) {
    const bad = rows.map((r) => ({ r, found: problems(r).filter((p) => ['a', 'b', 'c', 'h'].includes(p.check) || /did not load/.test(p.text)) })).filter((x) => x.found.length);
    fs.writeFileSync(path.join(OUT, 'fast-results.json'), JSON.stringify(bad.map(({ r, found }) => ({ url: r.url, found })), null, 1));
    console.log(`fast audit: ${rows.length} pages at 375px, ${bad.length} failing checks a, b, c or h`);
    for (const { r, found } of bad) console.log(`  ${r.url}: ${[...new Set(found.map((f) => f.text))].slice(0, 3).join(' / ').slice(0, 220)}`);
    printNear(nearLimit(rows));
    process.exit(bad.length ? 1 : 0);
  }

  writeCsv(rows);
  const summaries = pageSummaries(rows);
  const t = totals(rows, summaries);
  const types = new Set(pages.map((p) => p.route)).size;
  writeHtml(rows, summaries, t, `${types} page types, ${summaries.length} pages, at ${WIDTHS.join(', ')}px wide and ${HEIGHT}px tall, cookie banner showing and dismissed. Worst first. ${nearLimit(rows).length} page(s) over ${WARN_HEIGHT.toLocaleString('en-GB')}px at 375px, the warning line.`);
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ page_types: types, pages: summaries.length, rows: rows.length, totals: t, near_height_limit: nearLimit(rows), worst: summaries.slice(0, 20).map((p) => ({ url: p.url, route: p.route, checks: [...p.checks].sort().join(''), problems: p.count, list: p.found.map((f) => `${f.check} ${f.text}`.slice(0, 200)) })) }, null, 1));
  console.log(JSON.stringify({ page_types: types, pages: summaries.length, totals: t }));
  printNear(nearLimit(rows));
  // Over the limit fails the full audit too. mobile-audit-deep.mjs passes --engine and reads the results itself; to it a non zero exit means the audit crashed.
  if (t.h?.pages && !opt('engine')) process.exitCode = 1;
  console.log(path.resolve(OUT, 'index.html'));
}

main().catch((e) => { console.error(e.message); process.exit(2); });
