// T1-VR (Cowork, 12 Nov 2026): which pages the push-time picture comparison loads. The ten most visited pages always,
// plus one example page of every page type whose code the push changes: a changed file reaches a page type when the
// type's page file imports it, directly or through other files (app and lib, '@/' and relative imports), or when it is
// a layout, template, loading or not-found file above that page. A push that reaches more page types than fit in the
// time (a shared component, globals.css or the root layout reach every page) takes the most visited of them (the order
// of mobile-audit-fast.txt, by page views) and lists the rest as left to the nightly run of the full sample.
import fs from 'fs';
import path from 'path';

// Cowork, 12 Nov 2026: the ten most visited pages, compared on every push that changes page code.
export const TOP_PAGES = ['/', '/search', '/mps', '/expenses', '/transparency/special-advisers', '/edms', '/civil-service', '/councils', '/reports', '/departments'];
// Page types besides the top ten, at most (about 12 s a page: the ten and 12 more keep the comparison under 5 minutes).
export const MAX_CHANGED_TYPES = 12;

const EXT = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.css'];
const SPECIAL = /^(layout|template|loading|not-found|error|default)\.(tsx|ts|jsx|js)$/;
const PAGE = /^page\.(tsx|ts|jsx|js|mdx)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.includes(path.extname(e.name)) || PAGE.test(e.name)) out.push(p);
  }
  return out;
}

function resolve(root, from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(root, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base, ...EXT.map((x) => base + x), ...EXT.map((x) => path.join(base, 'index' + x))]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

// '/mps/[id]' from app/mps/[id]/page.tsx; route groups '(x)' and slots '@x' are not part of the address.
export function routeOf(rel) {
  const segs = path.dirname(rel).split(path.sep).slice(1).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'));
  return '/' + segs.join('/');
}

// Page types (routes) that the changed files (paths relative to root) reach.
export function routesReached(root, changed) {
  const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'lib'))];
  const importers = new Map(); // file -> files that import it
  const IMPORT = /(?:import|export)\s[^'";]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const f of files) {
    if (path.extname(f) === '.css') continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(IMPORT)) {
      const t = resolve(root, f, m[1] || m[2] || m[3] || m[4]);
      if (!t) continue;
      if (!importers.has(t)) importers.set(t, new Set());
      importers.get(t).add(f);
    }
  }
  const pages = files.filter((f) => PAGE.test(path.basename(f)) && path.relative(root, f).startsWith('app' + path.sep) && !path.relative(root, f).startsWith(path.join('app', 'api') + path.sep));
  const reached = new Set();
  const seen = new Set();
  const queue = changed.map((c) => path.join(root, c));
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    const rel = path.relative(root, f);
    const name = path.basename(f);
    if (PAGE.test(name) && rel.startsWith('app' + path.sep)) reached.add(routeOf(rel));
    // A layout (or template, loading, error, not-found) wraps every page below its folder.
    if (SPECIAL.test(name) && rel.startsWith('app' + path.sep)) {
      const dir = path.dirname(f) + path.sep;
      for (const p of pages) if (p.startsWith(dir)) reached.add(routeOf(path.relative(root, p)));
    }
    for (const i of importers.get(f) ?? []) queue.push(i);
  }
  return [...reached].filter((r) => !r.startsWith('/api'));
}

// The pages to load: the top ten, then an example of each reached page type (most visited first), at most
// MAX_CHANGED_TYPES; examples from mobile-audit-pages.csv.
export function pushPages(root, changed, parseCsv) {
  const rows = parseCsv(fs.readFileSync(path.join(root, 'scripts/checks/mobile-audit-pages.csv'), 'utf8'));
  const example = new Map();
  for (const r of rows) if (!example.has(r.route)) example.set(r.route, r.example_url);
  const visits = fs.readFileSync(path.join(root, 'scripts/checks/mobile-audit-fast.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const rank = (r) => { const i = visits.indexOf(r); return i < 0 ? 1e6 : i; };
  const top = TOP_PAGES.map((u) => ({ route: rows.find((r) => r.example_url === u)?.route ?? u, url: u, top: true }));
  const reached = routesReached(root, changed).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const extra = [], left = [], noExample = [];
  for (const r of reached) {
    const url = example.get(r);
    if (!url) { noExample.push(r); continue; }
    if (top.some((t) => t.url === url || t.route === r)) continue;
    if (extra.length < MAX_CHANGED_TYPES) extra.push({ route: r, url, changed: true });
    else left.push(r);
  }
  return { list: [...top, ...extra], reached, left, noExample };
}
