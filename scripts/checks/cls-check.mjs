// Layout shift (CLS) at phone size (owner, 4 Nov 2026): loads each page at 375x812 with no cookie choice made, records
// every layout-shift entry (buffered, so shifts during hydration count) for 5 s after load, and prints the session CLS.
// Two cases per page, three runs each: "load" (the first screen as it opens) and "sections" (the CPU slowed 4 times and
// the page scrolled to the MP sections as soon as the HTML is parsed, before the page script runs, so any change the
// script makes to that part of the page counts). The browser's CLS counts only elements that move, not content that is
// replaced, so the "sections" case also records the MP section layout when the HTML is parsed and 5 s later: how many
// tab buttons are visible, whether "On this page" is visible, and where the first section heading sits. A swap between
// the two layouts shows as a difference.
//   node scripts/checks/cls-check.mjs <base url> <out.json> [path ...]
import fs from 'fs';
import { chromium } from 'playwright';

const [base, out, ...paths] = process.argv.slice(2);
const PAGES = paths.length ? paths : ['/mps/4874', '/mps/4514', '/mps/172'];
const browser = await chromium.launch();
const results = {};
for (const p of PAGES) {
  for (const mode of ['load', 'sections']) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => {
      window.__layout = () => {
        const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const h2 = [...document.querySelectorAll('.mp-sections-content h2')].find(vis);
        return { tabButtons: [...document.querySelectorAll('.mp-sections-nav button')].filter(vis).length, onThisPage: vis(document.querySelector('.mp-on-this-page')), firstHeading: h2 ? `${h2.textContent.trim().slice(0, 30)} @ ${Math.round(h2.getBoundingClientRect().top + window.scrollY)}` : null };
      };
      window.__shifts = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shifts.push({ value: e.value, t: Math.round(e.startTime), sources: (e.sources || []).map((s) => (s.node && s.node.nodeName ? `${s.node.nodeName.toLowerCase()}${s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : ''}` : '?')) }); }).observe({ type: 'layout-shift', buffered: true });
    });
    if (mode === 'sections') await ctx.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => { const g = document.querySelector('.mp-sections-grid'); if (g) window.scrollTo(0, g.getBoundingClientRect().top + window.scrollY - 60); window.__parsed = window.__layout(); });
    });
    const page = await ctx.newPage();
    if (mode === 'sections') { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
    const res = await page.goto(base + p, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(5000);
    const [shifts, parsed, after] = await page.evaluate(() => [window.__shifts, window.__parsed || null, window.__layout()]);
    const swap = parsed ? JSON.stringify(parsed) !== JSON.stringify(after) : null;
    runs.push({ status: res.status(), cls: Math.round(shifts.reduce((a, s) => a + s.value, 0) * 10000) / 10000, shifts, ...(mode === 'sections' ? { parsed, after, swap } : {}) });
    await ctx.close();
  }
  (results[p] ||= {})[mode] = { cls: runs.map((r) => r.cls), runs };
  console.log(p, mode, 'CLS', runs.map((r) => r.cls).join(' / '), mode === 'sections' ? `swap ${runs.map((r) => r.swap).join(' / ')} ${JSON.stringify(runs[0].parsed)} -> ${JSON.stringify(runs[0].after)}` : '', JSON.stringify(runs[0].shifts.slice(0, 3)));
  }
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(results, null, 1));
