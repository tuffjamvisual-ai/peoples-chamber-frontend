// Deep phone audit (owner, 5 Nov 2026), beyond layout: two browser engines, reader journeys, edge conditions, JavaScript
// off, Lighthouse and axe. Audit only, against a local production build (npx next build, then next start with
// EDITORIALS_FROM_DB=1 RECOMMENDATIONS_PUBLIC=1). Nothing is ever written: every non GET request to the site is answered
// here and counted, and requests to the live site and analytics are blocked.
//   npm i --no-save @axe-core/playwright; node node_modules/playwright/cli.js install webkit     (once)
//   node scripts/checks/mobile-audit-deep.mjs --base http://localhost:3100 [--section webkit,journeys,edge,nojs,lighthouse,axe,focus,report]
//   --out <dir> (default "Claude outputs/mobile-audit-deep")
//   --engines chromium, --journeys e,g   only those; a failed step exits with status 1 (the push check runs it this way)
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const BASE = opt('base') ?? 'http://localhost:3100';
const OUT = opt('out') ?? 'Claude outputs/mobile-audit-deep';
const ONLY_JOURNEYS = opt('journeys')?.split(',') ?? null;
const ENGINES = opt('engines')?.split(',') ?? ['chromium', 'webkit'];
const SECTIONS = (opt('section') ?? 'webkit,journeys,edge,nojs,lighthouse,axe,focus,report').split(',');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const blocked = (url) => /_rsc=|\/_vercel\/|posthog\.com|(^|\/\/)([a-z0-9-]+\.)?opengovt\.uk/.test(url);
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const writeCsv = (name, rows) => {
  if (!rows.length) return fs.writeFileSync(path.join(OUT, name), '');
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  fs.writeFileSync(path.join(OUT, name), [keys.join(','), ...rows.map((r) => keys.map((k) => csvCell(Array.isArray(r[k]) ? r[k].join(' | ') : r[k])).join(','))].join('\n') + '\n');
};
const saveJson = (name, v) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(v, null, 1));
const loadJson = (name, d) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')); } catch { return d; } };

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const allPages = () => parseCsv(fs.readFileSync(path.join(HERE, 'mobile-audit-pages.csv'), 'utf8')).map((r) => ({ route: r.route, url: r.example_url }));
const fastPages = () => {
  const all = allPages();
  return fs.readFileSync(path.join(HERE, 'mobile-audit-fast.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((t) => all.find((p) => p.route === t)).filter(Boolean);
};
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const it = items[i++]; await fn(it); } }));
}
const guard = async (page) => {
  await page.route('**/*', (route) => {
    const req = route.request();
    if (blocked(req.url())) return route.abort();
    if (req.method() !== 'GET' && req.url().startsWith(BASE)) { page.__writes = (page.__writes || 0) + 1; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    return route.continue();
  });
};
const open = async (page, url) => { const res = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(400); return res; };
const dismiss = async (page) => { const r = page.getByRole('button', { name: 'Reject analytics' }).first(); if (await r.count()) { await r.click(); await page.waitForTimeout(200); } };

// ---- 1. WebKit: the layout audit in both engines at 375px, on one build ------------------------------------------------
function sectionWebkit() {
  const run = (engine) => {
    const dir = path.join(OUT, `layout-${engine}`);
    const r = spawnSync('node', [path.join(HERE, 'mobile-audit.mjs'), '--base', BASE, '--out', dir, '--widths', '375', '--no-shots', '--engine', engine], { encoding: 'utf8' });
    if (r.status) throw new Error(`layout audit ${engine}: ${r.stderr.slice(0, 300)}`);
    return { rows: parseCsv(fs.readFileSync(path.join(dir, 'results.csv'), 'utf8')), summary: JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8')) };
  };
  const c = run('chromium'), w = run('webkit');
  const byUrl = new Map(c.rows.map((r) => [r.url, r]));
  const rows = w.rows.map((r) => {
    const o = byUrl.get(r.url) ?? {};
    const only = [...r.problem_checks].filter((x) => !(o.problem_checks ?? '').includes(x)).join('');
    return { url: r.url, route: r.route, chromium_checks: o.problem_checks, webkit_checks: r.problem_checks, webkit_only: only, status: r.status,
      wk_scroll: r.dismissed_horizontal_scroll, wk_too_wide: r.dismissed_too_wide_eg, wk_cut: r.dismissed_cut_off_eg, wk_44: r.dismissed_under_44_eg, wk_15: r.dismissed_under_15_eg, wk_height: r.dismissed_page_height, wk_console: r.console_errors, wk_failed: r.failed_requests };
  });
  writeCsv('webkit.csv', rows);
  saveJson('webkit.json', { chromium: c.summary.totals, webkit: w.summary.totals, webkitOnly: rows.filter((r) => r.webkit_only), chromiumOnly: rows.filter((r) => [...r.chromium_checks].some((x) => !r.webkit_checks.includes(x))).map((r) => r.url) });
}

// ---- 2. Journeys ------------------------------------------------------------------------------------------------------
async function journeys(engineName, engine) {
  const browser = await engine.launch();
  const out = [];
  const journey = async (id, title, fn) => {
    if (ONLY_JOURNEYS && !ONLY_JOURNEYS.includes(id)) return;
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await guard(page);
    let n = 0;
    const step = async (name, f) => {
      n++;
      const row = { engine: engineName, journey: id, title, step: n, name, result: 'pass', detail: '', shot: '' };
      try { const d = await f(); if (d) row.detail = String(d).slice(0, 220); } catch (e) { row.result = 'FAIL'; row.detail = e.message.split('\n')[0].slice(0, 220); }
      try { const png = await page.screenshot(); const f2 = `j-${engineName}-${id}-${n}.jpg`; await sharp(png).resize({ width: 240 }).jpeg({ quality: 60 }).toFile(path.join(SHOTS, f2)); row.shot = `shots/${f2}`; } catch { /* no screenshot */ }
      out.push(row);
      return row.result === 'pass';
    };
    try { await fn(page, step); } catch (e) { await step('journey stopped', () => { throw e; }); }
    await ctx.close();
  };
  const must = (ok, msg) => { if (!ok) throw new Error(msg); };
  const urlIs = async (page, re, msg) => { await page.waitForURL(re, { timeout: 45000 }).catch(() => { throw new Error(`${msg}: at ${page.url().replace(BASE, '')}`); }); };

  await journey('a', 'Homepage postcode to MP, open interests', async (p, step) => {
    await step('open homepage', async () => { await open(p, '/'); await dismiss(p); });
    await step('enter SW1A 0AA in the local search', async () => { const i = p.getByPlaceholder('Postcode, town or council'); await i.fill('SW1A 0AA'); await i.press('Enter'); await urlIs(p, /your-area\?/, 'no area page'); await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); return p.url().replace(BASE, ''); });
    await step('follow to the MP page', async () => { const l = p.locator('a[href^="/mps/"]:visible').first(); must(await l.count(), 'no MP link on the page'); const t = await l.innerText(); await l.click(); await urlIs(p, /\/mps\/\d+/, 'no MP page'); return t; });
    await step('open Registered interests', async () => { const f = p.locator('.pf-btn', { hasText: 'Registered interests' }).first(); await f.click(); await p.waitForTimeout(120); must(await p.locator('[data-fold="interests"] > .pf-d[open]').count(), 'fold did not open'); must(await p.locator('#fold-interests').isVisible(), 'fold body not visible'); });
  });
  const searchTo = async (p, step, term, name, slug) => {
    await step(`search ${term}`, async () => { await open(p, '/search'); await dismiss(p); const i = p.locator('input[aria-label="Search the site"]'); await i.fill(term); await i.press('Enter'); await urlIs(p, new RegExp(`q=${term}`), 'no results page'); await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); });
    await step(`open ${name}`, async () => { const l = p.getByRole('link', { name, exact: false }).first(); await l.click(); await urlIs(p, new RegExp(`/organisations/${slug}`), 'wrong page'); });
    await step('follow "Also see"', async () => { const dt = p.locator('dt', { hasText: 'Also see' }); must(await dt.count(), `no Also see line on ${p.url().replace(BASE, '')}`); await p.locator('dt:has-text("Also see") + dd a').click(); await p.waitForTimeout(1200); await urlIs(p, /\/organisations\//, 'not an organisation'); return p.url().replace(BASE, ''); });
  };
  await journey('b', 'Search serco, SERCO LIMITED, Also see', (p, step) => searchTo(p, step, 'serco', 'SERCO LIMITED', 'serco-limited'));
  await journey('b2', 'Same journey on a page with a link (Barclays)', (p, step) => searchTo(p, step, 'barclays', 'BARCLAYS PLC', 'barclays-plc'));
  await journey('c', 'Council search M1 1AE, open each tab', async (p, step) => {
    await step('open /councils/search', async () => { await open(p, '/councils/search'); await dismiss(p); });
    await step('enter M1 1AE', async () => { await p.getByPlaceholder('Postcode or council name').first().fill('M1 1AE'); await p.getByRole('button', { name: 'Search', exact: true }).first().click(); await urlIs(p, /\/councils\/[a-z-]+/, 'no council page'); await p.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); return p.url().replace(BASE, ''); });
    const tabs = await p.locator('[data-council-tab]').evaluateAll((e) => e.map((x) => [x.dataset.councilTab, x.textContent.trim()]));
    for (const [id, label] of tabs) await step(`tab ${label}`, async () => { await p.locator(`[data-council-tab="${id}"]`).click(); await p.waitForTimeout(600); await p.waitForFunction((i) => { const e = document.getElementById(`council-panel-${i}`); return e && !e.querySelector('[data-panel-loading]'); }, id, { timeout: 40000 }); const t = await p.locator(`#council-panel-${id}`).innerText(); must(t.trim().length > 20, 'panel is empty'); must(!/could not be loaded/.test(t), 'panel failed to load'); });
  });
  await journey('d', 'Menu open and close, first link of each group', async (p, step) => {
    await step('open homepage', async () => { await open(p, '/'); await dismiss(p); });
    await step('open the menu', async () => { await p.getByRole('button', { name: 'Menu' }).click(); await p.waitForTimeout(250); must(await p.locator('#og-menu-panel').isVisible(), 'panel not open'); });
    await step('close the menu', async () => { await p.getByRole('button', { name: 'Close menu' }).click(); await p.waitForTimeout(250); must(!(await p.locator('#og-menu-panel').isVisible()), 'panel still open'); });
    for (const [i, want] of [[0, /\/reports/], [1, /\/mps/], [2, /\/sections\/local/], [3, /\/search/]]) {
      await step(`first link of group ${i + 1}`, async () => { await open(p, '/'); await p.getByRole('button', { name: 'Menu' }).click(); await p.waitForTimeout(250); const l = p.locator('.og-menu-group').nth(i).locator('a').first(); const t = await l.innerText(); await l.click(); await urlIs(p, want, `${t} went elsewhere`); return t; });
    }
  });
  await journey('e', 'MP page: every fold, Back returns page and scroll', async (p, step) => {
    let y = 0, count = 0;
    await step('open /mps/4874', async () => { await open(p, '/mps/4874'); await dismiss(p); });
    await step('open every fold', async () => { const b = p.locator('.pf-btn'); count = await b.count(); must(count > 1, 'no folds'); for (let i = 0; i < count; i++) { must(await b.nth(i).isVisible(), `fold ${i + 1} of ${count} cannot be reached`); await b.nth(i).click(); await p.waitForTimeout(120); must(await p.locator('.pf-d').nth(i).evaluate((d) => d.open), `fold ${i + 1} did not open`); } await p.waitForTimeout(600); const after = await p.evaluate(() => ({ cut: document.querySelectorAll('.pf-list .og-phone-more, .pf-list [data-pm-hide], .pf-list [data-pt-fold], .pf-list [data-pt-fold-hide]').length, nested: document.querySelectorAll('button button, summary button, button a, a button').length })); must(!after.cut, `${after.cut} items cut or folded inside the folds`); must(!after.nested, `${after.nested} controls inside a control`); return `${count} folds`; });
    await step('scroll down and follow a link', async () => { const l = p.locator('#fold-voting a[href^="/"]:visible, #fold-interests a[href^="/"]:visible, .pf-body a[href^="/"]:visible').first(); await l.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); y = await p.evaluate(() => window.scrollY); await l.click(); await p.waitForURL((u) => !u.pathname.endsWith('/mps/4874'), { timeout: 40000 }); return `from scroll ${Math.round(y)}, to ${p.url().replace(BASE, '')}`; });
    await step('Back returns the page', async () => { await p.goBack({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500); must(p.url().endsWith('/mps/4874'), `at ${p.url()}`); });
    await step('Back returns the scroll position', async () => { const now = await p.evaluate(() => window.scrollY); must(Math.abs(now - y) < 300, `was ${Math.round(y)}, now ${Math.round(now)}`); return `was ${Math.round(y)}, now ${Math.round(now)}`; });
    await step('folds are still open after Back', async () => { const open2 = await p.locator('.pf-d[open]').count(); must(open2 === count, `${open2} of ${count} open`); });
  });
  await journey('f', '/organisations: Contracts filter, page 2, Back keeps the filter', async (p, step) => {
    await step('open /organisations', async () => { await open(p, '/organisations'); await dismiss(p); });
    await step('Contracts filter', async () => { await p.locator('.org-filters a', { hasText: 'Contracts' }).click(); await urlIs(p, /has=contracts/, 'filter not in the address'); });
    await step('page 2', async () => { await p.getByRole('link', { name: 'Next →' }).click(); await urlIs(p, /page=2/, 'not page 2'); must(p.url().includes('has=contracts'), 'filter lost on page 2'); });
    await step('Back keeps the filter', async () => { await p.goBack({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800); must(p.url().includes('has=contracts'), `at ${p.url()}`); must(!p.url().includes('page=2'), 'still on page 2'); const on = await p.locator('.org-filters a[aria-current="true"]').innerText(); must(/Contracts/.test(on), `filter shown as ${on}`); });
  });
  await journey('g', 'A long list: Show more until done', async (p, step) => {
    await step('open /donors', async () => { await open(p, '/donors'); await dismiss(p); });
    await step('Show more until done', async () => { let clicks = 0; const seen = []; const b = p.locator('.og-phone-more:visible'); must((await p.locator('#donors-list > tr:visible').count()) === 25, 'does not start at 25 rows'); while (await b.count() && clicks < 30) { must((await b.count()) === 1, `${await b.count()} Show more buttons`); await b.first().click(); await p.waitForTimeout(500); clicks++; seen.push(await p.locator('#donors-list > tr:visible').count()); } const rows = seen[seen.length - 1]; must(rows === 200, `${rows} rows after ${clicks} presses`); must(clicks === 7 && seen.every((n, i) => n === 50 + i * 25), `200 rows took ${clicks} presses, not 7; rows after each: ${seen.join(' ')}`); return `${clicks} presses, ${rows} rows`; });
  });
  await journey('h', 'Tables as cards: every label matches its column', async (p, step) => {
    for (const u of ['/donations/foreign', '/earnings', '/transparency/special-advisers', '/parties/labour/money', '/councils/kent/schools']) {
      await step(u, async () => {
        await open(p, u); await dismiss(p);
        const r = await p.evaluate(() => {
          let cells = 0, bad = []; const clean = (s) => s.replace(/[▲▼▴▾]/g, '').replace(/\s+/g, ' ').trim();
          document.querySelectorAll('table[data-pt-table="cards"]').forEach((t) => {
            const head = t.tHead?.rows[t.tHead.rows.length - 1]; if (!head) return;
            const labels = []; for (const c of head.cells) for (let k = 0; k < (c.colSpan || 1); k++) labels.push(clean(c.textContent));
            for (const b of t.tBodies) for (const row of b.rows) { let col = 0; for (const c of row.cells) { const at = col; col += c.colSpan || 1; const l = c.getAttribute('data-label'); if (l === null || l === '') continue; cells++; if (clean(l) !== labels[at]) bad.push(`"${l}" in the "${labels[at]}" column`); } }
          });
          return { tables: document.querySelectorAll('table[data-pt-table="cards"]').length, cells, bad: bad.slice(0, 3), nbad: bad.length };
        });
        must(r.tables > 0, 'no card tables on the page'); must(r.nbad === 0, `${r.nbad} wrong: ${r.bad.join('; ')}`); return `${r.tables} tables, ${r.cells} labelled cells`;
      });
    }
  });
  await journey('i', '/commission: errors, steps 1 to 4, stop before sending', async (p, step) => {
    const next = p.locator('[data-cm-next]'), line = () => p.locator('[data-cm-progress]').innerText();
    await step('open /commission', async () => { await open(p, '/commission'); await dismiss(p); must((await line()).includes('Step 1 of 4'), await line()); });
    await step('Next with empty fields shows errors', async () => { await next.click(); await p.waitForTimeout(200); must((await line()).includes('Step 1 of 4'), 'moved on'); must(await p.locator('#commission-title-error').isVisible(), 'no title error'); must(await p.locator('#commission-question-error').isVisible(), 'no question error'); must(!(await p.locator('#commission-name-error').count()), 'a later step error shows'); return (await p.locator('#commission-title-error').innerText()).slice(0, 80); });
    await step('fill step 1', async () => { await p.fill('#commission-title', 'Audit test title'); await p.fill('#commission-question', 'A question that is long enough to pass the thirty character rule.'); await next.click(); await p.waitForTimeout(200); must((await line()).includes('Step 2 of 4'), await line()); });
    await step('fill step 2', async () => { await p.fill('#commission-knownPeople', 'A person and a company'); await p.fill('#commission-knownArea', 'Nottingham'); await next.click(); await p.waitForTimeout(200); must((await line()).includes('Step 3 of 4'), await line()); });
    await step('fill step 3', async () => { await p.selectOption('#commission-publish', 'Not sure'); await next.click(); await p.waitForTimeout(200); must((await line()).includes('Step 4 of 4'), await line()); });
    await step('fill step 4, stop before sending', async () => { await p.fill('#commission-name', 'Audit Test'); await p.fill('#commission-email', 'audit@example.invalid'); must(await p.locator('button[type=submit]').first().isVisible(), 'no Send button'); must(!p.__writes, 'something was sent'); return 'Send visible, not pressed'; });
  });
  await journey('j', 'Bill page signed out: the ballot leads to sign in', async (p, step) => {
    await step('open /bills/4035', async () => { await open(p, '/bills/4035'); await dismiss(p); await p.waitForTimeout(800); });
    await step('tap Aye', async () => { await p.getByRole('button', { name: /^Aye/ }).first().click(); await urlIs(p, /\/login\?mode=signup/, 'not sent to sign in'); return p.url().replace(BASE, ''); });
    await step('nothing written', async () => { must(!p.__writes, `${p.__writes} write(s) attempted`); });
  });
  await journey('k', '/newsletter: invalid email shows an error, stop before sending', async (p, step) => {
    // The form checks the address itself, in the route's words, so no request should be sent.
    let posts = 0;
    await p.route('**/api/newsletter/subscribe', (r) => { posts++; return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Please enter a valid email address.' }) }); });
    await step('open /newsletter', async () => { await open(p, '/newsletter'); await dismiss(p); });
    await step('invalid email', async () => { const i = p.locator('input[type=email]:visible').first(); await i.fill('not-an-email'); await p.locator('form:has(input[type=email]) button[type=submit]:visible').first().click(); await p.waitForTimeout(500); const alert = p.locator('form:has(input[type=email]) [role=alert]'); const shown = await alert.count() ? (await alert.first().innerText()) : ''; must(shown === 'Please enter a valid email address.', `error reads: ${shown || 'nothing'}`); must(posts === 0, `${posts} request sent`); return `${shown} (no request sent)`; });
  });
  await browser.close();
  return out;
}
async function sectionJourneys() {
  const rows = [];
  if (ENGINES.includes('chromium')) rows.push(...await journeys('chromium', chromium));
  if (ENGINES.includes('webkit')) rows.push(...await journeys('webkit', webkit));
  writeCsv('journeys.csv', rows);
  saveJson('journeys.json', rows);
  if (ONLY_JOURNEYS) {
    for (const r of rows) console.log(`${r.result} ${r.engine} ${r.journey}${r.step} ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
    if (!rows.length || rows.some((r) => r.result !== 'pass')) process.exitCode = 1;
  }
}

// ---- 3. Edge conditions ------------------------------------------------------------------------------------------------
function edgeMeasure() {
  const vw = window.innerWidth;
  const visible = (e) => { if (!e.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !e.closest('[aria-hidden="true"]'); };
  const label = (e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 34)}"`;
  const clipped = (e) => { let p = e.parentElement; while (p && p !== document.body) { if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowX)) return true; p = p.parentElement; } return false; };
  const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary')].filter(visible).filter((e) => !e.closest('footer'));
  const offscreen = controls.filter((e) => { const r = e.getBoundingClientRect(); return (r.right > vw + 1 || r.left < -1) && !clipped(e); });
  const cutButtons = controls.filter((e) => e.matches('button, summary') && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible');
  const small = controls.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 24 && !e.matches('input[type=checkbox], input[type=radio]'); });
  const wide = [...document.querySelectorAll('body *')].filter((e) => visible(e) && e.getBoundingClientRect().width > vw + 1 && !clipped(e));
  // Overlapping text: blocks with their own text whose boxes cross by more than a third of the smaller one.
  const blocks = [...document.querySelectorAll('p, h1, h2, h3, li, a, button, span, td, dd, dt, label, summary')].filter((e) => visible(e) && !e.closest('footer, .og-mbar, [class*="stamp"]') && [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())).slice(0, 700);
  // Line by line: the bounding box of a link that wraps covers the words beside it, which do not really overlap.
  const boxes = blocks.flatMap((e) => [...e.getClientRects()].filter((r) => r.width > 1 && r.height > 1).map((r) => ({ e, r })));
  const overlaps = [];
  for (let i = 0; i < boxes.length && overlaps.length < 6; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 4 && h > 4 && w * h > 0.34 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) { overlaps.push(`${label(a.e)} over ${label(b.e)}`); break; }
  }
  const inputsSmall = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea')].filter((e) => visible(e) && parseFloat(getComputedStyle(e).fontSize) < 15.95);
  return { scroll: Math.max(0, document.documentElement.scrollWidth - vw), too_wide: wide.length, too_wide_eg: wide.slice(0, 2).map(label), offscreen: offscreen.length, offscreen_eg: offscreen.slice(0, 3).map(label), cut_buttons: cutButtons.length, cut_buttons_eg: cutButtons.slice(0, 3).map(label), small_controls: small.length, small_controls_eg: small.slice(0, 3).map(label), overlaps: overlaps.length, overlaps_eg: overlaps.slice(0, 3), inputs_under_16: inputsSmall.length, inputs_under_16_eg: inputsSmall.slice(0, 3).map(label) };
}
// Browser text zoom cannot be set in a headless browser: every element's font size and any fixed line height is doubled,
// which is what text only zoom does. Layout widths stay as they are.
function textZoom() {
  const all = [...document.querySelectorAll('body, body *')].filter((e) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(e.tagName));
  const read = all.map((e) => { const s = getComputedStyle(e); return [e, parseFloat(s.fontSize), s.lineHeight]; });
  for (const [e, size, lh] of read) { e.style.setProperty('font-size', `${size * 2}px`, 'important'); if (lh.endsWith('px')) e.style.setProperty('line-height', `${parseFloat(lh) * 2}px`, 'important'); }
}
async function sectionEdge() {
  const pages = fastPages();
  const browser = await chromium.launch();
  const rows = [];
  const CONDS = [{ name: '320x568', w: 320, h: 568 }, { name: '812x375 sideways', w: 812, h: 375 }, { name: '375 text 200%', w: 375, h: 812, zoom: true }];
  const jobs = pages.flatMap((p) => CONDS.map((c) => ({ p, c })));
  await pool(jobs, 4, async ({ p, c }) => {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await guard(page);
    const row = { route: p.route, url: p.url, condition: c.name };
    try {
      const res = await open(page, p.url); row.status = res?.status(); await dismiss(page);
      if (c.zoom) { await page.evaluate(textZoom); await page.waitForTimeout(200); }
      Object.assign(row, await page.evaluate(edgeMeasure));
      const bad = (row.scroll > 0) || row.too_wide || row.offscreen || row.cut_buttons || row.overlaps || (row.small_controls > 0);
      row.fail = bad ? 'yes' : '';
      if (bad) { const f = `edge-${c.name.replace(/[^a-z0-9]+/gi, '_')}-${(p.url === '/' ? 'home' : p.url.slice(1)).replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 60)}.jpg`; await sharp(await page.screenshot()).resize({ width: 240 }).jpeg({ quality: 55 }).toFile(path.join(SHOTS, f)); row.shot = `shots/${f}`; }
    } catch (e) { row.error = e.message.split('\n')[0].slice(0, 150); row.fail = 'yes'; }
    rows.push(row); await ctx.close();
  });
  await browser.close();
  rows.sort((a, b) => a.url.localeCompare(b.url) || a.condition.localeCompare(b.condition));
  writeCsv('edge.csv', rows); saveJson('edge.json', rows);
}

// ---- 4. JavaScript off -------------------------------------------------------------------------------------------------
async function sectionNojs() {
  const pages = fastPages();
  const browser = await chromium.launch();
  const rows = [];
  await pool(pages, 3, async (p) => {
    const row = { route: p.route, url: p.url };
    const read = () => { const b = document.body; const menu = document.getElementById('og-menu-panel'); const main = document.querySelector('.dossier-content') || b; const clean = main.cloneNode(true); const openable = [...main.querySelectorAll('details:not([open])')].filter((d) => !d.parentElement.closest('details:not([open])')).reduce((n, d) => n + (d.textContent || '').length + (d.matches('.pf-d') ? (d.nextElementSibling?.textContent || '').length : 0), 0); clean.querySelectorAll('script, style, noscript').forEach((x) => x.remove()); return { h1: document.querySelector('h1')?.textContent?.trim().slice(0, 50) ?? '', text: (b.innerText || '').length, rows: [...document.querySelectorAll('tbody tr, ol li, ul li, article')].filter((e) => !menu?.contains(e)).length, shownText: (main.innerText || '').length + openable, allText: (clean.textContent || '').length, folds: document.querySelectorAll('button.pf-btn').length, picker: !!document.querySelector('.dept-pick select')?.offsetParent, menuPanel: !!menu || !!document.querySelector('.og-mbar a[href="/directory"]'), loading: /Loading[…. ]/.test(b.innerText || ''), hscroll: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), hiddenByCss: document.querySelectorAll('[data-pm-hide]').length }; };
    try {
      const off = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, javaScriptEnabled: false });
      const pg = await off.newPage(); await guard(pg);
      const res = await pg.goto(BASE + p.url, { waitUntil: 'load', timeout: 180000 }); row.status = res?.status();
      await sharp(await pg.screenshot()).resize({ width: 240 }).jpeg({ quality: 55 }).toFile(path.join(SHOTS, `nojs-${(p.url === '/' ? 'home' : p.url.slice(1)).replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 60)}.jpg`));
      row.shot = `shots/nojs-${(p.url === '/' ? 'home' : p.url.slice(1)).replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 60)}.jpg`;
      // evaluate runs outside the page's own scripts, so this reads the page as it is with JavaScript off, noscript included.
      const noJs = await pg.evaluate(read);
      await off.close();
      const on = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const pj = await on.newPage(); await guard(pj); await open(pj, p.url);
      const withJs = await pj.evaluate(read);
      await on.close();
      Object.assign(row, { h1: noJs.h1, text_nojs: noJs.text, text_js: withJs.text, items_nojs: noJs.rows, items_js: withJs.rows, loading_nojs: noJs.loading, hscroll_nojs: noJs.hscroll, shown_nojs: noJs.shownText, in_html_nojs: noJs.allText, folds: noJs.folds, menu_with_js: withJs.menuPanel, menu_nojs: noJs.menuPanel });
      const issues = [];
      if (!row.status || row.status >= 400) issues.push(`HTTP ${row.status}`);
      if (noJs.text < 200) issues.push('nearly blank');
      if (!noJs.h1) issues.push('no h1');
      if (noJs.loading) issues.push('stuck on Loading');
      if (noJs.text < withJs.text * 0.7) issues.push(`text ${noJs.text} against ${withJs.text} with JavaScript`);
      if (noJs.rows < withJs.rows * 0.7) issues.push(`${noJs.rows} list items against ${withJs.rows}`);
      if (noJs.hscroll > 0) issues.push(`sideways scroll ${noJs.hscroll}px`);
      if (noJs.folds) issues.push(`${noJs.folds} folded sections cannot be opened`);
      if (noJs.picker) issues.push('the Section picker does nothing');
      if (noJs.allText > 1000 && noJs.shownText < noJs.allText * 0.5) issues.push(`only ${noJs.shownText} of ${noJs.allText} characters shown, the rest hidden with no way to open them`);
      row.issues = issues;
    } catch (e) { row.issues = [e.message.split('\n')[0].slice(0, 120)]; }
    rows.push(row);
  });
  await browser.close();
  rows.sort((a, b) => (b.issues?.length || 0) - (a.issues?.length || 0) || a.url.localeCompare(b.url));
  writeCsv('nojs.csv', rows); saveJson('nojs.json', rows);
}

// ---- 5. Lighthouse ------------------------------------------------------------------------------------------------------
const LH_PAGES = ['/', '/mps/4874', '/editorials/q1yfr4lome', '/bills', '/bills/4035', '/organisations', '/organisations/serco-limited', '/councils/manchester', '/search?q=nhs', '/donors', '/reports', '/departments/housing', '/lords/100', '/parties/manifestos', '/commission'];
function chromePath() {
  if (fs.existsSync(chromium.executablePath())) return chromium.executablePath();
  const root = path.join(process.env.HOME, 'Library/Caches/ms-playwright');
  const dir = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  return path.join(root, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
}
function sectionLighthouse() {
  const rows = [];
  const tmp = path.join(OUT, 'lh'); fs.mkdirSync(tmp, { recursive: true });
  for (const u of LH_PAGES) {
    const file = path.join(tmp, `${(u === '/' ? 'home' : u.slice(1)).replace(/[^a-zA-Z0-9-]+/g, '_')}.json`);
    const r = spawnSync('npx', ['--yes', 'lighthouse@12', BASE + u, '--quiet', '--output=json', `--output-path=${file}`, '--only-categories=performance,accessibility,best-practices', '--form-factor=mobile', '--throttling-method=simulate', '--chrome-flags=--headless=new --no-sandbox', '--blocked-url-patterns=*posthog*', '--blocked-url-patterns=*/_vercel/*', '--blocked-url-patterns=*opengovt.uk*'], { encoding: 'utf8', env: { ...process.env, CHROME_PATH: chromePath() }, timeout: 300000 });
    const row = { url: u };
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8'));
      const a = j.audits;
      const score = (k) => Math.round((j.categories[k]?.score ?? 0) * 100);
      const opps = Object.values(a).filter((x) => (x.details?.type === 'opportunity' || x.metricSavings) && (x.score ?? 1) < 0.9 && (x.details?.overallSavingsMs > 0 || x.metricSavings?.LCP > 0 || x.metricSavings?.TBT > 0 || x.metricSavings?.CLS > 0))
        .sort((p, q) => ((q.details?.overallSavingsMs ?? q.metricSavings?.LCP ?? 0) + (q.metricSavings?.TBT ?? 0)) - ((p.details?.overallSavingsMs ?? p.metricSavings?.LCP ?? 0) + (p.metricSavings?.TBT ?? 0)));
      const lcpEl = a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? '';
      Object.assign(row, { performance: score('performance'), accessibility: score('accessibility'), best_practices: score('best-practices'), lcp_s: +(a['largest-contentful-paint'].numericValue / 1000).toFixed(2), cls: +a['cumulative-layout-shift'].numericValue.toFixed(3), tbt_ms: Math.round(a['total-blocking-time'].numericValue), fcp_s: +(a['first-contentful-paint'].numericValue / 1000).toFixed(2), server_ms: Math.round(a['server-response-time']?.numericValue ?? 0), opportunities: opps.slice(0, 3).map((o) => `${o.title}${o.displayValue ? ` (${o.displayValue})` : ''}`), lcp_element: lcpEl.slice(0, 90), flag: [a['largest-contentful-paint'].numericValue > 2500 ? 'LCP' : '', a['cumulative-layout-shift'].numericValue > 0.1 ? 'CLS' : ''].filter(Boolean).join(' ') });
      fs.rmSync(file, { force: true });
    } catch (e) { row.error = `${e.message.slice(0, 80)} ${(r.stderr || '').slice(0, 120)}`; }
    rows.push(row);
    console.log(u, row.performance ?? row.error);
  }
  writeCsv('lighthouse.csv', rows); saveJson('lighthouse.json', rows);
}

// ---- 6. Axe --------------------------------------------------------------------------------------------------------------
async function sectionAxe() {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const browser = await chromium.launch();
  const found = [];
  const scan = async (ctx, page, url, state) => {
    const res = await new AxeBuilder({ page }).analyze();
    for (const v of res.violations) if (['serious', 'critical'].includes(v.impact)) found.push({ rule: v.id, impact: v.impact, help: v.help, url, state, nodes: v.nodes.length, example: (v.nodes[0]?.html ?? '').replace(/\s+/g, ' ').slice(0, 170), target: String(v.nodes[0]?.target ?? '').slice(0, 90) });
  };
  let done = 0;
  const pages = allPages();
  await pool(pages, 4, async (p) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await guard(page);
    try { await open(page, p.url); await dismiss(page); await scan(ctx, page, p.url, 'page'); } catch (e) { found.push({ rule: 'audit-error', impact: 'n/a', url: p.url, example: e.message.slice(0, 100), nodes: 0 }); }
    await ctx.close();
    if (++done % 50 === 0) console.log(`axe ${done} of ${pages.length}`);
  });
  // The states a page alone does not show: banner showing, menu open, folds open.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); await guard(page);
  await open(page, '/'); await scan(ctx, page, '/', 'cookie banner showing'); await dismiss(page);
  await page.getByRole('button', { name: 'Menu' }).click(); await page.waitForTimeout(250); await scan(ctx, page, '/', 'menu open');
  await open(page, '/mps/4874'); for (const b of await page.locator('.pf-btn').all()) await b.click(); await page.waitForTimeout(300); await scan(ctx, page, '/mps/4874', 'all folds open');
  await browser.close();
  writeCsv('axe.csv', found); saveJson('axe.json', found);
}

// ---- focus visibility: axe cannot see it ------------------------------------------------------------------------------------
async function sectionFocus() {
  const browser = await chromium.launch();
  const rows = [];
  for (const u of ['/', '/mps/4874', '/search?q=nhs', '/organisations', '/commission']) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage(); await guard(page); await open(page, u); await dismiss(page);
    let none = []; const n = 25;
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const shown = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'; const a = getComputedStyle(e, '::after'); return { shown: shown || (a.outlineStyle !== 'none' && parseFloat(a.outlineWidth) > 0), label: `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)}"` }; });
      if (r && !r.shown) none.push(r.label);
    }
    rows.push({ url: u, tabbed: n, no_visible_focus: new Set(none).size, examples: [...new Set(none)].slice(0, 4) });
    await ctx.close();
  }
  await browser.close();
  writeCsv('focus.csv', rows); saveJson('focus.json', rows);
}

// ---- report -----------------------------------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function table(rows, cols) { return `<div class="w"><table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(Array.isArray(r[c]) ? r[c].join('; ') : r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function axeGroups(found) {
  const g = new Map();
  for (const f of found) { if (!g.has(f.rule)) g.set(f.rule, { rule: f.rule, impact: f.impact, help: f.help, pages: new Set(), elements: 0, example: f.example, example_page: f.url }); const x = g.get(f.rule); x.pages.add(f.url); x.elements += f.nodes; }
  return [...g.values()].map((x) => ({ ...x, pages: x.pages.size })).sort((a, b) => (a.impact === 'critical' ? -1 : 0) - (b.impact === 'critical' ? -1 : 0) || b.pages - a.pages);
}
function sectionReport() {
  const wk = loadJson('webkit.json', {}), j = loadJson('journeys.json', []), edge = loadJson('edge.json', []), nojs = loadJson('nojs.json', []), lh = loadJson('lighthouse.json', []), axe = loadJson('axe.json', []), focus = loadJson('focus.json', []);
  const groups = axeGroups(axe);
  saveJson('axe-groups.json', groups);
  const failed = j.filter((r) => r.result === 'FAIL');
  const byJourney = [...new Set(j.map((r) => `${r.engine}|${r.journey}`))].map((k) => j.filter((r) => `${r.engine}|${r.journey}` === k)).sort((a, b) => b.filter((r) => r.result === 'FAIL').length - a.filter((r) => r.result === 'FAIL').length);
  const edgeBad = edge.filter((r) => r.fail).sort((a, b) => (b.scroll + b.too_wide + b.offscreen + b.overlaps) - (a.scroll + a.too_wide + a.offscreen + a.overlaps));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deep mobile audit</title><style>body{font:15px/1.45 Georgia,serif;margin:16px;color:#14100d;background:#fff}h1{font-size:24px}h2{margin-top:28px;border-top:2px solid #14100d;padding-top:10px}h3{margin:14px 0 4px;font-size:16px}.w{overflow-x:auto}table{border-collapse:collapse;font-size:14px}td,th{border:1px solid #bbb;padding:3px 6px;text-align:left;vertical-align:top}.s{display:flex;gap:8px;overflow-x:auto}.s figure{margin:0;flex:none;width:240px;font-size:13px}.s img{width:240px;border:1px solid #999}.f{color:#a00;font-weight:bold}</style></head><body><h1>Deep mobile audit</h1>
<h2>1. WebKit</h2><p>Chromium pages failing per check: ${esc(JSON.stringify(Object.fromEntries(Object.entries(wk.chromium ?? {}).map(([k, v]) => [k, v.pages]))))}. WebKit: ${esc(JSON.stringify(Object.fromEntries(Object.entries(wk.webkit ?? {}).map(([k, v]) => [k, v.pages]))))}.</p>${table(wk.webkitOnly ?? [], ['url', 'webkit_only', 'wk_scroll', 'wk_too_wide', 'wk_cut', 'wk_44', 'wk_15', 'wk_height', 'wk_console', 'wk_failed'])}
<h2>2. Journeys: ${failed.length} failed steps of ${j.length}</h2>${byJourney.map((rows) => `<h3>${esc(rows[0].engine)} ${esc(rows[0].journey)}: ${esc(rows[0].title)}</h3><div class="s">${rows.map((r) => `<figure>${r.shot ? `<img loading="lazy" src="${esc(r.shot)}" alt="">` : ''}<figcaption class="${r.result === 'FAIL' ? 'f' : ''}">${r.step}. ${esc(r.name)}: ${esc(r.result)}${r.detail ? `<br>${esc(r.detail)}` : ''}</figcaption></figure>`).join('')}</div>`).join('')}
<h2>3. Edge conditions: ${edgeBad.length} of ${edge.length}</h2>${table(edgeBad, ['url', 'condition', 'scroll', 'too_wide_eg', 'offscreen_eg', 'cut_buttons_eg', 'small_controls_eg', 'overlaps_eg', 'inputs_under_16_eg', 'error'])}
<h2>4. JavaScript off</h2>${table(nojs, ['url', 'status', 'h1', 'text_nojs', 'text_js', 'items_nojs', 'items_js', 'issues'])}
<h2>5. Lighthouse</h2>${table(lh, ['url', 'performance', 'accessibility', 'best_practices', 'lcp_s', 'cls', 'tbt_ms', 'server_ms', 'flag', 'opportunities', 'lcp_element', 'error'])}
<h2>6. Axe: serious and critical</h2>${table(groups, ['rule', 'impact', 'pages', 'elements', 'help', 'example_page', 'example'])}
<h3>Focus visibility</h3>${table(focus, ['url', 'tabbed', 'no_visible_focus', 'examples'])}
</body></html>`;
  fs.writeFileSync(path.join(OUT, 'report.html'), html);
  console.log(JSON.stringify({ report: path.resolve(OUT, 'report.html'), journeys_failed: failed.length, journey_steps: j.length, edge_failed: edgeBad.length, nojs_issues: nojs.filter((r) => r.issues?.length).length, axe_rules: groups.length }));
}

const RUN = { webkit: sectionWebkit, journeys: sectionJourneys, edge: sectionEdge, nojs: sectionNojs, lighthouse: sectionLighthouse, axe: sectionAxe, focus: sectionFocus, report: sectionReport };
for (const s of SECTIONS) { console.log(`section ${s} ${new Date().toISOString()}`); await RUN[s](); }
