// Black ink check (owner's standing rule, 27 Oct 2026): all reader facing text on the site is #14100d at full strength.
// Visits a set of pages in a real browser and, for every visible piece of text, works out the colour the reader sees:
// its colour, its own alpha and every ancestor's opacity combined. Lists every piece that is not #14100d at full
// strength, except:
//   - the accent red #7a1612 (links, headings, buttons);
//   - light text (on a dark or red background: buttons, the red strip button, dark panels);
//   - text the reader cannot see (opacity 0, hidden, clipped to 1px for screen readers).
// Form placeholders are checked too. Exits 1 when anything is found.
//
// Run against a local build: npx tsx scripts/checks/black-ink.ts [--base http://127.0.0.1:3001] [--json out.json]
import { chromium, type Page } from 'playwright';
import fs from 'fs';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:3001');
const JSON_OUT = arg('json', '');

type Finding = { page: string; text: string; colour: string; alpha: number; tag: string; path: string; placeholder?: boolean };

// Fixed pages, plus one of each record page found from an index page.
const FIXED = ['/', '/directory', '/parties', '/councils', '/councils/birmingham', '/mps/4597', '/bills', '/divisions', '/debates',
  '/donations/government-contractors', '/organisations', '/laws/made-without-a-vote', '/treaties', '/newsletter', '/login',
  '/commission', '/search?q=nhs', '/sections/parliament',
  '/bills/3887/full', '/bills/4017/full']; // a full bill with its text, and one with the PDF fallback
const FIND_ONE: [string, RegExp][] = [
  ['/reports', /^\/editorials\/[a-z0-9]+$/], ['/reports', /^\/briefings\/[a-z0-9]+$/], ['/', /^\/news\/[a-z0-9-]+$/],
  ['/bills', /^\/bills\/\d+$/], ['/organisations', /^\/organisations\/[a-z0-9-]+$/],
];

const SCAN_JS = fs.readFileSync(new URL('./black-ink-scan.js', import.meta.url), 'utf8').replace(/^(\/\/.*\n)+/, '').trim();

async function scan(page: Page, path: string): Promise<Finding[]> {
  return page.evaluate(`(${SCAN_JS})(${JSON.stringify(path)})`) as Promise<Finding[]>;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pages = [...FIXED];
  for (const [from, re] of FIND_ONE) {
    await page.goto(BASE + from, { waitUntil: 'domcontentloaded' });
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') || ''));
    const hit = hrefs.find((h) => re.test(h)); if (hit) pages.push(hit);
  }
  const findings: Finding[] = [];
  for (const p of pages) {
    const res = await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 });
    if (!res || res.status() >= 400) { console.log(`${p}: HTTP ${res?.status()}`); continue; }
    await page.waitForTimeout(1200);
    findings.push(...(await scan(page, p)));
  }
  // The phone menu panel, opened.
  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await phone.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 }); await phone.waitForTimeout(1200);
  const toggle = phone.locator('button[aria-label*="menu" i], button[aria-controls]').first();
  if (await toggle.count()) { await toggle.click(); await phone.waitForTimeout(400); findings.push(...(await scan(phone, '/ (phone menu open)'))); }
  await browser.close();

  const byPage = new Map<string, number>();
  for (const f of findings) byPage.set(f.page, (byPage.get(f.page) ?? 0) + 1);
  for (const p of [...pages, '/ (phone menu open)']) console.log(`${String(byPage.get(p) ?? 0).padStart(4)}  ${p}`);
  for (const f of findings) console.log(`${f.page} | ${f.colour} a=${f.alpha} | ${f.tag} | "${f.text}" | ${f.path}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(findings, null, 1));
  console.log(findings.length ? `${findings.length} pieces of text not in full black ink` : 'all text in full black ink (or accent red, or light on dark)');
  process.exit(findings.length ? 1 : 0);
})();
