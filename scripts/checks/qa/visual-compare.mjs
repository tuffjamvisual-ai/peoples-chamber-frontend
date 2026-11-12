// T1-VR (owner, 12 Nov 2026: 'one step forward and two steps back'; nothing else changes): a before and after picture of
// the sample pages on every push that changes page code. Each sample page is loaded from the live site (before) and from
// the local build of the commit being pushed (after), full page at 375 x 812 and 1280 x 720, and the pixels compared.
// A page that differs is listed in the report with a side by side picture (live | this build | the differences in red).
// The push stops for Cowork if any page differs that the job does not name.
//
// The pages: the push check's sample (scripts/checks/qa/rendered-checks.mjs pages(): one of each page type in
// mobile-audit-fast.txt, 89 pages, plus its 4 extra bill, division and council pages). Protect the live database: one
// page load a second, live and local alike, one page at a time; a sample over 100 pages only runs at night (23:00 to
// 07:00 UK). Each page is loaded once from each site: the 375 shot is taken, then the window is widened to 1280. A shot
// is the whole page as a reader scrolls it, a screen at a time at that window size, joined; live is www.opengovt.uk
// (opengovt.uk redirects there), with the cookie choice made, animations off and every picture loaded, CSS ones too.
//
// The pages a job names: a line 'VR-pages: /mps/[id], /' in a commit message of the push (page types or addresses from
// the sample, comma separated; 'VR-pages: all' for a change meant for every page). Those pages may differ.
//
// Why a page differs, from what the page shows (both sites read the same database, but the live page can be a cached
// copy from earlier, so newer data shows as a difference too):
//   look    the page's styles differ (any element's font, colour, spacing, border, layout or visibility values that
//           appear on one site and not the other); this is what a code change does
//   text    only the words and numbers differ, the styles are the same; usually newer data than the live copy, but a
//           code change to wording shows this way too
//   pixels  neither styles nor text differ (a picture, a chart, a moved element of the same style)
// Every unexpected page stops the push, whatever its kind (the JOBS.md rule); the kind and the changed text lines are
// in the report so Cowork can tell newer data from a real change. After Cowork has seen the report, the same commit
// can be pushed with VR_ACCEPT=<first 8 of its hash> (the check still runs and the report is still written).
//
//   node scripts/checks/qa/visual-compare.mjs --base http://localhost:3198 [--live https://opengovt.uk] [--sha <hash>]
//        [--job-pages '/mps/[id], /'] [--out <dir>] [--only /mps/4858,/] [--accept <hash8>]   (--live defaults to www)
// Exit 0: nothing unexpected changed (or accepted); 1: unexpected pages changed, or the check could not run.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { pages as samplePages } from './rendered-checks.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('--base', 'http://localhost:3198').replace(/\/$/, '');
// www: opengovt.uk answers with a redirect to it, and the cookie choice must be set on the host that serves the page.
const LIVE = arg('--live', 'https://www.opengovt.uk').replace(/\/$/, '');
const SHA = arg('--sha', 'local');
const ACCEPT = arg('--accept', process.env.VR_ACCEPT || '');
const ONLY = arg('--only', '');
const JOB_PAGES = arg('--job-pages', '').split(',').map((s) => s.trim()).filter(Boolean);
const SSD = '/Volumes/GoliathSSD/opengovt-work/Claude outputs/audit/vr';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = arg('--out', path.join(fs.existsSync(path.dirname(SSD)) ? SSD : path.join(os.tmpdir(), 'opengovt-vr'), `${SHA.slice(0, 8)}-${stamp}`));

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

async function main() {
  const t0 = Date.now();
  let list = samplePages().concat([{ route: '/bills/[id]', url: '/bills/3942' }, { route: '/bills/[id]', url: '/bills/4080' }, { route: '/divisions/[slug]', url: '/divisions/pw-2019-01-15-293-commons' }, { route: '/councils/[slug]', url: '/councils/kent' }]);
  if (ONLY) { const want = ONLY.split(',').map((s) => s.trim()); list = list.filter((p) => want.includes(p.url) || want.includes(p.route)); }
  const h = ukHour();
  if (list.length > MAX_DAY_PAGES && h >= 7 && h < 23) {
    console.error(`visual compare: ${list.length} pages is over ${MAX_DAY_PAGES}; that many only run at night (23:00 to 07:00 UK)`);
    return 1;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const open = async (base) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
    await ctx.addCookies([{ name: 'og_cookies_policy', value: encodeURIComponent(JSON.stringify({ analytics: false })), url: base }]);
    await ctx.route('**/*', (r) => (BLOCK.test(r.request().url()) ? r.abort() : r.continue()));
    return ctx.newPage();
  };
  const before = await open(LIVE), after = await open(BASE);
  const rows = [];
  const load = async (page, base, url) => {
    if (page.viewportSize().width !== 375) await page.setViewportSize({ width: 375, height: 812 });
    await pace();
    const res = await page.goto(base + url, { waitUntil: 'load', timeout: 90000 });
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* a page that keeps polling */ }
    return res?.status() ?? 0;
  };
  for (const p of list) {
    const row = { route: p.route, url: p.url, named: jobNames(p), views: [], error: null };
    try {
      const s1 = await load(before, LIVE, p.url);
      const shotsB = [];
      for (const v of VIEWS) shotsB.push(await shoot(before, p.url, v));
      const s2 = await load(after, BASE, p.url);
      const shotsA = [];
      for (const v of VIEWS) shotsA.push(await shoot(after, p.url, v));
      if (s1 !== s2) row.status = `live ${s1}, this build ${s2}`;
      for (let k = 0; k < VIEWS.length; k++) {
        const b = shotsB[k], a = shotsA[k];
        const cmp = await compare(b.png, a.png);
        const v = { view: VIEWS[k].name, changed: cmp.changed || !!row.status, pixels: cmp.pixels, heights: [cmp.beforeH, cmp.afterH] };
        if (v.changed) {
          const sb = new Set(b.styles), sa = new Set(a.styles);
          v.stylesAdded = a.styles.filter((s) => !sb.has(s)).length;
          v.stylesGone = b.styles.filter((s) => !sa.has(s)).length;
          v.styleSample = [...a.styles.filter((s) => !sb.has(s)).slice(0, 3).map((s) => `+ ${s}`), ...b.styles.filter((s) => !sa.has(s)).slice(0, 3).map((s) => `- ${s}`)];
          const tb = new Set(b.text), ta = new Set(a.text);
          v.textAdded = a.text.filter((l) => !tb.has(l)).slice(0, 8);
          v.textGone = b.text.filter((l) => !ta.has(l)).slice(0, 8);
          v.kind = v.stylesAdded || v.stylesGone ? 'look' : v.textAdded.length || v.textGone.length ? 'text' : 'pixels';
          v.box = cmp.box;
          if (cmp.box) {
            v.image = `${p.url.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_') || 'home'}-${VIEWS[k].name}.jpg`;
            await sideBySide(path.join(OUT, v.image), b.png, a.png, cmp, VIEWS[k].width);
          }
        }
        row.views.push(v);
      }
    } catch (e) {
      row.error = e.message.split('\n')[0];
    }
    row.changed = !!row.error || row.views.some((v) => v.changed);
    rows.push(row);
    const mark = row.error ? `could not compare: ${row.error}` : row.changed ? row.views.filter((v) => v.changed).map((v) => `${v.view} ${v.kind} (${v.pixels} px)`).join(', ') : 'same';
    console.log(`  ${row.named ? '(named) ' : ''}${p.url}: ${mark}`);
  }
  await browser.close();

  const unexpected = rows.filter((r) => r.changed && !r.named);
  const secs = Math.round((Date.now() - t0) / 1000);
  const accepted = unexpected.length > 0 && ACCEPT && SHA.startsWith(ACCEPT) && ACCEPT.length >= 8;
  const lines = [`# Visual comparison ${SHA.slice(0, 8)}`, '',
    `${new Date().toISOString()}; ${rows.length} pages at ${VIEWS.map((v) => v.name).join(' and ')}, ${LIVE} (before) against ${BASE} (after), ${Math.floor(secs / 60)} min ${secs % 60} s.`,
    `Pages the job names: ${JOB_PAGES.length ? JOB_PAGES.join(', ') : 'none'}. Changed: ${rows.filter((r) => r.changed).length} (${unexpected.length} not named by the job).`,
    accepted ? `Accepted by VR_ACCEPT=${ACCEPT} after Cowork's review.` : '', ''];
  for (const r of rows.filter((x) => x.changed)) {
    lines.push(`## ${r.url} (${r.route})${r.named ? ', named by the job' : ', NOT named by the job'}`);
    if (r.error) lines.push(`Could not compare: ${r.error}`);
    if (r.status) lines.push(`Status: ${r.status}`);
    for (const v of r.views.filter((x) => x.changed)) {
      lines.push(`- ${v.view}: ${v.kind}; ${v.pixels} pixels differ${v.box ? ` between y ${v.box.y0} and ${v.box.y1}` : ''}; height ${v.heights[0]} -> ${v.heights[1]}px${v.image ? `; picture ${v.image}` : ''}`);
      if (v.stylesAdded || v.stylesGone) lines.push(`  styles: ${v.stylesAdded} new, ${v.stylesGone} gone`, ...v.styleSample.map((s) => `    ${s.slice(0, 300)}`));
      for (const t of v.textGone) lines.push(`  text - ${t.slice(0, 200)}`);
      for (const t of v.textAdded) lines.push(`  text + ${t.slice(0, 200)}`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ sha: SHA, seconds: secs, jobPages: JOB_PAGES, rows }, null, 1));
  console.log(`visual compare: ${rows.length} pages in ${Math.floor(secs / 60)} min ${secs % 60} s; ${rows.filter((r) => r.changed).length} changed, ${unexpected.length} not named by the job. Report: ${path.join(OUT, 'report.md')}`);
  if (!unexpected.length) return 0;
  if (accepted) { console.log(`visual compare: accepted (VR_ACCEPT=${ACCEPT})`); return 0; }
  console.error(`Push stopped for Cowork: ${unexpected.length} page(s) not named by the job look different (${unexpected.map((r) => r.url).join(', ')}). Send Cowork ${path.join(OUT, 'report.md')} and its pictures. If Cowork agrees, push again with VR_ACCEPT=${SHA.slice(0, 8)}; if a page should change, name it with a 'VR-pages:' line in the commit message.`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => { console.error(`visual compare could not run: ${e.message}`); process.exit(1); });
