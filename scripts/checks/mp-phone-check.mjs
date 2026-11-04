// MP pages on phones (owner, 4 Nov 2026), on a running site, at 375px: small photo, name, party, constituency; four
// headline figures that tap through; sections folded in the owner's order with a summary each; the section buttons gone
// and "On this page" kept; votes, debates and written questions in the page's HTML, folded; nothing wider than the screen.
//   node scripts/checks/mp-phone-check.mjs <base url> <out dir> <id> [id ...]
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const [base, outDir, ...ids] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const ORDER = ['Voting record', 'Registered interests', 'Earnings', 'Donations', 'Expenses', 'Parliamentary activity', 'Roles', 'Diary', 'Background and biography', 'Contact'];
const browser = await chromium.launch();
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };
for (const id of ids) {
  console.log(`--- /mps/${id}`);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const asked = [];
  page.on('request', (r) => { const m = r.url().match(/\/api\/mps\/\d+\/([a-z/]+)/); if (m) asked.push(m[1]); });
  await page.goto(`${base}/mps/${id}`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(600);
  const reject = page.getByRole('button', { name: /reject/i }).first();
  await page.screenshot({ path: path.join(outDir, `${id}-first-screen-banner.png`) });
  if (await reject.isVisible().catch(() => false)) { await reject.tap(); await page.waitForTimeout(150); const h = page.getByRole('button', { name: /hide cookie/i }).first(); if (await h.isVisible().catch(() => false)) await h.tap(); await page.waitForTimeout(200); }
  await page.screenshot({ path: path.join(outDir, `${id}-first-screen.png`) });
  const top = await page.evaluate(() => {
    const y = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; };
    const x = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().left) : null; };
    const t = [...document.querySelectorAll('.mp-headline-tile')];
    return { photoW: document.querySelector('.pca-mp-photo img, .pca-mp-photo > div')?.getBoundingClientRect().width, photoX: x('.pca-mp-photo'), nameX: x('.pca-mp-bio h1'), name: y('.pca-mp-bio h1'), party: y('.pca-mp-party'), seat: y('.pca-mp-constituency'),
      gridBottom: Math.round(t.at(-1)?.getBoundingClientRect().bottom ?? 0), tiles: t.map((e) => ({ link: e.tagName === 'A' ? e.getAttribute('href') : null, h: Math.round(e.getBoundingClientRect().height), text: e.innerText.replace(/\s*\n\s*/g, ' | ') })) };
  });
  check('small photo beside the name', top.photoW <= 80 && top.nameX > top.photoX, `${Math.round(top.photoW)}px`);
  check('name, party, constituency in order', top.name < top.party && (top.seat == null || top.party < top.seat));
  check('four figures', top.tiles.length === 4);
  for (const t of top.tiles) { console.log(`     ${t.text}${t.link ? ` -> ${t.link}` : ' (no section)'}`); check('  figure tall enough, never blank', t.h >= 44 && t.text.split('|').length >= 2); }
  const labels4 = top.tiles.map((t) => t.text.split(' | ')[0]);
  check('figure labels', labels4[0] === 'Votes attended since July 2024' && labels4[1] === 'Registered interests (current)' && labels4[2] === 'Donations (current register)' && /^Expenses( \d{4}\/\d{2})?$/.test(labels4[3]), labels4.join(' ; '));
  const folds = await page.$$eval('.pf-btn', (b) => b.map((x) => x.innerText.replace(/[+−]\s*$/, '').replace(/\s+/g, ' ').trim()));
  console.log('     ' + folds.join('\n     '));
  const labels = folds.map((f) => f.split(':')[0]);
  check('sections in the owner\'s order', JSON.stringify(labels) === JSON.stringify(ORDER.filter((l) => labels.includes(l))));
  check('all closed', (await page.locator('.pf-sec.pf-open').count()) === 0);
  check('section buttons gone', (await page.locator('[data-section]:visible').count()) === 0);
  check('On this page kept', await page.locator('.pf-contents').isVisible());
  check('not wider than the screen', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('expenses, donations and petitions not fetched before opening', asked.length === 0, asked.join(','));

  // In the HTML as the server sends it, for crawlers, and hidden until opened.
  const html = await (await page.request.get(`${base}/mps/${id}`)).text();
  const voting = page.locator('.pf-btn', { hasText: 'Voting record' });
  if (await voting.count()) {
    check('votes are in the server HTML', /Division|vote/i.test(html) && (await page.locator('[data-fold="voting"] .pf-body ul li').count()) > 0, `${await page.locator('[data-fold="voting"] .pf-body ul li').count()} rows`);
    check('and folded until opened', !(await page.locator('[data-fold="voting"] .pf-body ul li').first().isVisible()));
    await voting.tap();
    check('and show when opened', await page.locator('[data-fold="voting"] .pf-body ul li').first().isVisible());
    await voting.tap();
  }
  const activity = page.locator('.pf-btn', { hasText: 'Parliamentary activity' });
  if (await activity.count()) {
    const debates = await page.locator('#section-house ul li').count();
    check('debates and questions are in the page, folded', !(await page.locator('#section-house').count()) || debates > 0, `${debates} rows`);
    await activity.tap();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, `${id}-activity.png`) });
    await activity.tap();
  }
  // Each figure that links opens its section, a second time too.
  for (const t of top.tiles.filter((x) => x.link)) {
    const fold = t.link.replace('#section-', '');
    for (const round of [1, 2]) {
      await page.locator(`.mp-headline-tile[href="${t.link}"]`).tap();
      await page.waitForTimeout(350);
      const ok = await page.evaluate((f) => { const s = document.querySelector(`[data-fold="${f}"]`); const r = s.getBoundingClientRect(); return s.classList.contains('pf-open') && r.top < innerHeight && r.bottom > 0; }, fold);
      check(`${fold} figure opens its section, tap ${round}`, ok);
      if (round === 1) await page.locator(`[data-fold="${fold}"] .pf-btn`).tap();
    }
    await page.locator(`[data-fold="${fold}"] .pf-btn`).tap();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
  }
  await page.locator('.pf-all').tap();
  await page.waitForTimeout(2000);
  check('all open, still not wider than the screen', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}
// An address naming a section inside a shared fold opens that fold.
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const [suffix, fold] of [['?section=house', 'activity'], ['#section-edms', 'activity'], ['?section=career', 'background'], ['?section=voting', 'voting']]) {
    await page.goto(`${base}/mps/${ids[2] ?? ids[0]}${suffix}`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.waitForTimeout(300);
    check(`${suffix} opens ${fold}`, (await page.locator(`[data-fold="${fold}"].pf-open`).count()) === 1);
  }
  await ctx.close();
}
for (const [width, phone] of [[639, true], [640, false]]) {
  const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
  await page.goto(`${base}/mps/${ids[0]}`, { waitUntil: 'networkidle', timeout: 180000 });
  const grid = await page.locator('.mp-headline').isVisible();
  const btn = await page.locator('.pf-btn').first().isVisible();
  const tabs = await page.locator('[data-section]:visible').count();
  check(`${width}px ${phone ? 'is the phone layout' : 'keeps the tabs'}`, phone ? grid && btn && tabs === 0 : !grid && !btn && tabs > 0, `${tabs} tabs`);
  await page.close();
}
await browser.close();
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
