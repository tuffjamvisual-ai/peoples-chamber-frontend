// Safari engine iPhone checks (owner approved, Cowork ENTRY 524, 23 Nov 2026). Reads only: loads pages in Playwright's
// WebKit (the engine of Safari on iPhone) with Playwright's own iPhone profiles and checks the phone app view on the 10
// key pages (TOP_PAGES, the visual compare's most visited pages):
//   W1 app bar: shown, position fixed, its foot at the foot of the screen, and still there after scrolling 600px.
//   W2 folder top (the header): position fixed at the top, and still at the top after scrolling.
//   W3 menu: the app bar's Menu opens the menu panel with the bar still on top (the bar's middle is the bar), Escape
//      closes it, and focus goes back to the app bar's Menu.
//   W4 cookie banner, first visit: shown, inside the screen, its foot at or above the app bar's top (neither covers the
//      other); after Reject it is gone.
//   W5 no sideways scroll: the page is no wider than the screen.
//   W6 page length (A3, the same rule as rendered-checks.mjs): at 375px wide, as the page opens, at most 2,500px not
//      counting article text and the app bar's room; a page already over it in rendered-baseline.json may not grow by
//      more than 200px. Measured with the 375px profile only, as A3 is defined at 375px.
// Pace: one page load a second at most (the live site reads the production database); 10 pages x 4 profiles.
//   node scripts/checks/qa/webkit-iphone.mjs [--base https://www.opengovt.uk] [--out <folder for pictures>] [--json <file>]
// Exit code 1 when any check fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, devices } from 'playwright';
import { TOP_PAGES } from './vr-pages.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const BASE = opt('--base', 'https://www.opengovt.uk').replace(/\/$/, '');
const OUT = opt('--out', null);
const JSON_OUT = opt('--json', null);
const LIMIT_PX = 2500;
const GROWTH_PX = 200;
// The three named in ENTRY 524, and a 375px phone for the length rule (A3 is measured at 375px).
const PROFILES = [
  { name: 'iPhone 15', length: false },
  { name: 'iPhone 15 Pro Max', length: false },
  { name: 'iPhone SE', length: false },
  { name: 'iPhone SE (3rd gen)', length: true },
];
const baseline = JSON.parse(fs.readFileSync(path.join(HERE, 'rendered-baseline.json'), 'utf8')).pages ?? {};

let last = 0;
const pace = async () => { const wait = last + 1000 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); last = Date.now(); };
const shot = async (page, file) => { if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await page.screenshot({ path: path.join(OUT, file) }); } };

const results = [];
const fails = [];
const browser = await webkit.launch();
for (const prof of PROFILES) {
  const dev = devices[prof.name];
  if (!dev) { fails.push(`${prof.name}: no such Playwright device profile`); continue; }
  for (const url of TOP_PAGES) {
    const where = `${prof.name} ${url}`;
    const ctx = await browser.newContext({ ...dev });
    const page = await ctx.newPage();
    const r = { profile: prof.name, url, fails: [] };
    try {
      await pace();
      const res = await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
      r.status = res?.status();
      await page.waitForTimeout(1500);
      // W4 first visit: the banner is on screen and sits above the app bar.
      const fv = await page.evaluate(() => {
        const bn = [...document.querySelectorAll('.og-cookie-banner')].find((b) => b.getClientRects().length);
        const bar = document.querySelector('.og-appbar');
        if (!bn) return { banner: false };
        const b = bn.getBoundingClientRect(), a = bar?.getBoundingClientRect();
        return { banner: true, top: Math.round(b.top), bottom: Math.round(b.bottom), barTop: a ? Math.round(a.top) : null, h: innerHeight };
      });
      r.banner = fv;
      if (!fv.banner) r.fails.push('W4 no cookie banner on a first visit');
      else {
        if (fv.top < 0 || fv.bottom > fv.h + 1) r.fails.push(`W4 banner outside the screen (${fv.top} to ${fv.bottom}px, screen ${fv.h}px)`);
        if (fv.barTop != null && fv.bottom > fv.barTop + 1) r.fails.push(`W4 banner (foot ${fv.bottom}px) covers the app bar (top ${fv.barTop}px)`);
      }
      if (url === '/' && prof.name === 'iPhone 15') await shot(page, 'webkit-iphone15-home-first-visit.png');
      const reject = page.locator('.og-cookie-banner button', { hasText: /Reject/ }).first();
      if (await reject.count()) {
        await reject.click(); await page.waitForTimeout(400);
        const hide = page.locator('.og-cookie-banner button', { hasText: /Hide/ }).first();
        if (await hide.count()) { await hide.click(); await page.waitForTimeout(300); }
        const still = await page.evaluate(() => [...document.querySelectorAll('.og-cookie-banner')].some((b) => b.getClientRects().length && b.getBoundingClientRect().height > 0));
        if (still) r.fails.push('W4 banner still shown after Reject and Hide');
      }
      const m = async () => page.evaluate(() => {
        const bar = document.querySelector('.og-appbar'), hd = document.querySelector('.og-header');
        const bs = bar && getComputedStyle(bar), hs = hd && getComputedStyle(hd);
        const br = bar?.getBoundingClientRect(), hr = hd?.getBoundingClientRect();
        return { bar: bs && { display: bs.display, position: bs.position, top: Math.round(br.top), bottom: Math.round(br.bottom) },
          header: hs && { position: hs.position, top: Math.round(hr.top), bottom: Math.round(hr.bottom) },
          h: innerHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
      });
      const a = await m();
      r.before = a;
      // W1, W2, W5 as the page opens.
      if (!a.bar || a.bar.display === 'none') r.fails.push('W1 app bar not shown');
      else {
        if (a.bar.position !== 'fixed') r.fails.push(`W1 app bar position ${a.bar.position}, not fixed`);
        if (Math.abs(a.bar.bottom - a.h) > 1) r.fails.push(`W1 app bar foot at ${a.bar.bottom}px, screen ${a.h}px`);
      }
      if (!a.header || a.header.position !== 'fixed' || a.header.top !== 0) r.fails.push(`W2 folder top not fixed at the top (${JSON.stringify(a.header)})`);
      if (a.sw > a.cw + 1) r.fails.push(`W5 sideways scroll: page ${a.sw}px wide, screen ${a.cw}px`);
      // After scrolling: the bar and the folder top stay put.
      await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(400);
      const s = await m();
      r.scrolled = s;
      if (a.bar && s.bar && (s.bar.top !== a.bar.top)) r.fails.push(`W1 app bar moved on scroll (${a.bar.top} -> ${s.bar.top}px)`);
      if (s.header && s.header.top !== 0) r.fails.push(`W2 folder top moved on scroll (top ${s.header.top}px)`);
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
      // W3 the menu.
      const menuBtn = page.locator('.og-appbar-menu');
      if (await menuBtn.count()) {
        await menuBtn.click(); await page.waitForTimeout(500);
        const open = await page.evaluate(() => {
          const panel = document.getElementById('og-menu-panel') ?? document.querySelector('.og-menu-panel');
          const bar = document.querySelector('.og-appbar').getBoundingClientRect();
          const hit = document.elementFromPoint(bar.left + bar.width / 2, bar.top + bar.height / 2);
          return { open: !!panel && !panel.hidden && panel.getClientRects().length > 0, barOnTop: !!hit?.closest('.og-appbar') };
        });
        if (!open.open) r.fails.push('W3 Menu did not open the menu panel');
        if (!open.barOnTop) r.fails.push('W3 app bar not on top with the menu open');
        if (url === '/' && prof.name === 'iPhone 15 Pro Max') await shot(page, 'webkit-iphone15promax-menu-open.png');
        await page.keyboard.press('Escape'); await page.waitForTimeout(400);
        const closed = await page.evaluate(() => {
          const panel = document.getElementById('og-menu-panel') ?? document.querySelector('.og-menu-panel');
          return { closed: !panel || panel.hidden || !panel.getClientRects().length, focus: document.activeElement?.classList.contains('og-appbar-menu') };
        });
        if (!closed.closed) r.fails.push('W3 Escape did not close the menu');
        if (!closed.focus) r.fails.push('W3 focus did not return to the app bar Menu');
      } else r.fails.push('W3 no app bar Menu button');
      // W6 length at 375px.
      if (prof.length) {
        const h = await page.evaluate(() => {
          const room = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--og-appbar-room')) || 0;
          const article = [...document.querySelectorAll('[data-article-body]')].reduce((n, el) => n + el.getBoundingClientRect().height, 0);
          return Math.round(document.documentElement.scrollHeight - room - article);
        });
        r.height = h;
        const b = baseline[url];
        if (h > LIMIT_PX) {
          const known = b?.height != null && b.height > LIMIT_PX;
          if (!known) r.fails.push(`W6 ${h}px at 375px, over ${LIMIT_PX}px`);
          else if (h > b.height + GROWTH_PX) r.fails.push(`W6 ${h}px, longer than its baseline ${b.height}px`);
        }
      }
      if (url === '/mps' && prof.name === 'iPhone SE') await shot(page, 'webkit-iphonese-mps.png');
    } catch (e) {
      r.fails.push(`error: ${String(e.message ?? e).slice(0, 160)}`);
    }
    for (const f of r.fails) fails.push(`${where}: ${f}`);
    results.push(r);
    await ctx.close();
  }
}
await browser.close();

const summary = { engine: 'webkit', base: BASE, profiles: PROFILES.map((p) => p.name), pages: TOP_PAGES.length, runs: results.length, failing: fails.length };
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary, results, fails }, null, 1));
console.log(`webkit iPhone checks: ${JSON.stringify(summary)}`);
for (const f of fails) console.log(`FAIL ${f}`);
process.exit(fails.length ? 1 : 0);
