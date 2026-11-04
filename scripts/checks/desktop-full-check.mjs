// Wide screen check (owner, 4 Nov 2026): full page screenshots at 1440px and 480px, with every tab of an MP and a council
// page opened in turn, so a phone only change can be shown to leave wider screens exactly as they were.
//   node scripts/checks/desktop-full-check.mjs <base url> <out dir>
//   node scripts/checks/desktop-full-check.mjs --compare <dir a> <dir b>
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const PAGES = [['/', null], ['/editorials/alghyhvbbo', null], ['/lords/100', null], ['/mps/4874', '[data-section]'], ['/councils/nottingham', '[data-council-tab]']];
const WIDTHS = [1440, 480];

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !/Loading…|Loading the individual claims/.test(document.body.innerText), null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1500); // count up figures
}

async function run(base, out) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const width of WIDTHS) {
    for (const [p, tabs] of PAGES) {
      const page = await (await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })).newPage();
      await page.goto(base + p, { waitUntil: 'networkidle', timeout: 180000 });
      await settle(page);
      const name = `${width}-${p === '/' ? 'home' : p.slice(1).replace(/\//g, '_')}`;
      await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
      for (const sel of tabs ? await page.$$(tabs) : []) {
        if (!(await sel.isVisible())) continue;
        const id = (await sel.getAttribute('data-section')) || (await sel.getAttribute('data-council-tab'));
        await sel.click();
        await settle(page);
        await page.mouse.move(0, 0);
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(out, `${name}-${id}.png`), fullPage: true });
      }
      console.log(name, 'done');
      await page.close();
    }
  }
  await browser.close();
}

async function compare(a, b) {
  let bad = 0, n = 0;
  for (const f of fs.readdirSync(a).filter((x) => x.endsWith('.png'))) {
    n++;
    if (!fs.existsSync(path.join(b, f))) { bad++; console.log(f, 'missing'); continue; }
    const [x, y] = await Promise.all([a, b].map((d) => sharp(path.join(d, f)).raw().toBuffer({ resolveWithObject: true })));
    if (x.info.width !== y.info.width || x.info.height !== y.info.height) { bad++; console.log(f, `size ${x.info.width}x${x.info.height} and ${y.info.width}x${y.info.height}`); continue; }
    let diff = 0, top = -1, bottom = -1;
    for (let i = 0, px = 0; i < x.data.length; i += x.info.channels, px++) {
      if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2]) { diff++; const r = Math.floor(px / x.info.width); if (top < 0) top = r; bottom = r; }
    }
    if (diff) { bad++; console.log(f, `${diff} pixels differ, rows ${top} to ${bottom}`); }
  }
  console.log(`${n - bad} of ${n} screenshots identical`);
}

const args = process.argv.slice(2);
(args[0] === '--compare' ? compare(args[1], args[2]) : run(args[0], args[1])).catch((e) => { console.error(e); process.exit(1); });
