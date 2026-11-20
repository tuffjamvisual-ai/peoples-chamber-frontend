// A9S, sources only in the fold (Cowork ENTRY 410, owner 20 Nov 2026: "no source lines or source links inside page
// text; sources belong only in the page's Sources fold at the foot of the page"). The push-check design in
// Claude outputs/audit/sources-410/LIST.md, section 5. Reads only: it loads pages from a running build and writes
// nothing but its report (and a baseline when asked). NOT part of the pre-push check yet (T1 wires it in after review).
//
//   node scripts/checks/qa/sources-in-fold.mjs --base http://127.0.0.1:3000 [--pages /a,/b] [--no-tabs]
//        [--baseline <file>] [--write-baseline <file>] [--json <file>]
//
// Pages: by default every council page type in scripts/checks/mobile-audit-pages.csv (routes under /councils, each
// example), and for each /councils/[slug] example its detail tabs' panel routes (/councils/<slug>/panel/<tab>, the
// tabs in lib/council-panels.ts), which is what CouncilTabs copies into the page when a tab is opened. --pages
// replaces that list (a /councils/<slug> page given there also gets its tabs unless --no-tabs).
// One page load a second at most (pace rule: a local build reads the production database).
//
// Left out of the scan: the Sources folds ([data-og-sources]: PageSources and SourcesFold; on /mps/<id> only the
// biography's .mp-bio-sources fold counts), header, nav, footer (the shell's licence line), [data-og-back],
// [data-council-tab], script, style, noscript. A panel route is scanned inside #council-panel-body only.
// Offences:
//   link  an a[href] to an http(s) host other than opengovt.uk (mailto:, tel: and on-site links are fine), whatever
//         marker it carries (data-og-row-source, data-og-citations, data-og-attribution, licence addresses all count);
//   text  text (textContent, so closed folds are read too; not [data-og-official]) matching: "Source:"/"Sources:",
//         "(source)", a link whose whole text is "source", "From Wikipedia", "Declaration of result", "in Sources at the
//         end of the page/tab", "Contains public sector information", "Open Government Licence", "Open Parliament
//         Licence", "Crown copyright", "CC BY" with a version, or a table heading that is exactly "Source".
// With --baseline <file> (JSON: { "<page>": ["<offence key>", ...] }) a run fails only on offences not in it;
// --write-baseline <file> writes this run's offences as one. Exit 1 on a failing run.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const base = (opt('--base') || '').replace(/\/$/, '');
if (!base) { console.error('usage: node scripts/checks/qa/sources-in-fold.mjs --base <url> [--pages /a,/b] [--no-tabs] [--baseline <file>] [--write-baseline <file>] [--json <file>]'); process.exit(2); }
const withTabs = !args.includes('--no-tabs');

// The council detail tabs, from lib/council-panels.ts.
function councilTabs() {
  const src = fs.readFileSync(path.join(ROOT, 'lib/council-panels.ts'), 'utf8');
  const m = /COUNCIL_LAZY_TABS\s*=\s*\[([^\]]*)\]/.exec(src);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}

// Each example of the council page types in mobile-audit-pages.csv.
function councilPages() {
  const csv = fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-pages.csv'), 'utf8').split('\n').slice(1);
  const out = [];
  for (const line of csv) {
    const cols = [...line.matchAll(/"([^"]*)"|([^,]+)/g)].map((m) => m[1] ?? m[2]);
    if (cols.length >= 2 && /^\/councils(\/|$)/.test(cols[0]) && cols[1].startsWith('/')) out.push(cols[1]);
  }
  return [...new Set(out)];
}

const isCouncilPage = (p) => /^\/councils\/(?!search$|league-table$|hmos$|blue-badges$|children-in-care$|child-poverty$|free-school-meals$|youth-justice$|road-condition$)[^/]+$/.test(p);
const listed = opt('--pages') ? opt('--pages').split(',').map((s) => s.trim()).filter(Boolean) : councilPages();
const pages = [];
for (const p of listed) {
  pages.push(p);
  if (withTabs && isCouncilPage(p)) for (const t of councilTabs()) pages.push(`${p}/panel/${t}`);
}

// Runs in the page: the offences, as { key, detail }.
function scan() {
  const isMp = /^\/mps\/\d+/.test(location.pathname);
  const root = document.querySelector('#council-panel-body') || document.body;
  const skipSel = [isMp ? '.mp-bio-sources' : '[data-og-sources]', 'header', 'nav', 'footer', '[data-og-back]', '[data-council-tab]', 'script', 'style', 'noscript', 'template'].join(',');
  const skipped = (el) => !!(el && el.closest && el.closest(skipSel));
  const out = [];
  const snip = (t) => t.replace(/\s+/g, ' ').trim().slice(0, 140);
  const own = new Set(['opengovt.uk', 'www.opengovt.uk', location.host]);
  for (const a of root.querySelectorAll('a[href]')) {
    if (skipped(a)) continue;
    let u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || own.has(u.host)) continue;
    out.push({ key: `link ${u.host}`, detail: `link to ${u.href} ("${snip(a.textContent || '')}")` });
  }
  const PATTERNS = [
    ['Source:', /\bSources?\s*:/],
    ['(source)', /\(source\)/i],
    ['From Wikipedia', /From Wikipedia/i],
    ['Declaration of result', /Declaration of result/i],
    ['in Sources at the end', /in Sources at the end of (the|this) (page|tab)/i],
    ['public sector information', /Contains public sector information/i],
    ['Open Government Licence', /Open Government Licence/i],
    ['Open Parliament Licence', /Open Parliament Licence/i],
    ['Crown copyright', /Crown copyright/i],
    ['CC BY', /\bCC BY(-SA)? ?\d/],
  ];
  // The text of each block-level element, from its own text nodes and inline children (textContent, closed folds too).
  const BLOCK = 'p,li,dd,dt,td,th,caption,summary,figcaption,h1,h2,h3,h4,h5,h6,blockquote,pre,label,div,section,article,details,span';
  const seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || skipped(el) || el.closest('[data-og-official]')) continue;
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    const block = el.closest(BLOCK) || el;
    if (seen.has(block)) continue;
    seen.add(block);
    // The block's text without its skipped or official parts.
    const clone = block.cloneNode(true);
    for (const x of clone.querySelectorAll(skipSel + ',[data-og-official]')) x.remove();
    const text = clone.textContent || '';
    for (const [name, re] of PATTERNS) {
      const m = re.exec(text);
      if (m) {
        const at = Math.max(0, m.index - 40);
        out.push({ key: `text ${name}`, detail: `<${block.tagName.toLowerCase()}> "${snip(text.slice(at, at + 140))}"` });
      }
    }
  }
  for (const a of root.querySelectorAll('a')) {
    if (!skipped(a) && /^\s*source\s*$/i.test(a.textContent || '')) out.push({ key: 'text link "source"', detail: `<a> "source" (${a.getAttribute('href')})` });
  }
  for (const th of root.querySelectorAll('th')) {
    if (!skipped(th) && /^\s*Source\s*$/.test(th.textContent || '')) out.push({ key: 'text th Source', detail: '<th> "Source"' });
  }
  // One entry per distinct offence on the page.
  const uniq = new Map();
  for (const o of out) if (!uniq.has(o.key + o.detail)) uniq.set(o.key + o.detail, o);
  return [...uniq.values()];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const baseline = opt('--baseline') ? JSON.parse(fs.readFileSync(opt('--baseline'), 'utf8')) : null;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const results = [];
let last = 0;
for (const p of pages) {
  const wait = 1000 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const r = { page: p, status: null, offences: [] };
  try {
    const resp = await page.goto(base + p, { waitUntil: 'load', timeout: 60000 });
    r.status = resp ? resp.status() : null;
    if (r.status === 404) { r.note = 'not found (no such page for this example)'; results.push(r); console.log(`${p}: 404, skipped`); continue; }
    r.offences = await page.evaluate(scan);
  } catch (e) {
    r.error = String(e.message || e).split('\n')[0];
  }
  results.push(r);
  console.log(`${p}: ${r.error ? `ERROR ${r.error}` : `${r.offences.length} offence${r.offences.length === 1 ? '' : 's'}`}`);
  for (const o of r.offences) console.log(`  ${o.key}: ${o.detail}`);
}
await browser.close();

const keysOf = (r) => [...new Set(r.offences.map((o) => o.key))];
const fresh = [];
for (const r of results) {
  const known = new Set(baseline ? baseline[r.page] ?? [] : []);
  for (const k of keysOf(r)) if (!known.has(k)) fresh.push(`${r.page}: ${k}`);
}
const errors = results.filter((r) => r.error);
const total = results.reduce((t, r) => t + r.offences.length, 0);
console.log(`\nsources-in-fold: ${results.length} pages, ${total} offence${total === 1 ? '' : 's'}${baseline ? `, ${fresh.length} not in the baseline` : ''}, ${errors.length} load error${errors.length === 1 ? '' : 's'}`);
if (opt('--write-baseline')) {
  fs.writeFileSync(opt('--write-baseline'), JSON.stringify(Object.fromEntries(results.filter((r) => r.offences.length).map((r) => [r.page, keysOf(r)])), null, 2) + '\n');
  console.log(`baseline written: ${opt('--write-baseline')}`);
}
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ base, results }, null, 2) + '\n');
const failed = errors.length > 0 || (baseline ? fresh.length > 0 : total > 0);
if (failed && baseline) for (const f of fresh) console.log(`NEW ${f}`);
process.exit(failed ? 1 : 0);
