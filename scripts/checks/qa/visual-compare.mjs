// T1-VR (owner, 12 Nov 2026: 'one step forward and two steps back'; nothing else changes): before and after pictures of
// pages, so a change never alters a page the job did not mean to change. Two runs (Cowork, 12 Nov 2026):
//
// At push (default), from the push check (mobile-audit-prepush.mjs), after its other checks, on its local build: the ten
// most visited pages and one example of each page type whose code the push changes (scripts/checks/qa/vr-pages.mjs; at
// most 12 such types, the most visited first, so the run stays under about 5 minutes; the rest are left to the nightly
// run). Each page is loaded from the live site (before) and the build being pushed (after) and compared at 375 x 812 and
// 1280 x 720. Any page that differs and that the job does not name stops the push for Cowork.
//
// Nightly (--nightly), after the 05:17 checks (rendered-checks-daily.mjs): the full sample (rendered-checks.mjs pages():
// one page of each type in mobile-audit-fast.txt, plus its 4 extra pages, 93), live only, against the pictures of the
// previous night. A page that changed is unexpected unless a commit pushed since the last run names it; the result is
// one line in Claude outputs/STATUS.md for Cowork, the pictures and report in ~/opengovt-backup/vr-nightly (macOS does not
// let launchd jobs write to the external drive). The last two nights' pictures are kept.
//
// Protect the live database: one page load a second, live and local alike, one page at a time; more than 100 pages only
// at night (23:00 to 07:00 UK, or as part of the nightly run). Each page is loaded once per site: the 375 picture is taken,
// then the window is widened to 1280. A picture is the whole page as a reader scrolls it, a screen at a time at that
// window size, joined; live is www.opengovt.uk (opengovt.uk redirects there), with the cookie choice made, animations off
// and every picture on the page loaded, CSS ones too, and every web font the page declares.
//
// The pages a job names: a line 'VR-pages: /mps/[id], /' in a commit message of the push (page types or addresses,
// comma separated; 'VR-pages: all' for a change meant for every page). Those pages may differ.
//
// Why a page differs, from what the page shows (the live page can be a cached copy from earlier, so newer data shows as a
// difference too):
//   look    the page's styles differ (any element's font, colour, spacing, border, layout or visibility values that
//           appear on one side and not the other); this is what a code change does
//   text    only the words and numbers differ, the styles are the same; usually newer data, but a code change to wording
//           shows this way too
//   pixels  neither styles nor text differ (a picture, a chart, a moved element of the same style)
// At push, every unexpected page stops the push, whatever its kind (the JOBS.md rule); the kind and the changed text lines
// are in the report so Cowork can tell newer data from a real change. After Cowork has seen the report, the same commit
// can be pushed with VR_ACCEPT=<first 8 of its hash> (the check still runs and the report is still written).
//
//   at push:  node scripts/checks/qa/visual-compare.mjs --base http://localhost:3198 --sha <hash> --from <hash>
//             [--job-pages '/mps/[id], /'] [--out <dir>] [--only /mps/4858,/] [--accept <hash8>] [--live <url>]
//   nightly:  node scripts/checks/qa/visual-compare.mjs --nightly
// Exit 0: nothing unexpected changed (or accepted); 1: unexpected pages changed (at push), or the check could not run.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { execFileSync } from 'child_process';
import { pages as samplePages, parseCsv } from './rendered-checks.mjs';
import { pushPages } from './vr-pages.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:3198').replace(/\/$/, '');
// www: opengovt.uk answers with a redirect to it, and the cookie choice must be set on the host that serves the page.
const LIVE = arg('--live', 'https://www.opengovt.uk').replace(/\/$/, '');
const SHA = arg('--sha', 'local');
const ACCEPT = arg('--accept', process.env.VR_ACCEPT || '');
const ONLY = arg('--only', '');
let JOB_PAGES = arg('--job-pages', '').split(',').map((s) => s.trim()).filter(Boolean);
const FROM = arg('--from', null);
const NIGHTLY = argv.includes('--nightly');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NIGHT_DIR = path.join(os.homedir(), 'opengovt-backup/vr-nightly');
const STATUS = '/Volumes/EDGE_SSD/opengovt-work/Claude outputs/STATUS.md';
const SSD = '/Volumes/EDGE_SSD/opengovt-work/Claude outputs/audit/vr';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
const OUT = arg('--out', NIGHTLY ? path.join(NIGHT_DIR, DAY, 'report') : path.join(fs.existsSync(path.dirname(SSD)) ? SSD : path.join(os.tmpdir(), 'opengovt-vr'), `${SHA.slice(0, 8)}-${stamp}`));

const VIEWS = [{ name: '375x812', width: 375, height: 812 }, { name: '1280x720', width: 1280, height: 720 }];
const MAX_DAY_PAGES = 100;
// A pixel counts as different when a colour channel moves by more than this; a page as changed with more than
// MIN_PIXELS such pixels, or a different height.
const CHANNEL = 32;
const MIN_PIXELS = 20;
const BLOCK = /posthog|vercel-insights|_vercel\/(insights|speed)/;
// Styles compared (per element, without its class names, which a build can rename). Widths and heights are left out:
// they follow the data (a longer name, more rows).
const STYLE_KEYS = ['display', 'position', 'float', 'visibility', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style',
  'color', 'background-color', 'background-image', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
  'padding', 'margin', 'text-transform', 'letter-spacing', 'line-height', 'text-align', 'text-decoration-line', 'box-shadow',
  'transform', 'gap', 'flex-direction', 'justify-content', 'align-items', 'list-style-type', 'white-space', 'z-index', 'top', 'left'];

const ukHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(new Date()));
let lastHit = 0;
async function pace() {
  const wait = lastHit + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit = Date.now();
}

// The same page state on both sites: cookie choice made (no banner), no animations or transitions, every image loaded.
const STILL = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; } .og-cookie-banner { display: none !important; }';
async function settle(page) {
  await page.evaluate(async (css) => {
    if (!document.getElementById('vr-still')) { const s = document.createElement('style'); s.id = 'vr-still'; s.textContent = css; document.head.appendChild(s); }
    for (const img of document.images) { img.loading = 'eager'; img.decoding = 'sync'; }
    // CSS background pictures too (the folder, the desk): a picture still loading on one site shows as a difference.
    const bg = new Set();
    for (const el of document.querySelectorAll('*')) for (const ps of [null, '::before', '::after']) for (const m of getComputedStyle(el, ps).backgroundImage.matchAll(/url\("?([^")]+)"?\)/g)) bg.add(m[1]);
    const loaded = (src) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = () => (i.decode ? i.decode().catch(() => {}).then(r) : r()); i.src = src; });
    await Promise.race([
      Promise.all([...[...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))), ...[...bg].map(loaded)]),
      new Promise((r) => setTimeout(r, 15000)),
    ]);
    // Every web font the page declares, loaded before the picture (Cowork, 12 Nov 2026: a live picture of an editorial
    // was taken before Special Elite had loaded, so its heading showed in the browser's fallback font). A face the page
    // has not used yet is loaded too; at most 15 s.
    await document.fonts.ready;
    const faces = [...document.fonts].filter((f) => f.status !== 'loaded');
    await Promise.race([
      Promise.all(faces.map((f) => f.load().catch(() => null))),
      new Promise((r) => setTimeout(r, 15000)),
    ]);
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, STILL);
  await page.waitForTimeout(300);
}

// What the page shows apart from pixels: the set of style combinations in use, and its text lines.
async function describe(page) {
  return page.evaluate((keys) => {
    const strip = (v) => v.replace(/url\("?https?:\/\/[^/"]+/g, 'url("');
    const styles = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('.og-cookie-banner, script, style, noscript')) continue;
      if (!el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      styles.add(el.tagName + ' ' + keys.map((k) => strip(cs.getPropertyValue(k))).join('|'));
    }
    const text = document.body.innerText.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { styles: [...styles], text };
  }, STYLE_KEYS);
}

async function shoot(page, url, view) {
  if (view.width !== page.viewportSize().width) { await page.setViewportSize({ width: view.width, height: view.height }); await page.waitForTimeout(500); }
  await settle(page);
  const described = await describe(page);
  // The page as a reader sees it: one screen at a time at the real window size, scrolled down and joined (a full page
  // picture stretches the window to the page's height, and the live site and a local build then placed the desk and
  // the header folder differently on short pages at 1280, which no reader sees).
  const full = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  const tiles = [];
  for (let y = 0; y < full; y += view.height) {
    const top = Math.min(y, Math.max(0, full - view.height));
    await page.evaluate((t) => window.scrollTo(0, t), top);
    await page.waitForTimeout(150);
    await settle(page);
    const at = await page.evaluate(() => Math.round(window.scrollY));
    tiles.push({ input: await page.screenshot({ animations: 'disabled' }), top: at, left: 0 });
    if (top + view.height >= full) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const png = await sharp({ create: { width: view.width, height: Math.max(full, view.height), channels: 4, background: '#ffffff' }, limitInputPixels: false })
    .composite(tiles).png().toBuffer();
  return { png, ...described };
}

async function raw(png) {
  const { data, info } = await sharp(png, { limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// Differing pixels in the area both pictures cover, their bounding box, and a mask (red on a faded copy of this build).
async function compare(beforePng, afterPng) {
  const a = await raw(beforePng), b = await raw(afterPng);
  const w = Math.min(a.w, b.w), h = Math.min(a.h, b.h);
  const mask = Buffer.alloc(b.w * b.h * 4);
  let n = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const j = (y * b.w + x) * 4;
    let diff = y >= h || x >= w;
    if (!diff) {
      const i = (y * a.w + x) * 4;
      diff = Math.abs(a.data[i] - b.data[j]) > CHANNEL || Math.abs(a.data[i + 1] - b.data[j + 1]) > CHANNEL || Math.abs(a.data[i + 2] - b.data[j + 2]) > CHANNEL;
    }
    if (diff) {
      n++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      mask[j] = 220; mask[j + 1] = 0; mask[j + 2] = 0; mask[j + 3] = 255;
    } else {
      const g = Math.round((b.data[j] + b.data[j + 1] + b.data[j + 2]) / 3);
      mask[j] = mask[j + 1] = mask[j + 2] = Math.round(255 - (255 - g) * 0.25); mask[j + 3] = 255;
    }
  }
  if (a.h > b.h) { y1 = Math.max(y1, b.h - 1); y0 = Math.min(y0, h - 1); x0 = 0; x1 = Math.max(x1, w - 1); n += (a.h - b.h) * w; }
  const changed = n > MIN_PIXELS || a.h !== b.h;
  return { changed, pixels: n, beforeH: a.h, afterH: b.h, box: changed ? { x0, y0, x1, y1 } : null, mask: { data: mask, w: b.w, h: b.h } };
}

// Live | this build | differences, cropped to the changed area (with 300px around it, at most 2,400px tall), the
// 1280 pictures at half size.
async function sideBySide(file, beforePng, afterPng, cmp, width) {
  const scale = width > 800 ? 0.5 : 1;
  const top = Math.max(0, cmp.box.y0 - 300);
  const crop = async (input, isRaw) => {
    const img = isRaw ? sharp(input.data, { raw: { width: input.w, height: input.h, channels: 4 }, limitInputPixels: false }) : sharp(input, { limitInputPixels: false });
    const m = isRaw ? { width: input.w, height: input.h } : await sharp(input, { limitInputPixels: false }).metadata();
    const t = Math.min(top, m.height - 1);
    const hh = Math.max(1, Math.min(2400, m.height - t, cmp.box.y1 + 300 - t));
    return sharp(await img.extract({ left: 0, top: t, width: m.width, height: hh }).png().toBuffer()).resize({ width: Math.round(m.width * scale) }).png().toBuffer();
  };
  const parts = [await crop(beforePng), await crop(afterPng), await crop(cmp.mask, true)];
  const metas = await Promise.all(parts.map((p) => sharp(p).metadata()));
  const gap = 12, label = 28;
  const W = metas.reduce((s, m) => s + m.width, 0) + gap * 2, H = Math.max(...metas.map((m) => m.height)) + label;
  let x = 0; const comp = [];
  const names = ['live (before)', 'this build (after)', 'differences'];
  for (let k = 0; k < 3; k++) {
    comp.push({ input: parts[k], left: x, top: label });
    comp.push({ input: Buffer.from(`<svg width="${metas[k].width}" height="${label}"><text x="4" y="19" font-family="Helvetica" font-size="15">${names[k]}${k === 0 ? ` (from y ${top})` : ''}</text></svg>`), left: x, top: 0 });
    x += metas[k].width + gap;
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(comp).jpeg({ quality: 78 }).toFile(file);
}

const jobNames = (p) => JOB_PAGES.some((j) => j === 'all' || j === p.route || j === p.url);
const EXTRA = [{ route: '/bills/[id]', url: '/bills/3942' }, { route: '/bills/[id]', url: '/bills/4080' }, { route: '/divisions/[slug]', url: '/divisions/pw-2019-01-15-293-commons' }, { route: '/councils/[slug]', url: '/councils/kent' }];
const fileName = (url, view, ext) => `${url.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_') || 'home'}-${view}.${ext}`;
const ukClock = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).formatToParts(new Date()).map((x) => [x.type, x.value])); return `${p.hour}:${p.minute} ${p.timeZoneName === 'BST' || p.timeZoneName === 'GMT+1' ? 'BST' : 'GMT'}`; };
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

async function openPage(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: 'og_cookies_policy', value: encodeURIComponent(JSON.stringify({ analytics: false })), url: base }]);
  await ctx.route('**/*', (r) => (BLOCK.test(r.request().url()) ? r.abort() : r.continue()));
  return ctx.newPage();
}
async function load(page, base, url) {
  if (page.viewportSize().width !== 375) await page.setViewportSize({ width: 375, height: 812 });
  await pace();
  const res = await page.goto(base + url, { waitUntil: 'load', timeout: 90000 });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* a page that keeps polling */ }
  await freezeMoving(page);
  return res?.status() ?? 0;
}

// Moving text (Cowork, 12 Nov 2026): a line that only says when our data was last fetched moves on its own, so the live page
// and a build made earlier differ without any change (the 22:25 stop on 4ceec8ac: 'Checked GOV.UK at 22:17' live, '21:16' in
// the build). Before any picture, both sides get the same fixed time and date in these lines: the press releases'
// 'Checked GOV.UK at 09:17, 12 November' (lib/press-checked-line.ts) and the sync freshness lines '<data> last updated
// 12 November 2026' (app/components/LastUpdated.tsx, the MP page's Early Day Motions line). A date stored with a record
// (a donor's 'Last checked', 'Facts last checked', a page's fixed 'Last updated: 3 November 2026') is real data and is not
// touched.
const MOVING = [
  [/Checked GOV\.UK at \d{1,2}:\d{2}, \d{1,2} [A-Z][a-z]+/g, 'Checked GOV.UK at 00:00, 1 January'],
  [/( last updated )\d{1,2} [A-Z][a-z]+ \d{4}/g, '$11 January 2000'],
];
async function freezeMoving(page) {
  await page.evaluate((pairs) => {
    const res = pairs.map(([s, f, r]) => [new RegExp(s, f), r]);
    // React writes 'last updated {when}' as separate text nodes, so an element whose children are all text is read whole.
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.firstChild || [...el.childNodes].some((c) => c.nodeType !== 3)) continue;
      let t = el.textContent;
      for (const [re, r] of res) t = t.replace(re, r);
      if (t !== el.textContent) el.textContent = t;
    }
  }, MOVING.map(([re, r]) => [re.source, re.flags, r])).catch(() => {});
}

// One page at one size, before against after: the comparison, its kind and its side by side picture.
async function judge(p, k, b, a) {
  const cmp = await compare(b.png, a.png);
  const v = { view: VIEWS[k].name, changed: cmp.changed, pixels: cmp.pixels, heights: [cmp.beforeH, cmp.afterH] };
  if (!v.changed) return v;
  const sb = new Set(b.styles), sa = new Set(a.styles);
  v.stylesAdded = a.styles.filter((s) => !sb.has(s)).length;
  v.stylesGone = b.styles.filter((s) => !sa.has(s)).length;
  v.styleSample = [...a.styles.filter((s) => !sb.has(s)).slice(0, 3).map((s) => `+ ${s}`), ...b.styles.filter((s) => !sa.has(s)).slice(0, 3).map((s) => `- ${s}`)];
  const tb = new Set(b.text), ta = new Set(a.text);
  v.textAdded = a.text.filter((l) => !tb.has(l)).slice(0, 8);
  v.textGone = b.text.filter((l) => !ta.has(l)).slice(0, 8);
  v.kind = v.stylesAdded || v.stylesGone ? 'look' : v.textAdded.length || v.textGone.length ? 'text' : 'pixels';
  v.box = cmp.box;
  if (cmp.box) { v.image = fileName(p.url, VIEWS[k].name, 'jpg'); await sideBySide(path.join(OUT, v.image), b.png, a.png, cmp, VIEWS[k].width); }
  return v;
}

function writeReport(rows, secs, title, before, after, extraLines) {
  const unexpected = rows.filter((r) => r.changed && !r.named);
  const lines = [`# ${title}`, '',
    `${new Date().toISOString()}; ${rows.length} pages at ${VIEWS.map((v) => v.name).join(' and ')}, ${before} (before) against ${after} (after), ${Math.floor(secs / 60)} min ${secs % 60} s.`,
    `Pages the job names: ${JOB_PAGES.length ? JOB_PAGES.join(', ') : 'none'}. Changed: ${rows.filter((r) => r.changed).length} (${unexpected.length} not named).`,
    ...extraLines, ''];
  for (const r of rows.filter((x) => x.changed)) {
    lines.push(`## ${r.url} (${r.route})${r.named ? ', named by the job' : ', NOT named by the job'}`);
    if (r.error) lines.push(`Could not compare: ${r.error}`);
    if (r.status) lines.push(`Status: ${r.status}`);
    for (const v of r.views.filter((x) => x.changed)) {
      lines.push(`- ${v.view}: ${v.kind ?? 'status'}; ${v.pixels} pixels differ${v.box ? ` between y ${v.box.y0} and ${v.box.y1}` : ''}; height ${v.heights[0]} -> ${v.heights[1]}px${v.image ? `; picture ${v.image}` : ''}`);
      if (v.stylesAdded || v.stylesGone) lines.push(`  styles: ${v.stylesAdded} new, ${v.stylesGone} gone`, ...v.styleSample.map((s) => `    ${s.slice(0, 300)}`));
      for (const t of v.textGone ?? []) lines.push(`  text - ${t.slice(0, 200)}`);
      for (const t of v.textAdded ?? []) lines.push(`  text + ${t.slice(0, 200)}`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ sha: SHA, seconds: secs, jobPages: JOB_PAGES, rows }, null, 1));
  return unexpected;
}

async function pushRun() {
  const t0 = Date.now();
  // The pages: the ten most visited and the page types the push's changed files reach.
  const changedFiles = FROM ? execFileSync('git', ['diff', '--name-only', `${FROM}..${SHA}`, '--', 'app', 'lib', 'public', ':(exclude)app/api'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean) : [];
  const chosen = pushPages(process.cwd(), changedFiles, parseCsv);
  let list = chosen.list;
  if (ONLY) { const want = ONLY.split(',').map((s) => s.trim()); list = [...samplePages(), ...EXTRA, ...list].filter((p, i, all) => (want.includes(p.url) || want.includes(p.route)) && all.findIndex((q) => q.url === p.url) === i); }
  const h = ukHour();
  if (list.length > MAX_DAY_PAGES && h >= 7 && h < 23) { console.error(`visual compare: ${list.length} pages is over ${MAX_DAY_PAGES}; that many only run at night (23:00 to 07:00 UK)`); return 1; }
  fs.mkdirSync(OUT, { recursive: true });
  console.log(`visual compare: ${list.length} pages (${ONLY ? 'chosen with --only' : `the 10 most visited${list.length > 10 ? ` and ${list.length - 10} page type(s) this push changes` : ''}`})${chosen.left.length ? `; ${chosen.left.length} more changed page types left to the nightly run` : ''}`);
  const browser = await chromium.launch();
  const before = await openPage(browser, LIVE), after = await openPage(browser, BASE);
  const rows = [];
  for (const p of list) {
    const row = { route: p.route, url: p.url, named: jobNames(p), views: [], error: null };
    try {
      const s1 = await load(before, LIVE, p.url);
      const shotsB = []; for (const v of VIEWS) shotsB.push(await shoot(before, p.url, v));
      const s2 = await load(after, BASE, p.url);
      const shotsA = []; for (const v of VIEWS) shotsA.push(await shoot(after, p.url, v));
      if (s1 !== s2) row.status = `live ${s1}, this build ${s2}`;
      for (let k = 0; k < VIEWS.length; k++) { const v = await judge(p, k, shotsB[k], shotsA[k]); if (row.status) v.changed = true; row.views.push(v); }
    } catch (e) { row.error = e.message.split('\n')[0]; }
    row.changed = !!row.error || row.views.some((v) => v.changed);
    rows.push(row);
    console.log(`  ${row.named ? '(named) ' : ''}${p.url}: ${row.error ? `could not compare: ${row.error}` : row.changed ? row.views.filter((v) => v.changed).map((v) => `${v.view} ${v.kind ?? 'status'} (${v.pixels} px)`).join(', ') : 'same'}`);
  }
  await browser.close();
  const secs = Math.round((Date.now() - t0) / 1000);
  const accepted = !!(ACCEPT && ACCEPT.length >= 8 && SHA.startsWith(ACCEPT));
  const unexpected = writeReport(rows, secs, `Visual comparison at push ${SHA.slice(0, 8)}`, LIVE, BASE, [
    `Files changed: ${changedFiles.length}; page types they reach: ${chosen.reached.length}${chosen.left.length ? `; left to the nightly run: ${chosen.left.join(', ')}` : ''}${chosen.noExample.length ? `; no example page to load: ${chosen.noExample.join(', ')}` : ''}.`,
    accepted ? `VR_ACCEPT=${ACCEPT} given (after Cowork's review).` : '']);
  console.log(`visual compare: ${rows.length} pages in ${Math.floor(secs / 60)} min ${secs % 60} s; ${rows.filter((r) => r.changed).length} changed, ${unexpected.length} not named by the job. Report: ${path.join(OUT, 'report.md')}`);
  if (!unexpected.length) return 0;
  if (accepted) { console.log(`visual compare: accepted (VR_ACCEPT=${ACCEPT})`); return 0; }
  console.error(`Push stopped for Cowork: ${unexpected.length} page(s) not named by the job look different (${unexpected.map((r) => r.url).join(', ')}). Send Cowork ${path.join(OUT, 'report.md')} and its pictures. If Cowork agrees, push again with VR_ACCEPT=${SHA.slice(0, 8)}; if a page should change, name it with a 'VR-pages:' line in the commit message.`);
  return 1;
}

// Nightly: the full sample on the live site against the previous night's pictures.
async function nightlyRun() {
  const t0 = Date.now();
  const status = (line) => { const text = `${ukClock()} ${line}\n`; console.log(line); try { fs.appendFileSync(STATUS, text); } catch { fs.appendFileSync(path.join(NIGHT_DIR, 'STATUS-pending.md'), text); } };
  fs.mkdirSync(NIGHT_DIR, { recursive: true });
  const tonight = path.join(NIGHT_DIR, DAY);
  const earlier = fs.readdirSync(NIGHT_DIR).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d < DAY).sort();
  const last = earlier.length ? path.join(NIGHT_DIR, earlier[earlier.length - 1]) : null;
  fs.mkdirSync(OUT, { recursive: true });
  // What was pushed since the last run, and the pages those commits name.
  let head = null, named = [];
  try { try { git('fetch', '-q', 'origin', 'main'); } catch { /* the last fetched main */ } head = git('rev-parse', 'origin/main'); } catch { /* no git */ }
  const lastMeta = last && fs.existsSync(path.join(last, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(last, 'meta.json'), 'utf8')) : null;
  if (head && lastMeta?.head) {
    try { named = [...git('log', '--format=%B', `${lastMeta.head}..${head}`).matchAll(/^VR-pages:\s*(.+)$/gim)].flatMap((m) => m[1].split(',').map((x) => x.trim())).filter(Boolean); } catch { /* history moved */ }
  }
  JOB_PAGES = named;
  const list = [...samplePages(), ...EXTRA];
  const browser = await chromium.launch();
  const page = await openPage(browser, LIVE);
  const rows = [];
  for (const p of list) {
    const row = { route: p.route, url: p.url, named: jobNames(p), views: [], error: null };
    try {
      row.statusCode = await load(page, LIVE, p.url);
      for (let k = 0; k < VIEWS.length; k++) {
        const a = await shoot(page, p.url, VIEWS[k]);
        fs.writeFileSync(path.join(tonight, fileName(p.url, VIEWS[k].name, 'png')), a.png);
        fs.writeFileSync(path.join(tonight, fileName(p.url, VIEWS[k].name, 'json')), JSON.stringify({ styles: a.styles, text: a.text }));
        const prevPng = last && path.join(last, fileName(p.url, VIEWS[k].name, 'png'));
        if (!prevPng || !fs.existsSync(prevPng)) { row.views.push({ view: VIEWS[k].name, changed: false, first: true }); continue; }
        const prev = { png: fs.readFileSync(prevPng), ...JSON.parse(fs.readFileSync(prevPng.replace(/\.png$/, '.json'), 'utf8')) };
        row.views.push(await judge(p, k, prev, a));
      }
    } catch (e) { row.error = e.message.split('\n')[0]; }
    row.changed = !!row.error || row.views.some((v) => v.changed);
    rows.push(row);
    console.log(`  ${p.url}: ${row.error ? `could not load: ${row.error}` : row.changed ? row.views.filter((v) => v.changed).map((v) => `${v.view} ${v.kind} (${v.pixels} px)`).join(', ') : row.views.some((v) => v.first) ? 'first picture' : 'same'}`);
  }
  await browser.close();
  fs.writeFileSync(path.join(tonight, 'meta.json'), JSON.stringify({ head, at: new Date().toISOString(), pages: list.length }));
  // The last two nights only.
  for (const d of earlier.slice(0, -1)) fs.rmSync(path.join(NIGHT_DIR, d), { recursive: true, force: true });
  const secs = Math.round((Date.now() - t0) / 1000);
  const unexpected = writeReport(rows, secs, `Visual comparison, night of ${DAY}`, `live, ${last ? path.basename(last) : 'no earlier night'}`, `live, ${DAY}`, [`Pushed since the last run: ${lastMeta?.head ? `${lastMeta.head.slice(0, 8)}..${head?.slice(0, 8)}` : 'unknown (first run)'}.`]);
  const mins = Math.round(secs / 60);
  const errors = rows.filter((r) => r.error).length;
  if (!last) return status(`VISUAL-NIGHTLY FIRST RUN: ${rows.length} live pages pictured at 375 x 812 and 1280 x 720 in ${mins} min (${errors} could not load); tomorrow's run compares against these. Folder: ~/opengovt-backup/vr-nightly/${DAY}`), 0;
  const look = unexpected.filter((r) => r.error || r.views.some((v) => v.changed && v.kind !== 'text'));
  const textOnly = unexpected.filter((r) => !look.includes(r));
  status(unexpected.length
    ? `VISUAL-NIGHTLY CHANGES NOT NAMED BY A PUSH (for Cowork): ${rows.length} pages, ${mins} min; look or pixels: ${look.length}${look.length ? ` (${look.slice(0, 8).map((r) => r.url).join(', ')}${look.length > 8 ? ', …' : ''})` : ''}; text only (usually newer data): ${textOnly.length}${textOnly.length ? ` (${textOnly.slice(0, 5).map((r) => r.url).join(', ')}${textOnly.length > 5 ? ', …' : ''})` : ''}. Report and pictures: ~/opengovt-backup/vr-nightly/${DAY}/report/report.md`
    : `VISUAL-NIGHTLY PASS: ${rows.length} live pages at 375 x 812 and 1280 x 720 against ${path.basename(last)}, ${mins} min; ${rows.filter((r) => r.changed).length} changed, all named by pushes since then`);
  return 0;
}

const main = () => (NIGHTLY ? nightlyRun() : pushRun());

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => { console.error(`visual compare could not run: ${e.message}`); process.exit(1); });
