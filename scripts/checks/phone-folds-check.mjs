// Phone folds check (owner, 4 Nov 2026): at 375px on a running site: every section starts closed, page height and layout
// shift with the page as loaded, a tap opens one section, "Show all sections" opens every one, an "On this page" link
// opens and scrolls to its section, ?section= opens its section, and nothing is wider than the screen with all open.
//   node scripts/checks/phone-folds-check.mjs <base url> <out dir> [path ...]
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const [base, outDir, ...paths] = process.argv.slice(2);
const PAGES = paths.length ? paths : ['/mps/4874', '/lords/100'];
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const state = (page) => page.evaluate(() => ({
  sections: document.querySelectorAll('.pf-sec').length,
  open: document.querySelectorAll('.pf-sec.pf-open').length,
  height: document.documentElement.scrollHeight,
  sideways: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
}));
for (const p of PAGES) {
  const slug = p.slice(1).replace(/\//g, '_');
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(base + p, { waitUntil: 'networkidle', timeout: 120000 });
  const loaded = await state(page);
  const cls = await page.evaluate(() => window.__cls);
  console.log(p, 'closed', loaded, 'CLS', cls.toFixed(4));
  console.log('  headings:', await page.$$eval('.pf-btn', (b) => b.map((x) => x.textContent.replace(/[+−]$/, '').trim())));
  await page.screenshot({ path: path.join(outDir, `${slug}-closed.png`), fullPage: true });
  await page.locator('.pf-btn').nth(1).tap();
  console.log('  tap second heading', await state(page));
  await page.locator('.pf-btn').nth(1).tap();
  console.log('  tap it again', await state(page));
  const last = page.locator('.pf-contents a').last();
  const id = (await last.getAttribute('href')).slice(1);
  await last.tap();
  await page.waitForTimeout(400);
  console.log('  contents link', id, await state(page), 'top', await page.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top), id));
  await page.locator('.pf-all').tap();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  console.log('  show all', await state(page), await page.locator('.pf-all').textContent());
  await page.screenshot({ path: path.join(outDir, `${slug}-open.png`), fullPage: true });
  const fold = (await page.getAttribute('.pf-sec:nth-child(2)', 'data-fold'));
  await page.goto(`${base}${p}?section=${fold}`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(300);
  console.log('  ?section=', fold, await state(page), 'top', await page.evaluate((i) => Math.round(document.getElementById(`section-${i}`).getBoundingClientRect().top), fold));
  await ctx.close();
}
await browser.close();
