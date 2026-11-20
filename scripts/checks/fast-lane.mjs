// The push fast lane (owner approved, Cowork ENTRY 404; rule: Claude outputs/audit/fastlane-404/RULE.md, with T2's
// changes in its section 7). Decides from the files a push changes against origin/main whether the push may take the
// fast check (build, then only the share images, the changed pages' share tags and A2/A3 on them) instead of the full
// one; the full checks then run against the live site straight after (scripts/checks/fast-lane-after.mjs).
//
// A push is in the fast lane only if EVERY changed file (git diff --name-status: added, changed, deleted, and both
// paths of a rename or copy) is one of:
//   share image routes   app/**/opengraph-image.tsx, app/**/twitter-image.tsx (not under app/api)
//   share image helpers  lib/og-card.tsx, lib/og/**, and only if every file that imports it, at ANY depth, is a share
//                        image route or another share image helper (lib/og/stamp.tsx -> lib/og-card.tsx -> routes)
//   share image assets   public/og/**, public/fonts/bebas-neue.ttf
//   static images        public/**/*.{png,jpg,jpeg,webp,gif,svg,ico}, only if the file's name appears nowhere in app/,
//                        lib/ or any .css file (T2: /resigned-stamp.png is a mask in DepartmentMasthead.tsx)
//   newsletter issues    public/newsletter/**
//   page text content    public/robots.txt (lib/council-byelections.ts is loader code: full check, T2 20 Nov 2026)
// and no commit message in base..head says "Layout change approved". Anything else: the full check, with the reason.
//
// Samples for the fast check: when a helper, asset or font changed, one page of EVERY share image kind (the default
// image on /, an editorial, an organisation, a bill, a council, /this-week, a briefing), each page being the first
// example of its page type in scripts/checks/mobile-audit-pages.csv (the page rendered-checks.mjs and the fast audit
// use, so A2 and A3 have its baseline); otherwise the changed routes' own pages. For lib/council-byelections.ts,
// /councils/<slug> for each council the diff names (else the audit's council page). Changed static files (images,
// newsletter files, robots.txt) are fetched as they are.
//
//   node scripts/checks/fast-lane.mjs --base origin/main --head <sha> [--json]
// prints 'FAST LANE: <n> files (<kinds>)' or 'FULL: <reason>'; exit 0 either way (2 if it could not run).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';


// The seven share image kinds and the page type each is sampled from.
export const SHARE_KINDS = [
  { kind: 'default', route: '/' },
  { kind: 'editorial', route: '/editorials/[slug]' },
  { kind: 'organisation', route: '/organisations/[slug]' },
  { kind: 'bill', route: '/bills/[id]' },
  { kind: 'council', route: '/councils/[slug]' },
  { kind: 'this week', route: '/this-week' },
  { kind: 'briefing', route: '/briefings/[slug]' },
];
// Used only when mobile-audit-pages.csv has no example (the same pages as its first examples on 19 Nov 2026).
const FALLBACK_EXAMPLES = {
  '/editorials/[slug]': '/editorials/upk2tz9zw9',
  '/organisations/[slug]': '/organisations/british-science-association',
  '/bills/[id]': '/bills/657',
  '/councils/[slug]': '/councils/derry-city-and-strabane',
  '/briefings/[slug]': '/briefings/920e6b2857',
};
const MAX_COUNCILS = 10;

export const KIND = {
  route: 'share image route',
  helper: 'share image helper',
  asset: 'share image asset',
  image: 'static image',
  newsletter: 'newsletter issue',
  byelections: 'by-election list',
  robots: 'robots.txt',
};

const STATIC_IMAGE = /^public\/.+\.(png|jpe?g|webp|gif|svg|ico)$/i;
export const isShareRoute = (f) => /^app\/(.+\/)?(opengraph-image|twitter-image)\.tsx$/.test(f) && !f.startsWith('app/api/');
export const isHelper = (f) => f === 'lib/og-card.tsx' || f.startsWith('lib/og/');

// The kind of a changed file, or null when it is not on the list (the file then forces the full check).
export function kindOf(f) {
  if (isShareRoute(f)) return KIND.route;
  if (isHelper(f)) return KIND.helper;
  if (f.startsWith('public/og/') || f === 'public/fonts/bebas-neue.ttf') return KIND.asset;
  if (f.startsWith('public/newsletter/')) return KIND.newsletter;
  // lib/council-byelections.ts is loader code reading the database, not a list (T2, 20 Nov 2026): it takes the full check.
  if (f === 'public/robots.txt') return KIND.robots;
  if (STATIC_IMAGE.test(f)) return KIND.image;
  return null;
}

// --- the import graph -------------------------------------------------------------------------------------------------
const CODE = /\.(ts|tsx|js|jsx|mjs)$/;
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx', '/index.mjs'];
// Every module specifier in a file: import ... from 'x', export ... from 'x', import 'x', import('x').
export function specifiers(src) {
  const out = [];
  for (const m of src.matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"\n]+)['"]/g)) out.push(m[1]);
  return out;
}
// A specifier resolved to a repository path ('@/' is the repository root; relative to the importing file), or null.
export function resolveSpecifier(from, spec, files) {
  let p;
  if (spec.startsWith('@/')) p = spec.slice(2);
  else if (spec.startsWith('./') || spec.startsWith('../')) p = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const e of EXTS) if (files.has(p + e)) return p + e;
  return null;
}
// importer lists: path -> Set of the files that import it directly.
export function importersOf(sources) {
  const files = new Set(sources.keys());
  const rev = new Map();
  for (const [f, src] of sources) {
    for (const s of specifiers(src)) {
      const t = resolveSpecifier(f, s, files);
      if (!t || t === f) continue;
      if (!rev.has(t)) rev.set(t, new Set());
      rev.get(t).add(f);
    }
  }
  return rev;
}
// Every file that imports f at any depth.
export function allImporters(f, rev) {
  const seen = new Set();
  const todo = [f];
  while (todo.length) {
    for (const i of rev.get(todo.pop()) ?? []) if (!seen.has(i)) { seen.add(i); todo.push(i); }
  }
  return [...seen].sort();
}

// --- the by-election list ---------------------------------------------------------------------------------------------
// The councils a diff of lib/council-byelections.ts names in its changed lines: a council slug ('flintshire') or its
// name ('Flintshire', 'Isles of Scilly').
export function councilsFromDiff(diff, slugs) {
  const changed = diff.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l)).map((l) => l.slice(1)).join('\n');
  const found = [];
  for (const s of slugs) {
    const words = s.split('-').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(?<![A-Za-z0-9-])(?:${words.join('-')}|${words.join('[ -]+')})(?![A-Za-z0-9-])`, 'i');
    if (re.test(changed)) found.push(s);
  }
  return found;
}

// --- samples ------------------------------------------------------------------------------------------------------------
// app/bills/[id]/opengraph-image.tsx -> { route: '/bills/[id]', image: 'opengraph-image' } (route groups dropped).
export function routeOfShareFile(f) {
  const parts = f.split('/').slice(1);
  const image = parts.pop().replace(/\.tsx$/, '');
  const segs = parts.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'));
  return { route: `/${segs.join('/')}`, image };
}
const imageUrl = (page, image) => `${page === '/' ? '' : page}/${image}`;

// --- the rule -----------------------------------------------------------------------------------------------------------
// repo: { changes(base, head) -> [{ status, paths }], messages(base, head) -> [string], sources(head) -> Map(path -> text)
//   of app/ and lib/ code, nameUsedIn(head, name) -> [paths in app/, lib/ or .css naming it], fileDiff(base, head, path)
//   -> unified diff text, councilSlugs(head) -> [slug], examplePage(head, route) -> url or null }
export function eligibility({ base = 'origin/main', head, repo = gitRepo() }) {
  const reasons = [];
  const changes = repo.changes(base, head);
  const files = [];
  const kinds = new Set();
  let graph = null;
  const rev = () => (graph ??= importersOf(repo.sources(head)));
  if (!changes.length) reasons.push('no changed files against the base');
  const msgs = repo.messages(base, head);
  if (msgs.some((m) => /Layout change approved/.test(m))) reasons.push(`a commit message in ${short(base)}..${short(head)} says "Layout change approved"`);
  let wide = false; // a helper, asset or font changed: every share image kind is sampled
  const pages = new Set(), imageRoutes = new Set(), staticFiles = new Set(), notes = [];
  for (const c of changes) {
    const deleted = c.status === 'D';
    for (const [k, p] of c.paths.entries()) {
      // the old path of a rename or copy is checked like a deletion
      const gone = deleted || (k === 0 && c.paths.length > 1 && c.status === 'R');
      const kind = kindOf(p);
      files.push({ status: c.status, path: p, kind });
      if (!kind) { reasons.push(gone ? `deletes ${p} (not a fast lane file)` : p); continue; }
      kinds.add(kind);
      if (kind === KIND.helper || kind === KIND.route) {
        if (gone) {
          if (kind === KIND.helper) { wide = true; continue; }
          // A deleted share image route changes which card its pages show (they fall back to a parent's): sample its
          // example page, whose og:image (the parent's card) checkSamples fetches too (T2, 20 Nov 2026).
          const { route } = routeOfShareFile(p);
          const page = route.includes('[') ? repo.examplePage(base, route) : route;
          if (!page) { reasons.push(`${p}: deleted, and no example page for ${route} in scripts/checks/mobile-audit-pages.csv`); continue; }
          pages.add(page); notes.push(`${p} deleted: sampled ${page} (its card now comes from a parent)`);
          continue;
        }
        const bad = allImporters(p, rev()).filter((i) => !isShareRoute(i) && !isHelper(i));
        if (bad.length) { reasons.push(`${p} is imported by ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ` and ${bad.length - 3} more` : ''} (not a share image route)`); continue; }
        if (kind === KIND.helper) { wide = true; continue; }
        const { route, image } = routeOfShareFile(p);
        const page = route.includes('[') ? repo.examplePage(head, route) : route;
        if (!page) { reasons.push(`${p}: no example page for ${route} in scripts/checks/mobile-audit-pages.csv`); continue; }
        pages.add(page); imageRoutes.add(imageUrl(page, image));
      } else if (kind === KIND.asset) wide = true;
      else if (kind === KIND.image) {
        const name = path.posix.basename(p);
        const used = repo.nameUsedIn(head, name);
        if (used.length) { reasons.push(`${p}: its name ${name} appears in ${used.slice(0, 3).join(', ')}${used.length > 3 ? ` and ${used.length - 3} more` : ''}`); continue; }
        if (!gone) staticFiles.add(p.slice('public'.length));
      } else if (kind === KIND.byelections) {
        if (gone) continue;
        const slugs = councilsFromDiff(repo.fileDiff(base, head, p), repo.councilSlugs(head));
        if (!slugs.length) {
          const dflt = repo.examplePage(head, '/councils/[slug]') ?? FALLBACK_EXAMPLES['/councils/[slug]'];
          notes.push(`${p}: the diff names no council; sampled ${dflt}`);
          pages.add(dflt);
        } else {
          if (slugs.length > MAX_COUNCILS) notes.push(`${p}: ${slugs.length} councils named; the first ${MAX_COUNCILS} sampled`);
          for (const s of slugs.slice(0, MAX_COUNCILS)) pages.add(`/councils/${s}`);
        }
      } else if (!gone) staticFiles.add(p.slice('public'.length)); // newsletter files, robots.txt
    }
  }
  if (wide) {
    for (const k of SHARE_KINDS) {
      const page = k.route.includes('[') ? (repo.examplePage(head, k.route) ?? FALLBACK_EXAMPLES[k.route]) : k.route;
      pages.add(page); imageRoutes.add(imageUrl(page, 'opengraph-image'));
    }
  }
  const fast = reasons.length === 0;
  return {
    fast,
    reasons: fast ? [] : [...new Set(reasons)],
    kinds: [...kinds],
    files,
    notes,
    samples: { imageRoutes: [...imageRoutes], pages: [...pages], staticFiles: [...staticFiles], everyKind: wide },
  };
}

export const summaryLine = (r) => (r.fast
  ? `FAST LANE: ${new Set(r.files.map((f) => f.path)).size} files (${r.kinds.join(', ')})`
  : `FULL: ${r.reasons.join('; ')}`);

const short = (s) => (/^[0-9a-f]{40}$/.test(s) ? s.slice(0, 8) : s);

// --- git -------------------------------------------------------------------------------------------------------------------
export function gitRepo(cwd = process.cwd()) {
  const git = (...a) => execFileSync('git', ['-c', 'core.quotePath=false', ...a], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const show = (head, p) => { try { return git('show', `${head}:${p}`); } catch { return null; } };
  let csv = null;
  return {
    changes(base, head) {
      return git('diff', '--name-status', '-M', `${base}`, `${head}`).split('\n').filter(Boolean).map((l) => {
        const [st, ...paths] = l.split('\t');
        return { status: st[0], paths };
      });
    },
    messages(base, head) {
      return git('log', '--format=%B%x00', `${base}..${head}`).split('\0').map((s) => s.trim()).filter(Boolean);
    },
    sources(head) {
      const list = git('ls-tree', '-r', '--name-only', head, '--', 'app', 'lib').split('\n').filter((f) => CODE.test(f));
      const out = new Map();
      // one git process for every file: cat-file --batch
      const input = list.map((f) => `${head}:${f}`).join('\n') + '\n';
      const buf = execFileSync('git', ['cat-file', '--batch'], { cwd, input, maxBuffer: 512 * 1024 * 1024 });
      let at = 0;
      for (const f of list) {
        const nl = buf.indexOf(10, at);
        const header = buf.subarray(at, nl).toString();
        const size = Number(header.split(' ')[2]);
        if (!Number.isFinite(size)) { at = nl + 1; continue; }
        out.set(f, buf.subarray(nl + 1, nl + 1 + size).toString('utf8'));
        at = nl + 1 + size + 1;
      }
      return out;
    },
    nameUsedIn(head, name) {
      try {
        // app/, lib/, every CSS file, the Next config, the proxy, and public data files that can name an image (manifests,
        // HTML, XML, JSON) (T2, 20 Nov 2026).
        return git('grep', '-l', '-F', '-e', name, head, '--', 'app', 'lib', ':(glob)**/*.css', 'next.config.ts', 'next.config.js', 'next.config.mjs', 'proxy.ts', 'middleware.ts', ':(glob)public/**/*.json', ':(glob)public/**/*.webmanifest', ':(glob)public/**/*.html', ':(glob)public/**/*.xml').split('\n').filter(Boolean).map((l) => l.replace(`${head}:`, ''));
      } catch { return []; } // git grep exits 1 when nothing matches
    },
    fileDiff(base, head, p) { return git('diff', '-U0', base, head, '--', p); },
    councilSlugs(head) {
      const s = new Set();
      const sql = show(head, 'scripts/migrations/2026-10-19o-council-leaders.sql') ?? '';
      for (const m of sql.matchAll(/^\s*\('([a-z0-9-]+)'/gm)) s.add(m[1]);
      const pages = show(head, 'scripts/checks/mobile-audit-pages.csv') ?? '';
      for (const m of pages.matchAll(/"\/councils\/([a-z0-9-]+)"/g)) if (!['search', 'blue-badges', 'children-in-care', 'child-poverty', 'free-school-meals', 'youth-justice', 'road-condition', 'hmos'].includes(m[1])) s.add(m[1]);
      return [...s];
    },
    examplePage(head, route) {
      csv ??= show(head, 'scripts/checks/mobile-audit-pages.csv') ?? '';
      for (const l of csv.split('\n')) {
        const m = /^"([^"]*)","([^"]*)"/.exec(l);
        if (m && m[1] === route) return m[2];
      }
      return null;
    },
  };
}

// --- the fast checks against a running build (or the live site) ---------------------------------------------------------
let lastHit = 0;
async function pace() { while (Date.now() < lastHit + 1000) await new Promise((r) => setTimeout(r, lastHit + 1000 - Date.now())); lastHit = Date.now(); }
export function pngSize(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 24 || sig.some((b, i) => buf[i] !== b) || buf.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
const metaContent = (html, attr, name) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if (new RegExp(`\\b${attr}=["']${name}["']`, 'i').test(tag)) { const c = /\bcontent=["']([^"']*)["']/i.exec(tag); if (c) return c[1].replace(/&amp;/g, '&'); }
  }
  return null;
};
// Each sample image answers 200 image/png, 1200 x 630; each sample page answers 200 with og:image and twitter:image,
// and its og:image answers the same way; each changed static file answers 200 (an image with an image/ type). One
// request a second (a local build reads the production database). Returns the failures (empty when all pass).
export async function checkSamples(base, samples, log = console.log) {
  base = base.replace(/\/$/, '');
  const fails = [];
  const get = async (u) => { await pace(); return fetch(base + u, { redirect: 'manual', signal: AbortSignal.timeout(90000) }); };
  const image = async (u, label) => {
    try {
      const r = await get(u);
      const type = r.headers.get('content-type') ?? '';
      const buf = Buffer.from(await r.arrayBuffer());
      const size = pngSize(buf);
      const ok = r.status === 200 && /^image\/png/.test(type) && size?.width === 1200 && size?.height === 630;
      log(`  ${ok ? 'ok' : 'FAIL'} image ${u}${label ? ` (${label})` : ''}: HTTP ${r.status}, ${type || 'no type'}${size ? `, ${size.width} x ${size.height}` : ''}`);
      if (!ok) fails.push(`image ${u}: HTTP ${r.status}, ${type || 'no type'}${size ? `, ${size.width} x ${size.height}` : ', not a PNG'} (want 200 image/png 1200 x 630)`);
    } catch (e) { fails.push(`image ${u}: ${e.message}`); log(`  FAIL image ${u}: ${e.message}`); }
  };
  for (const u of samples.imageRoutes ?? []) await image(u);
  for (const p of samples.pages ?? []) {
    try {
      const r = await get(p);
      const html = r.status === 200 ? await r.text() : '';
      const og = metaContent(html, 'property', 'og:image') ?? metaContent(html, 'name', 'og:image');
      const tw = metaContent(html, 'name', 'twitter:image') ?? metaContent(html, 'property', 'twitter:image');
      const ok = r.status === 200 && !!og && !!tw;
      log(`  ${ok ? 'ok' : 'FAIL'} page ${p}: HTTP ${r.status}; og:image ${og ?? 'missing'}; twitter:image ${tw ?? 'missing'}`);
      if (!ok) { fails.push(`page ${p}: HTTP ${r.status}${r.status === 200 ? `${og ? '' : ', no og:image'}${tw ? '' : ', no twitter:image'}` : ''}`); continue; }
      // The page's own og:image, on the server being checked (the tag names the live address).
      let x; try { x = new URL(og, base); } catch { x = null; }
      if (!x) fails.push(`page ${p}: og:image ${og} is not an address`);
      else if (!(samples.imageRoutes ?? []).includes(x.pathname)) await image(x.pathname + x.search, `og:image of ${p}`);
    } catch (e) { fails.push(`page ${p}: ${e.message}`); log(`  FAIL page ${p}: ${e.message}`); }
  }
  for (const f of samples.staticFiles ?? []) {
    try {
      const r = await get(f.split('/').map(encodeURIComponent).join('/'));
      await r.arrayBuffer();
      const type = r.headers.get('content-type') ?? '';
      const ok = r.status === 200 && (!STATIC_IMAGE.test(`public${f}`) || /^image\//.test(type));
      log(`  ${ok ? 'ok' : 'FAIL'} file ${f}: HTTP ${r.status}, ${type || 'no type'}`);
      if (!ok) fails.push(`file ${f}: HTTP ${r.status}, ${type || 'no type'}`);
    } catch (e) { fails.push(`file ${f}: ${e.message}`); log(`  FAIL file ${f}: ${e.message}`); }
  }
  return fails;
}

// --- CLI ------------------------------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  try {
    const head = arg('--head', 'HEAD');
    const r = eligibility({ base: arg('--base', 'origin/main'), head, repo: gitRepo(arg('--repo', process.cwd())) });
    console.log(summaryLine(r));
    if (argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
    else {
      for (const n of r.notes) console.log(`  note: ${n}`);
      if (r.fast) console.log(`  samples: ${JSON.stringify(r.samples)}`);
    }
  } catch (e) { console.error(`fast lane: could not decide: ${e.message.split('\n')[0]}`); process.exit(2); }
}
