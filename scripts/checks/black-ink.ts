// Black ink and 15px check (owner's standing rules, 27 Oct 2026): all reader facing text on the site is #14100d at full
// strength and at least 15px. Visits one page of every route type in the sitemap, plus a few fixed pages, at 320 and
// 1280px in a real browser. For every visible piece of text it works out the colour the reader sees (its colour, its
// own alpha and every ancestor's opacity combined) and the size it is drawn at. Lists every piece smaller than 15px,
// and every piece not #14100d at full strength, except:
//   - the accent red #7a1612 (links, headings, buttons);
//   - light text (on a dark or red background: buttons, the red strip button, dark panels);
//   - text the reader cannot see (opacity 0, hidden, clipped to 1px for screen readers).
// Form placeholders are checked too. Exits 1 when anything is found, or when a page cannot be loaded.
//
// Run against a local build: npx tsx scripts/checks/black-ink.ts [--base http://127.0.0.1:3001] [--json out.json]
import { chromium, type Page } from 'playwright';
import fs from 'fs';
import path from 'path';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:3001');
const JSON_OUT = arg('json', '');
const WIDTHS = [320, 1280];

type Finding = { page: string; kind: 'colour' | 'size'; text: string; colour: string; alpha: number; size?: number; tag: string; path: string; placeholder?: boolean };

// Pages not in the sitemap that readers still see, and the two kinds of full bill page.
const FIXED = ['/login', '/signup', '/search?q=nhs', '/bills/3887/full', '/bills/4017/full'];

// Every page route under app/, as a pattern: the route type a sitemap address belongs to.
function routes(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) { if (e.name === 'page.tsx') out.push(base || '/'); continue; }
    if (e.name === 'api' || e.name.startsWith('_') || e.name.startsWith('.')) continue;
    out.push(...routes(path.join(dir, e.name), base + (/^\(.*\)$/.test(e.name) ? '' : `/${e.name}`)));
  }
  return out;
}
const ROUTES = routes('app')
  .map((r) => ({ r, re: new RegExp('^' + r.replace(/\[\[?\.\.\.[^\]]+\]\]?/g, '.+').replace(/\[[^\]]+\]/g, '[^/]+') + '$'), dyn: (r.match(/\[/g) ?? []).length }))
  .sort((a, b) => a.dyn - b.dyn); // a fixed route wins over a dynamic one that also matches

// One address per route type, from the sitemap (following a sitemap index if there is one).
async function sitemapPages(): Promise<string[]> {
  const locs = async (u: string): Promise<string[]> => [...(await (await fetch(u)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let urls = await locs(BASE + '/sitemap.xml');
  if (urls.every((u) => /sitemap[^/]*\.xml$/.test(u))) urls = (await Promise.all(urls.map((u) => locs(BASE + new URL(u).pathname)))).flat();
  const byType = new Map<string, string>();
  for (const u of urls) {
    const p = decodeURI(new URL(u).pathname).replace(/\/$/, '') || '/';
    const type = ROUTES.find((x) => x.re.test(p))?.r ?? `unmatched ${p}`;
    if (!byType.has(type)) byType.set(type, new URL(u).pathname);
  }
  console.log(`sitemap: ${urls.length} addresses, ${byType.size} route types`);
  return [...byType.values()];
}

const SCAN_JS = fs.readFileSync(new URL('./black-ink-scan.js', import.meta.url), 'utf8').replace(/^(\/\/.*\n)+/, '').trim();

async function scan(page: Page, path: string): Promise<Finding[]> {
  return page.evaluate(`(${SCAN_JS})(${JSON.stringify(path)})`) as Promise<Finding[]>;
}

(async () => {
  const pages = [...new Set([...(await sitemapPages()), ...FIXED])];
  const browser = await chromium.launch();
  const findings: Finding[] = [];
  const failed: string[] = [];
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const p of pages) {
      const res = await page.goto(BASE + p, { waitUntil: 'load', timeout: 90000 }).catch((e: Error) => { failed.push(`${p} at ${width}px: ${e.message.split('\n')[0]}`); return null; });
      if (!res) continue;
      if (res.status() >= 400) { failed.push(`${p} at ${width}px: HTTP ${res.status()}`); continue; }
      await page.waitForTimeout(800);
      findings.push(...(await scan(page, `${p} @${width}`)));
    }
    await page.close();
  }
  // The phone menu panel, opened.
  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await phone.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 }); await phone.waitForTimeout(1200);
  const toggle = phone.locator('button[aria-label*="menu" i], button[aria-controls]').first();
  if (await toggle.count()) { await toggle.click(); await phone.waitForTimeout(400); findings.push(...(await scan(phone, '/ (phone menu open)'))); }
  await browser.close();

  const byPage = new Map<string, number>();
  for (const f of findings) byPage.set(f.page, (byPage.get(f.page) ?? 0) + 1);
  for (const [p, n] of byPage) console.log(`${String(n).padStart(4)}  ${p}`);
  for (const f of findings) console.log(`${f.page} | ${f.kind === 'size' ? `${f.size}px` : `${f.colour} a=${f.alpha}`} | ${f.tag} | "${f.text}" | ${f.path}`);
  for (const f of failed) console.log(`COULD NOT LOAD ${f}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ findings, failed }, null, 1));
  console.log(`${pages.length} pages at ${WIDTHS.join(' and ')}px: ${findings.filter((f) => f.kind === 'colour').length} pieces of text not in full black ink, ${findings.filter((f) => f.kind === 'size').length} smaller than 15px, ${failed.length} pages not loaded`);
  process.exit(findings.length || failed.length ? 1 : 0);
})();
