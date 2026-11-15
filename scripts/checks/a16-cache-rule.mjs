// A16: no page rebuilds unless its data changed (owner rule, 15 Nov 2026, DECISIONS.md; COWORK-TO-T1 ENTRY 129).
// Every page and layout under app/ (not app/api) must:
//   - not set a numeric `export const revalidate` (pages use revalidate = false and refresh only by tag);
//   - not be `dynamic = 'force-dynamic'`;
//   - read the database only through the shared data cache under a source tag: inside unstable_cache(..., { tags }),
//     mpCached / mpCachedCount (tags mp:<id>, mp-pages), or a timedClient(seconds, [tags]) client. A plain read
//     (supabase.from / .rpc outside those) is flagged, and so is pageDb() (a timer on four pages, plain elsewhere).
// Routes on the exceptions list (scripts/checks/a16-exceptions.json; adding one needs the owner's approval in the commit
// message: "A16 exception approved") are not checked. Routes on the baseline (scripts/checks/a16-baseline.json, the to-do
// list of 15 Nov 2026) are reported but do not fail the push; the list only shrinks.
//
// How reads are traced (static, by name): from each page or layout file, the functions it imports and calls, and the
// functions those call, across app/ and lib/; a database read inside one of those functions counts unless it sits in a
// cached span, or in a function called only from cached spans. Approximate by design (names, not types): it errs
// towards flagging; a wrong flag is fixed by caching the read, or, if the read really is cached, by naming the helper
// in CACHED_HELPERS below.
//
//   node scripts/checks/a16-cache-rule.mjs                 the working tree: report and exit 1 on a new problem
//   node scripts/checks/a16-cache-rule.mjs --sha <commit>   that commit's files (the pre-push hook)
//   node scripts/checks/a16-cache-rule.mjs --list           print every flagged route with its reasons (the to-do list)
//   node scripts/checks/a16-cache-rule.mjs --write-baseline (owner approved, ENTRY 129: the starting list)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const SHA = opt('--sha');
const ROOT = process.cwd();
const EXC_FILE = 'scripts/checks/a16-exceptions.json';
const BASE_FILE = 'scripts/checks/a16-baseline.json';
const CACHED_HELPERS = ['unstable_cache', 'mpCached', 'mpCachedCount', 'tagged', 'cachedQuery']; // tagged(), cachedQuery(): lib/tagged-read.ts

// Files, from the commit (--sha) or the working tree.
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const list = SHA
  ? git('ls-tree', '-r', '--name-only', SHA, '--', 'app', 'lib').split('\n').filter(Boolean)
  : walk('app').concat(walk('lib'));
function walk(d) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...walk(p)); } else out.push(p);
  }
  return out;
}
const read = (f) => (SHA ? git('show', `${SHA}:${f}`) : fs.readFileSync(path.join(ROOT, f), 'utf8'));
const readJson = (f, d) => { try { return JSON.parse(read(f)); } catch { return d; } };
const code = list.filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts') && !f.startsWith('app/api/'));
const src = new Map(code.map((f) => [f, read(f)]));

// Text scanning: blank out comments and string contents (keeping offsets) so brackets and names can be found safely.
function strip(t) {
  const o = t.split('');
  let i = 0;
  const blank = (a, b) => { for (let k = a; k < b; k++) if (o[k] !== '\n') o[k] = ' '; };
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (c === '/' && n === '/') { const e = t.indexOf('\n', i); const end = e < 0 ? t.length : e; blank(i, end); i = end; continue; }
    if (c === '/' && n === '*') { const e = t.indexOf('*/', i + 2); const end = e < 0 ? t.length : e + 2; blank(i, end); i = end; continue; }
    if (c === '"' || c === "'") { let k = i + 1; while (k < t.length && t[k] !== c && t[k] !== '\n') k += t[k] === '\\' ? 2 : 1; blank(i + 1, k); i = k + 1; continue; }
    if (c === '`') { let k = i + 1; while (k < t.length && t[k] !== '`') { if (t[k] === '\\') { k += 2; continue; } if (t[k] === '$' && t[k + 1] === '{') { let d = 1; k += 2; while (k < t.length && d) { if (t[k] === '{') d++; else if (t[k] === '}') d--; k++; } continue; } o[k] = o[k] === '\n' ? '\n' : ' '; k++; } i = k + 1; continue; }
    i++;
  }
  return o.join('');
}
// The '{' that opens a function body after its parameter list ends at `pe`, skipping a return type such as
// Promise<{ a: string }> or { a: string } (an object type right after ':').
function bodyStart(s, pe) {
  let k = pe + 1, depth = 0, inType = false;
  while (k < s.length && /\s/.test(s[k])) k++;
  if (s[k] === ':') { inType = true; k++; }
  for (; k < s.length; k++) {
    const c = s[k];
    if (c === '<' || c === '(' || c === '[') depth++;
    else if ((c === '>' && s[k - 1] !== '=') || c === ')' || c === ']') depth--;
    else if (c === '{') {
      if (depth > 0) { k = matchClose(s, k); continue; }
      const prev = s.slice(0, k).trimEnd().slice(-1);
      if (inType && /[:|&,]/.test(prev)) { k = matchClose(s, k); continue; }
      return k;
    }
  }
  return -1;
}
function matchClose(s, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const want = pairs[s[open]]; let d = 0;
  for (let k = open; k < s.length; k++) { if (s[k] === s[open]) d++; else if (s[k] === want && --d === 0) return k; }
  return s.length - 1;
}
const lineOf = (t, i) => t.slice(0, i).split('\n').length;

// Per file: function bodies by name, cached spans, read sites, imports.
const info = new Map();
for (const [f, raw] of src) {
  const s = strip(raw);
  const isClient = /^\s*['"]use client['"]/m.test(raw.slice(0, 200));
  const fns = new Map(); // name -> [start, end]
  for (const m of s.matchAll(/(?:^|[^\w$.])(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*(?:<[^>(]*>)?\s*\(/g)) {
    const p = s.indexOf('(', m.index + m[0].length - 1); const pe = matchClose(s, p); const b = bodyStart(s, pe); if (b < 0) continue;
    fns.set(m[1], [m.index, matchClose(s, b)]);
  }
  for (const m of s.matchAll(/(?:^|[^\w$.])(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*/g)) {
    let k = m.index + m[0].length;
    // the value: an arrow function, or a call such as unstable_cache(...)/cache(...)
    let end;
    const rest = s.slice(k, k + 400);
    const call = /^(?:await\s+)?[A-Za-z_$][\w$.]*\s*(?:<[^>(]*>)?\s*\(/.exec(rest);
    if (call) { const p = k + call[0].length - 1; end = matchClose(s, p); }
    else if (/^(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=>/.test(rest) || /^(?:async\s*)?\(/.test(rest)) {
      const arrow = s.indexOf('=>', k); if (arrow < 0) continue;
      let b = arrow + 2; while (/\s/.test(s[b])) b++;
      end = s[b] === '{' || s[b] === '(' ? matchClose(s, b) : s.indexOf(';', b);
    } else continue;
    if (end > k) fns.set(m[1], [m.index, end]);
  }
  // cached spans: calls of a cache helper; for unstable_cache only when the call passes tags.
  const cachedSpans = [];
  const cachedNames = new Set();
  for (const h of CACHED_HELPERS) {
    for (const m of s.matchAll(new RegExp(`(?:^|[^\\w$.])${h}\\s*(?:<[^>(]*>)?\\s*\\(`, 'g'))) {
      const p = s.indexOf('(', m.index + m[0].length - 1); const e = matchClose(s, p);
      const callRaw = raw.slice(p, e + 1);
      if (h === 'unstable_cache' && !/\btags\s*:/.test(s.slice(p, e + 1))) {
        // options passed as a constant: const OPTS = { revalidate, tags: [...] }
        const last = /,\s*([A-Za-z_$][\w$]*)\s*\)\s*$/.exec(s.slice(p, e + 1))?.[1];
        const def = last && new RegExp(`(?:const|let)\\s+${last}\\s*(?::[^=]+)?=\\s*\\{[^}]*\\btags\\s*:`).test(s);
        if (!def) continue;
      }
      cachedSpans.push([p, e]);
      const first = /^\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(s.slice(p, e + 1)); if (first) cachedNames.add(first[1]);
      void callRaw;
    }
  }
  // timedClient(seconds, [tags]).from(...) or a const holding one: tagged.
  const taggedClients = new Set();
  for (const m of s.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*timedClient\s*\(([^)]*)\)/g)) if (m[2].includes(',')) taggedClients.add(m[1]);
  // read sites
  const reads = [];
  for (const m of s.matchAll(/\.(from|rpc)\s*\(/g)) {
    const before = s.slice(Math.max(0, m.index - 200), m.index);
    if (/storage\s*$/.test(before) || /Array\s*$/.test(before) || /\bBuffer\s*$/.test(before)) continue;
    // a database read: the call's first argument is a string (blanked by strip, so check the raw text)
    const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 3);
    if (!/^\s*['"`]/.test(after)) continue;
    const recv = /([A-Za-z_$][\w$]*(?:\([^()]*(?:\([^()]*\)[^()]*)*\))?)\s*$/.exec(before.replace(/\s+$/, ''))?.[1] ?? '';
    const tagged = (/^timedClient\(/.test(recv) && recv.includes(',')) || taggedClients.has(recv.split('(')[0]);
    const viaPageDb = /^pageDb\(/.test(recv);
    reads.push({ at: m.index, line: lineOf(raw, m.index), what: `${m[1]}(${raw.slice(m.index + m[0].length).match(/^\s*['"`]([^'"`]+)/)?.[1] ?? '?'})`, tagged, viaPageDb });
  }
  // imports: name -> module file
  const imports = new Map();
  for (const m of raw.matchAll(/import\s+(?:type\s+)?([^'";]+?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (/^import\s+type\b/.test(m[0])) continue;
    const target = resolve(f, m[2]); if (!target) continue;
    const names = [];
    const def = /^([A-Za-z_$][\w$]*)/.exec(m[1].trim()); if (def && !m[1].trim().startsWith('{')) names.push([def[1], 'default']);
    const br = /\{([^}]*)\}/.exec(m[1]); if (br) for (const part of br[1].split(',')) { const [a, b] = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/); if (a) names.push([b || a, a]); }
    for (const [local, orig] of names) imports.set(local, { file: target, name: orig });
  }
  info.set(f, { raw, s, isClient, fns, cachedSpans, cachedNames, reads, imports });
}
function resolve(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = spec.slice(2);
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (src.has(c)) return c;
  return null;
}
const inSpan = (spans, i) => spans.some(([a, b]) => i >= a && i <= b);
const fnAt = (fi, i) => { let best = null; for (const [n, [a, b]] of fi.fns) if (i >= a && i <= b && (!best || a > best[1])) best = [n, a]; return best?.[0] ?? null; };
const calledNames = (s, a, b) => new Set([...s.slice(a, b + 1).matchAll(/([A-Za-z_$][\w$]*)\s*(?:<[^>(]*>)?\s*\(/g)].map((m) => m[1]));
const calledAt = (s, a, b) => { const seen = new Map(); for (const m of s.slice(a, b + 1).matchAll(/([A-Za-z_$][\w$]*)\s*(?:<[^>(]*>)?\s*\(/g)) { const at = a + m.index; const prev = seen.get(m[1]); seen.set(m[1], prev === undefined ? at : prev); } return [...seen]; };
const exportDefault = (fi) => /export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(fi.s)?.[1];

// Is a function (file, name) cached: inside a cached span of its own file, or passed by name to a cached helper.
function fnCached(file, name) { const fi = info.get(file); if (!fi) return false; if (fi.cachedNames.has(name)) return true; const r = fi.fns.get(name); return r ? inSpan(fi.cachedSpans, r[0]) : false; }

// Walk from a page: every function reachable by calls; a read is a problem unless covered.
function pageProblems(file) {
  const fi0 = info.get(file);
  const problems = [];
  const seen = new Set();
  const queue = [];
  const push = (f, n, covered) => { const k = `${f}#${n}#${covered}`; if (seen.has(k)) return; seen.add(k); queue.push([f, n, covered]); };
  // the page file itself: everything in it is reachable (default export, generateMetadata, generateStaticParams, helpers)
  push(file, '*', false);
  while (queue.length) {
    const [f, n, coveredIn] = queue.shift();
    const fi = info.get(f); if (!fi || fi.isClient) continue;
    let a = 0, b = fi.s.length - 1;
    if (n !== '*') { const r = fi.fns.get(n); if (!r) continue; [a, b] = r; }
    const covered = coveredIn || (n !== '*' && fnCached(f, n));
    for (const r of fi.reads) {
      if (r.at < a || r.at > b) continue;
      if (n === '*' && fnAt(fi, r.at) && fnAt(fi, r.at) !== null) {
        // in the page file, a read inside a named function is judged when that function is reached; reads at top level here
      }
      const ok = covered || r.tagged || inSpan(fi.cachedSpans, r.at) || (fnAt(fi, r.at) && fnCached(f, fnAt(fi, r.at)));
      if (!ok) problems.push(`${r.viaPageDb ? 'pageDb read (timer, not tag)' : 'read outside the tagged cache'}: ${r.what} at ${f}:${r.line}`);
    }
    // follow calls
    for (const [name, at] of calledAt(fi.s, a, b)) {
      const callCovered = covered || inSpan(fi.cachedSpans, at); // a call made inside a cached span is cached
      if (fi.fns.has(name) && !(n !== '*' && name === n)) { if (n !== '*') push(f, name, callCovered || fnCached(f, name)); }
      const imp = fi.imports.get(name);
      if (imp) push(imp.file, imp.name === 'default' ? (exportDefault(info.get(imp.file) || {}) || 'default') : imp.name, callCovered || fnCached(imp.file, imp.name));
    }
    // JSX components used: <Name ... />
    for (const m of fi.s.slice(a, b + 1).matchAll(/<([A-Z][\w$]*)[\s/>]/g)) {
      const imp = fi.imports.get(m[1]);
      if (imp) push(imp.file, imp.name === 'default' ? (exportDefault(info.get(imp.file) || {}) || 'default') : imp.name, covered);
      else if (fi.fns.has(m[1]) && n !== '*') push(f, m[1], covered);
    }
  }
  void fi0;
  return [...new Set(problems)];
}

const routeOf = (f) => '/' + f.replace(/^app\//, '').replace(/\/?(page|layout)\.tsx$/, '').replace(/\([^)]*\)\/?/g, '');
const pages = code.filter((f) => /^app\/(.*\/)?(page|layout)\.tsx$/.test(f));
const exc = readJson(EXC_FILE, { routes: [] });
const isExcepted = (r) => exc.routes.some((e) => r === e.route || (e.route.endsWith('/*') && r.startsWith(e.route.slice(0, -2))));
const results = [];
for (const f of pages) {
  const fi = info.get(f);
  const route = routeOf(f) || '/';
  const kind = f.endsWith('layout.tsx') ? 'layout' : 'page';
  const reasons = [];
  const rv = /export\s+const\s+revalidate\s*=\s*([0-9_]+)/.exec(fi.s.replace(/ +/g, ' ')) || /export\s+const\s+revalidate\s*=\s*([0-9_]+)/.exec(fi.raw);
  if (rv) reasons.push(`revalidate = ${rv[1]}`);
  if (/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(fi.raw)) reasons.push('force-dynamic');
  reasons.push(...pageProblems(f));
  results.push({ route, kind, file: f, excepted: isExcepted(route), reasons });
}
const flagged = results.filter((r) => !r.excepted && r.reasons.length);
const key = (r) => `${r.kind} ${r.route}`;

if (args.includes('--write-baseline')) {
  fs.writeFileSync(path.join(ROOT, BASE_FILE), JSON.stringify({ _note: 'A16 to-do list (COWORK-TO-T1 ENTRY 129, 15 Nov 2026): routes flagged when the check started. It only shrinks: remove a route once it passes.', routes: flagged.map(key).sort() }, null, 1) + '\n');
  console.log(`A16 baseline written: ${flagged.length} routes`);
  process.exit(0);
}
if (args.includes('--list')) {
  for (const r of flagged.sort((a, b) => a.route.localeCompare(b.route))) console.log(`${key(r)} (${r.file})\n  - ${r.reasons.join('\n  - ')}`);
  console.log(`\nA16: ${results.length} pages and layouts; ${results.filter((r) => r.excepted).length} on the exceptions list; ${flagged.length} flagged.`);
  process.exit(0);
}
const base = new Set(readJson(BASE_FILE, { routes: [] }).routes);
const fresh = flagged.filter((r) => !base.has(key(r)));
const fixed = [...base].filter((k) => !flagged.some((r) => key(r) === k));
console.log(`A16 (no rebuild unless data changed): ${results.length} pages and layouts, ${flagged.length} flagged (${flagged.length - fresh.length} on the to-do list), ${fresh.length} new.`);
if (fixed.length) console.log(`A16: now passing, remove from ${BASE_FILE}: ${fixed.join(', ')}`);
if (fresh.length) {
  for (const r of fresh) console.error(`A16 ${key(r)} (${r.file}):\n  - ${r.reasons.join('\n  - ')}`);
  console.error(`Push refused by A16: a page or layout above sets a revalidate timer, is force-dynamic, or reads the database outside the tagged data cache. Cache the read with its source tag, or (owner approval only) add the route to ${EXC_FILE} with "A16 exception approved" in the commit message.`);
  process.exit(1);
}
