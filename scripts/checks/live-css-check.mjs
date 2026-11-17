// Live CSS check (owner, 17 Nov 2026, COWORK-TO-T1 ENTRY 252): after a push is live, is the site's CSS the CSS of the
// commit? On 17 Nov 2026 Vercel restored its build cache and 7e076a50 went live with the HTML and JavaScript of the commit
// but the stylesheet of the commit before (the new .og-more-count rules missing), so lists showed a stray count on desktop.
// The CSS file names Vercel serves are its own build's, so they cannot be compared with a local build; instead every class
// name that the commit's shared stylesheets define must appear in the stylesheets the live pages load. Missing classes mean
// stale CSS: then redeploy once with the build cache off (vercel deploy --force --prod from a clean worktree of the commit)
// and run this again.
//
//   node scripts/checks/live-css-check.mjs [--base https://www.opengovt.uk] [--commit <sha>]
// Exit 0: every class is live. Exit 1: some are missing (listed). Exit 2: could not check. Reads only; a few requests, one a
// second. --commit reads the stylesheets from git at that commit (default: the files in this checkout).
import fs from 'fs';
import { execFileSync } from 'child_process';

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const BASE = (opt('base') ?? 'https://www.opengovt.uk').replace(/\/$/, '');
const COMMIT = opt('commit');
// The stylesheets every page or a common page loads, and a page that loads each.
const SHEETS = {
  'app/globals.css': '/',
  'app/components/opengov-shell.css': '/',
  'app/home-front.css': '/',
  'app/components/phone-table.css': '/donors',
};
const UA = { 'User-Agent': 'opengovt-check/1.0 (live CSS check)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const source = (file) => (COMMIT ? execFileSync('git', ['show', `${COMMIT}:${file}`], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8'));
// Class names in selectors: comments and declaration blocks removed first, so values such as url(x.y) do not count.
const classesOf = (css) => {
  const sel = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{[^{}]*\}/g, '{}').replace(/\{[^{}]*\}/g, '{}');
  return new Set([...sel.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((m) => m[1]));
};

let wanted;
try {
  wanted = Object.entries(SHEETS).map(([file, page]) => ({ file, page, classes: classesOf(source(file)) }));
} catch (e) { console.error(`live CSS check: could not read the stylesheets: ${e.message}`); process.exit(2); }

const liveByPage = new Map();
let last = 0;
async function get(url) {
  const wait = last + 1000 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();
  const res = await fetch(url, { headers: UA, cache: 'no-store' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}
try {
  for (const page of new Set(Object.values(SHEETS))) {
    const html = await get(`${BASE}${page}`);
    const hrefs = [...new Set([...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]))];
    if (!hrefs.length) throw new Error(`${page}: no stylesheet links`);
    let css = '';
    for (const h of hrefs) css += await get(`${BASE}${h}`);
    // Inline <style> blocks count too (a page's own styles).
    css += [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
    liveByPage.set(page, css);
  }
} catch (e) { console.error(`live CSS check: could not read the live site: ${e.message}`); process.exit(2); }

let missing = 0;
for (const { file, page, classes } of wanted) {
  const css = liveByPage.get(page);
  const gone = [...classes].filter((c) => !new RegExp(`\\.${c.replace(/[-]/g, '\\-')}(?![_a-zA-Z0-9-])`).test(css));
  if (gone.length) { missing += gone.length; console.log(`MISSING from the live CSS of ${page}: ${gone.length} classes of ${file}: ${gone.slice(0, 12).join(', ')}${gone.length > 12 ? ' ...' : ''}`); }
  else console.log(`ok   ${file}: all ${classes.size} classes live (${page})`);
}
console.log(missing ? `live CSS check: STALE (${missing} classes missing)${COMMIT ? ` for ${COMMIT.slice(0, 8)}` : ''}` : `live CSS check: ok${COMMIT ? ` for ${COMMIT.slice(0, 8)}` : ''}`);
process.exit(missing ? 1 : 0);
