// Council tabs check (owner, 4 Nov 2026): at 1440px opens every tab of each council's page on a running site and saves
// the tabs shown and each tab's text, so two runs can be compared: the tabs loaded on demand must read as they did.
//   node scripts/checks/council-panels-check.mjs <base url> <out.json>
//   node scripts/checks/council-panels-check.mjs --compare <a.json> <b.json>
import fs from 'fs';
import { chromium } from 'playwright';

const COUNCILS = ['nottingham', 'kent', 'oxford', 'birmingham', 'glasgow', 'cardiff', 'belfast', 'city-of-london-corporation'];
const clean = (t) => t.replace(/\s+/g, ' ').trim();

async function run(base, out) {
  const browser = await chromium.launch();
  const result = {};
  for (const slug of COUNCILS) {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    const res = await page.goto(`${base}/councils/${slug}`, { waitUntil: 'networkidle', timeout: 180000 });
    if (res.status() !== 200) { result[slug] = { status: res.status() }; continue; }
    const tabs = await page.$$eval('[data-council-tab]', (bs) => bs.filter((b) => getComputedStyle(b).display !== 'none').map((b) => b.dataset.councilTab));
    const panels = {};
    for (const id of tabs) {
      await page.click(`[data-council-tab="${id}"]`);
      // Until the tab and anything in it that loads for itself (the welfare section) have finished.
      await page.waitForFunction((i) => !/Loading…/.test(document.querySelector(`#council-panel-${i}`).innerText), id, { timeout: 120000 });
      panels[id] = clean(await page.$eval(`#council-panel-${id}`, (el) => el.innerText));
    }
    result[slug] = { status: 200, tabs, panels };
    console.log(slug, tabs.join(' '), Object.values(panels).reduce((n, t) => n + t.length, 0));
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
}

function compare(a, b) {
  const [x, y] = [a, b].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  let bad = 0;
  for (const slug of Object.keys(x)) {
    if (JSON.stringify(x[slug].tabs) !== JSON.stringify(y[slug]?.tabs)) { bad++; console.log(slug, 'tabs differ', x[slug].tabs, y[slug]?.tabs); continue; }
    for (const id of x[slug].tabs ?? []) {
      if (x[slug].panels[id] === y[slug].panels[id]) continue;
      bad++;
      const [p, q] = [x[slug].panels[id], y[slug].panels[id]];
      let i = 0;
      while (i < p.length && p[i] === q[i]) i++;
      console.log(`${slug} ${id} differs at ${i}:\n  a: ${p.slice(Math.max(0, i - 40), i + 80)}\n  b: ${q.slice(Math.max(0, i - 40), i + 80)}`);
    }
  }
  console.log(bad ? `${bad} differences` : `identical: ${Object.keys(x).length} councils`);
}

const args = process.argv.slice(2);
if (args[0] === '--compare') compare(args[1], args[2]); else run(args[0], args[1]).catch((e) => { console.error(e); process.exit(1); });
