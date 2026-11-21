// Mobile and journey rules (owner approved 17 Nov 2026, COWORK-TO-T1 ENTRY 239 B). Every page type in
// scripts/checks/mobile-audit-pages.csv (its first example page), at 320 x 740, 390 x 844, 430 x 932 and 768 x 1024, and
// at 1280 x 720 for the lists rule only (ENTRY 282, 283), JavaScript on, as each page first opens (folds closed, cookie banner dismissed by "Reject"). Reads only. A page fails if:
//   taps     a visible link, button, input, select or summary in the page body is under 44px tall (inline text links too;
//            a body-copy link may be excepted only by an entry in mobile-rules-exceptions.json, with Cowork's agreement)
//   lists    a list control other than "Show N more" (N at most 10) and "Show fewer" (a show-all, "Show 241 more", ...),
//            or a "Show N more" without its count beside it ("3 of 241"), or a count whose first number is not 3;
//            the list rule by width (owner, 18 Nov 2026, Cowork ENTRY 282 and 283): under 1,024px a list of 4 or more opens
//            with 3, so a list showing more than 3 items whole is a finding; from 1,024px every list shows whole (owner
//            approved 18 Nov 2026, ENTRY 302), so a list shown whole there is not a finding and any fold there is. The MPs party view's own desktop fold
//            (ENTRY 284: 20, then 'Show 20 more', .mpp-desk) is held to that: N at most 20 and a count beside it. Lists
//            that stay whole by the owner's decision are not counted: nav, menus, footer, <details>, section folds
//            (.pf-list), [data-own-more], an article's running text, and the 'lists' entries of mobile-rules-exceptions.json
//   width    the document is wider than the screen
//   height   the page is taller than 2,500px on a phone or 3,000px on the tablet (not on page types with a 'height'
//            exception: their lists open with 3 however long that makes the page, ENTRY 302)
//   back     the back arrow's link leaves the page's own section (the route's first part, or mobile-rules-sections.json)
//   order    the reading order (the order of the body's links, controls and headings in the HTML) differs from the order
//            shown: an item shown above the one before it, and not beside it or in a column to its right
//   primary  the page's primary control (the visible [data-main-action] search, filter or lookup) starts below the first
//            screen at 390 x 844
//
// Build the site with RECOMMENDATIONS_PUBLIC=1, as production, or the /recommendations pages are 404 (lib/feature-flags.ts).
//   node scripts/checks/mobile-rules.mjs --base <url> [--out <dir>] [--routes /a,/b/[id]] [--limit n] [--report-only]
// Exit 1 when any page fails, unless --report-only. One page load a second (the build reads the production database).
// Requests to opengovt.uk, analytics and Next.js prefetches are blocked, as in mobile-audit.mjs.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const BASE = (opt('base') ?? 'http://localhost:3000').replace(/\/$/, '');
const OUT = opt('out') ?? 'Claude outputs/audit/mobile-rules';
const LIMIT = opt('limit') ? Number(opt('limit')) : Infinity;
const ONLY = opt('routes') ? new Set(opt('routes').split(',')) : null;
const REPORT_ONLY = argv.includes('--report-only');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const SIZES = [[320, 740, 'phone'], [390, 844, 'phone'], [430, 932, 'phone'], [768, 1024, 'tablet'], [1280, 720, 'desktop']];
const MAX_HEIGHT = { phone: 2500, tablet: 3000 };

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8')); } catch { return d; } };
const EXC = readJson('mobile-rules-exceptions.json', { exceptions: [] }).exceptions;
const SECTIONS = readJson('mobile-rules-sections.json', { sections: {} }).sections;

function pages() {
  const rows = fs.readFileSync(path.join(HERE, 'mobile-audit-pages.csv'), 'utf8').trim().split('\n').slice(1)
    .map((line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"')))
    .map(([route, url]) => ({ route, url }));
  const seen = new Set();
  return rows.filter((r) => !seen.has(r.route) && seen.add(r.route) && (!ONLY || ONLY.has(r.route))).slice(0, LIMIT);
}

// The section a page's back arrow must stay in: mobile-rules-sections.json, else the route's first part ('/' for a
// top level page, which may also go to its section page under /sections/).
function sectionOf(route) {
  if (SECTIONS[route]) return [].concat(SECTIONS[route]);
  const first = route.split('/')[1];
  return route.split('/').length > 2 ? [`/${first}`] : ['/', '/sections/'];
}
const backOk = (href, roots) => roots.some((r) => (r === '/' ? href === '/' : href === r || href.startsWith(r.endsWith('/') ? r : r + '/') || href.startsWith(r + '?')));

let lastHit = 0;
async function pace() { const wait = lastHit + 1000 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); lastHit = Date.now(); }
const blocked = (url) => /_rsc=|\/_vercel\/|posthog\.com|(^|\/\/)([a-z0-9-]+\.)?opengovt\.uk/.test(url);

// Runs in the page. Returns the raw findings; exceptions are applied after.
function measure({ excSelectors, listSelectors }) {
  const W = innerWidth;
  const desk = W >= 1024;
  // Lists fold above this many items: 3 under 1,024px; from 1,024px the page script folds none (ENTRY 285).
  const FOLD_ABOVE = desk ? Infinity : 3;
  const main = document.querySelector('main') || document.body;
  const chrome = (e) => e.closest('.og-cookie-banner, .og-mbar, .og-navwrap, .ng-tab, .og-menu-panel, footer, nav[aria-label="Main"]');
  // Shown: has a box, is not hidden, and is not inside a closed <details> (other than as its summary), whose content the
  // browser keeps laid out but does not show.
  const inClosed = (e) => { for (let d = e.closest('details:not([open])'); d; d = d.parentElement?.closest('details:not([open])')) { const sum = d.querySelector(':scope > summary'); if (!sum || !sum.contains(e)) return true; } return false; };
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' && !inClosed(e); };
  const text = (e) => (e.textContent || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ');
  const name = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} "${text(e).slice(0, 40)}"`;
  const excepted = (e) => excSelectors.some((s) => { try { return e.matches(s); } catch { return false; } });
  // A 'lists' exception covers a whole list kept whole, or a list control that opens with more than 3 by an owner decision.
  const listExc = (e) => listSelectors.some((s) => { try { return e.matches(s); } catch { return false; } });
  const out = { taps: [], lists: [], order: [], back: null, primary: null, height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth - W };
  const items = [];
  for (const e of main.querySelectorAll('a[href], button, summary, select, input:not([type=hidden]), textarea, h1, h2, h3, h4')) {
    if (!vis(e) || chrome(e) || e.closest('[aria-hidden="true"]')) continue;
    const r = e.getBoundingClientRect();
    items.push({ e, top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right });
    if (/^H\d$/.test(e.tagName)) continue;
    // A tap area drawn by an absolutely placed ::after (MOB-TAPS, and phones under 480px) counts as the element's tap height.
    const af = getComputedStyle(e, '::after');
    let tapH = af.content && af.content !== 'none' && af.position === 'absolute' ? Math.max(r.height, parseFloat(af.height) || 0) : r.height;
    // A tick box or radio is set by a tap anywhere on its label, so it counts the label's tap area: the label, or the layer
    // drawn on it (ENTRY 286, audit/t1-ticks/PROPOSAL.md).
    if (e.matches('input[type=checkbox], input[type=radio]')) {
      const lab = e.closest('label') || (e.id ? document.querySelector(`label[for="${CSS.escape(e.id)}"]`) : null);
      if (lab) { const la = getComputedStyle(lab, '::after'); tapH = Math.max(tapH, lab.getBoundingClientRect().height, la.content && la.content !== 'none' && la.position === 'absolute' ? parseFloat(la.height) || 0 : 0); }
    }
    if (tapH < 24 && !desk) out.taps.push(`${name(e)} tap area under the 24px floor: ${Math.round(tapH * 10) / 10}px`);
    else if (tapH < 44 && !excepted(e) && !desk) out.taps.push(`${name(e)} ${Math.round(r.width)}x${Math.round(tapH)}`);
    // The text shown (innerText): a fold's summary holds both 'Show 10 more' and a hidden 'Show fewer', whose textContent
    // ('Show 10 moreShow fewer') matched neither pattern, so such folds went unchecked.
    const t = (e.innerText || '').trim().replace(/\s+/g, ' ') || text(e);
    // A list control: a button or fold that shows more of a list, or a link that stays on this page doing the same (a link to
    // another page, such as "See all the figures", is navigation, not a list control).
    const samePage = e.tagName === 'A' && (() => { const u = new URL(e.getAttribute('href'), location.href); return u.pathname === location.pathname; })();
    // The section accordion's 'Show all sections' (PhoneFolds .pf-all, owner approved 4 Nov 2026, the GOV.UK accordion) opens
    // the page's section folds; it is not a list control (Cowork ENTRY 261).
    const accordion = e.closest('.pf-all') || e.matches('.pf-all');
    if (!accordion && (/^(button|summary)$/i.test(e.tagName) || samePage) && /\b(show|see|view)\s+(all|every|\d[\d,]*\s+more|more)\b/i.test(t)) {
      // 'Show N more' (N at most 10), a noun after it allowed ('Show 10 more sitting days'); the count is the list's
      // .og-more-count element just before the button ('3 of 241').
      const m = /^Show (\d+) more\b/.exec(t);
      const party = desk && e.closest('.mpp-desk');
      if (party) {
        if (!(m && Number(m[1]) <= 20)) out.lists.push(`list control ${name(e)}`);
        else if (!/^[\d,]+ of [\d,]+$/.test(text(e.parentElement.querySelector('.og-more-count') || e))) out.lists.push(`no count beside ${name(e)}`);
      } else if (!(m && Number(m[1]) <= 10)) out.lists.push(`list control ${name(e)}`);
      else {
        let c = null;
        for (let x = (e.tagName === 'SUMMARY' ? e.parentElement : e).previousElementSibling, k = 0; x && k < 3 && !c; x = x.previousElementSibling, k++) if (x.matches('.og-more-count')) c = x;
        if (!c) out.lists.push(`no count beside ${name(e)}`);
        else {
          const n = /^([\d,]+) of ([\d,]+)$/.exec(text(c));
          if (!n) out.lists.push(`count '${text(c)}' is not 'N of M' beside ${name(e)}`);
          else if (Number(n[1].replace(/,/g, '')) !== 3 && !listExc(e)) out.lists.push(`opens with ${n[1]} of ${n[2]}, not 3: ${name(e)}`);
          else if (desk) out.lists.push(`a list of ${n[2]} folds from 1,024px (every list shows whole there, ENTRY 302): ${name(e)}`);
        }
      }
    }
  }
  // Whole lists: a list showing more items than FOLD_ABOVE, outside the lists that stay whole.
  const OWN = 'nav, .og-menu-panel, .og-mbar, footer, details, .pf-list, [data-own-more], [data-article-body]';
  for (const l of document.querySelectorAll('.ng-page ul, .ng-page ol, .ng-page tbody')) {
    if (l.closest(OWN) || chrome(l) || inClosed(l) || !vis(l) || listExc(l)) continue;
    const shown = [...l.children].filter((c) => vis(c)).length;
    if (shown > FOLD_ABOVE) out.lists.push(`a list of ${shown} shown whole (under 1,024px lists of 4 or more open with 3): ${l.tagName.toLowerCase()}${typeof l.className === 'string' && l.className ? '.' + l.className.trim().split(/\s+/)[0] : ''} "${text(l).slice(0, 40)}"`);
  }
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1], b = items[i];
    const besideOrRight = b.left >= a.right - 1 || (b.top < a.bottom && b.left > a.left);
    if (b.top < a.top - 4 && !besideOrRight) out.order.push(`${name(a.e)} (${Math.round(a.top)}) then ${name(b.e)} (${Math.round(b.top)})`);
  }
  const back = document.querySelector('[data-og-back]');
  if (back) out.back = new URL(back.getAttribute('href'), location.href).pathname + new URL(back.getAttribute('href'), location.href).search;
  const pm = [...document.querySelectorAll('[data-main-action]')].find((e) => vis(e) && (e.matches('input, select, textarea, button, form') || e.querySelector('input, select, textarea')));
  if (pm) out.primary = Math.round(pm.getBoundingClientRect().top + scrollY);
  return out;
}

const list = pages();
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const t0 = Date.now();
for (const pg of list) {
  const excFor = EXC.filter((x) => x.route === pg.route || x.route === '*');
  const res = { route: pg.route, url: pg.url, fails: [] };
  for (const [w, h, kind] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: kind === 'phone', hasTouch: kind !== 'desktop' });
    const page = await ctx.newPage();
    await page.route('**/*', (route) => (blocked(route.request().url()) ? route.abort() : route.continue()));
    try {
      await pace();
      const resp = await page.goto(BASE + pg.url, { waitUntil: 'load', timeout: 60_000 });
      if (!resp || resp.status() >= 400) { res.fails.push({ size: `${w}`, rule: 'load', detail: `HTTP ${resp?.status()}` }); await ctx.close(); continue; }
      await page.waitForTimeout(600);
      const rej = page.getByRole('button', { name: /^Reject/ });
      if (await rej.first().isVisible().catch(() => false)) { await rej.first().click().catch(() => {}); await page.waitForTimeout(200); }
      const m = await page.evaluate(measure, { excSelectors: excFor.filter((x) => x.rule !== 'lists').map((x) => x.selector).filter(Boolean), listSelectors: excFor.filter((x) => x.rule === 'lists').map((x) => x.selector).filter(Boolean) });
      const add = (rule, detail) => res.fails.push({ size: `${w}x${h}`, rule, detail });
      for (const d of m.lists) add('lists', d);
      // 1280 x 720 is for the lists rule only (ENTRY 283): the other rules are the phone and tablet rules.
      if (kind === 'desktop') { await ctx.close(); continue; }
      for (const d of m.taps) add('taps', d);
      if (m.width > 0) add('width', `${m.width}px wider than the screen`);
      // A 'height' exception lifts the length limit for its page type (owner approved 18 Nov 2026, ENTRY 302: lists open with 3
      // even where that makes the page longer).
      // A 'height' exception with 'max' (owner decision 21 Nov 2026, ENTRY 493) raises the limit to that height per kind
      // instead of lifting it.
      const hExc = excFor.find((x) => x.rule === 'height');
      const hLimit = hExc ? (hExc.max?.[kind] ?? Infinity) : MAX_HEIGHT[kind];
      if (m.height > hLimit) add('height', `${m.height}px (limit ${hLimit})`);
      if (m.back && !backOk(m.back, sectionOf(pg.route))) add('back', `back arrow goes to ${m.back}, outside ${sectionOf(pg.route).join(' or ')}`);
      for (const d of m.order) add('order', d);
      if (w === 390 && m.primary != null && m.primary >= h) add('primary', `primary control starts at ${m.primary}px, below the first screen (${h}px)`);
    } catch (e) {
      res.fails.push({ size: `${w}`, rule: 'load', detail: String(e.message).slice(0, 120) });
    }
    await ctx.close();
  }
  results.push(res);
  const n = res.fails.length;
  console.log(`${n ? 'FAIL' : 'ok  '} ${pg.route} (${pg.url})${n ? `: ${n} findings, ${[...new Set(res.fails.map((f) => f.rule))].join(', ')}` : ''}`);
}
await browser.close();

const failing = results.filter((r) => r.fails.length);
const byRule = {};
for (const r of failing) for (const f of r.fails) (byRule[f.rule] ||= new Set()).add(r.route);
const lines = [`# Mobile rules: ${results.length} page types, ${failing.length} failing (${new Date().toISOString().slice(0, 16)}Z, ${Math.round((Date.now() - t0) / 1000)} s)`, '',
  `Base ${BASE}; sizes ${SIZES.map(([w, h]) => `${w}x${h}`).join(', ')}; scripts/checks/mobile-rules.mjs (ENTRY 239 B).`, '',
  '| rule | page types failing |', '|---|---|', ...Object.entries(byRule).map(([k, v]) => `| ${k} | ${v.size} |`), ''];
for (const r of failing) {
  lines.push(`## ${r.route} (${r.url})`);
  const grouped = {};
  for (const f of r.fails) (grouped[`${f.rule}: ${f.detail}`] ||= []).push(f.size);
  for (const [k, sizes] of Object.entries(grouped)) lines.push(`- ${k} [${sizes.join(', ')}]`);
  lines.push('');
}
fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 1));
console.log(`mobile rules: ${results.length} page types, ${failing.length} failing. Report: ${path.join(OUT, 'report.md')}`);
process.exit(failing.length && !REPORT_ONLY ? 1 : 0);
