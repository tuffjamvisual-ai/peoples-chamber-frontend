// Compare the site with editorials from the code (EDITORIALS_FROM_DB unset) and from the database copy
// (EDITORIALS_FROM_DB=1) (owner's approval, 29 Oct 2026, "go stage B"). Read only. Run by editorials-source-compare.sh,
// which builds and starts the site once in each mode; this file lists the pages, fetches them and compares them.
//   npx tsx scripts/checks/editorials-source-compare.ts pages                 the paths, one per line
//   npx tsx scripts/checks/editorials-source-compare.ts fetch <base> <dir>    saves each page to <dir>
//   npx tsx scripts/checks/editorials-source-compare.ts diff <dirA> <dirB>    compares, exit 0 when all identical
//   npx tsx scripts/checks/editorials-source-compare.ts content <dirA> <dirB> content check, exit 0 when every page passes
// The content check (owner's decision, 29 Oct 2026: head tag order and Next.js embedded data may differ) compares
// (a) the visible body text, whitespace collapsed, script, style and template contents left out; (b) the set of head
// tags, order ignored; (c) every application/ld+json block, parsed and deep compared; (d) the body's a href list in order.
// Pages: every editorial and its sources page, every briefing and its sources page, /reports, every topic, /,
// /feed.xml, /sitemap.xml, /bills/2937, two department pages and the MP page of every related member id.
// Normalised before comparing: build ids and asset hashes, timestamps, nonces and the feed's build date.

import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { editorials } from '../../lib/editorials/index';
import { topics } from '../../lib/topics';

function pages(): string[] {
  const list: string[] = [];
  const members = new Set<number>();
  for (const e of Object.values(editorials)) {
    const base = e.kind === 'briefing' ? 'briefings' : 'editorials';
    list.push(`/${base}/${e.slug}`, `/${base}/${e.slug}/sources`);
    for (const m of e.relatedMemberIds ?? []) members.add(m);
  }
  list.push('/reports', ...topics.map((t) => `/topics/${t.slug}`), '/', '/feed.xml', '/sitemap.xml', '/bills/2937',
    '/departments/work-pensions', '/departments/education', ...[...members].sort((a, b) => a - b).map((m) => `/mps/${m}`));
  return list;
}

const file = (path: string) => (path === '/' ? '_home' : path.replace(/^\//, '').replace(/\//g, '__')) + '.html';

function normalise(html: string): string {
  return html
    .replace(/\/_next\/static\/[^"'\s)\\]+/g, '/_next/static/X')
    .replace(/"buildId":"[^"]+"/g, '"buildId":"X"')
    .replace(/\\?"b\\?":\\?"[A-Za-z0-9_-]{10,}\\?"/g, '"b":"X"')
    .replace(/nonce="[^"]*"/g, 'nonce="X"')
    .replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/g, '<lastBuildDate>X</lastBuildDate>')
    .replace(/(en-GB )[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT/g, '$1BUILDDATE')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, 'TIMESTAMP');
}

async function fetchAll(base: string, dir: string) {
  mkdirSync(dir, { recursive: true });
  const list = pages();
  const times: number[] = [];
  let failed = 0;
  for (const p of list) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}${p}`, { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
      const body = `HTTP ${res.status}${res.headers.get('location') ? ` -> ${res.headers.get('location')}` : ''}\n${await res.text()}`;
      writeFileSync(join(dir, file(p)), body);
      if (res.status >= 500) failed++;
    } catch (e) {
      writeFileSync(join(dir, file(p)), `FETCH FAILED ${(e as Error).message}\n`);
      failed++;
    }
    times.push(Date.now() - t0);
  }
  const sorted = [...times].sort((a, b) => a - b);
  console.log(`fetched ${list.length} pages from ${base} into ${dir}; ${failed} failed; median ${sorted[Math.floor(sorted.length / 2)]} ms, slowest ${sorted[sorted.length - 1]} ms`);
}

function excerpt(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const cut = (s: string) => s.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ');
  return `at ${i}: off "${cut(a)}" | on "${cut(b)}"`;
}

function diff(dirA: string, dirB: string) {
  const list = pages();
  let same = 0;
  const differences: string[] = [];
  for (const p of list) {
    const fa = join(dirA, file(p)), fb = join(dirB, file(p));
    if (!existsSync(fa) || !existsSync(fb)) { differences.push(`${p}: missing in ${existsSync(fa) ? 'on' : 'off'} run`); continue; }
    const a = normalise(readFileSync(fa, 'utf8')), b = normalise(readFileSync(fb, 'utf8'));
    if (a === b) same++;
    else differences.push(`${p}: ${excerpt(a, b)}`);
  }
  console.log(`editorials source compare: ${list.length} pages compared, ${same} identical, ${differences.length} different`);
  for (const d of differences) console.log(`  ${d}`);
  const extra = readdirSync(dirA).length - list.length;
  if (extra) console.log(`  (${extra} other files in ${dirA})`);
  process.exit(differences.length ? 1 : 0);
}

type Content = { text: string; head: string[]; ld: string[]; links: string[] };

function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

function content(raw: string): Content {
  const status = raw.slice(0, raw.indexOf('\n'));
  const root = parse(raw.slice(raw.indexOf('\n') + 1), { comment: false, blockTextElements: { script: true, style: true, noscript: true, template: true } });
  const ld = root.querySelectorAll('script[type="application/ld+json"]').map((el) => {
    try { return canon(JSON.parse(el.textContent)); } catch { return `UNPARSED ${el.textContent.slice(0, 80)}`; }
  });
  const head = root.querySelector('head');
  const tags = (head?.querySelectorAll('title, meta, link') ?? []).map((el: HTMLElement) => {
    const t = el.tagName.toLowerCase();
    if (t === 'title') return `title ${el.textContent}`;
    if (t === 'meta') return `meta ${['name', 'property', 'charset', 'http-equiv', 'content'].map((k) => `${k}=${el.getAttribute(k) ?? ''}`).join(' ')}`;
    return `link ${['rel', 'href', 'type', 'title', 'as', 'media', 'hreflang'].map((k) => `${k}=${(k === 'href' ? normalise(el.getAttribute(k) ?? '') : el.getAttribute(k)) ?? ''}`).join(' ')}`;
  }).sort();
  const body = root.querySelector('body');
  for (const el of body?.querySelectorAll('script, style, template') ?? []) el.remove();
  const text = normalise(`${status} ${(body?.textContent ?? root.textContent).replace(/\s+/g, ' ').trim()}`);
  const links = (body?.querySelectorAll('a') ?? []).map((el) => el.getAttribute('href') ?? '');
  return { text, head: tags, ld, links };
}

function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const cut = (s: string) => s.slice(Math.max(0, i - 50), i + 70);
  return `at ${i}: off "${cut(a)}" | on "${cut(b)}"`;
}

function contentCheck(dirA: string, dirB: string) {
  const list = pages();
  const pass = { a: 0, b: 0, c: 0, d: 0 };
  const failures: string[] = [];
  for (const p of list) {
    const fa = join(dirA, file(p)), fb = join(dirB, file(p));
    if (!existsSync(fa) || !existsSync(fb)) { failures.push(`${p}: missing in ${existsSync(fa) ? 'on' : 'off'} run`); continue; }
    const A = content(readFileSync(fa, 'utf8')), B = content(readFileSync(fb, 'utf8'));
    if (A.text === B.text) pass.a++; else failures.push(`${p} (a) text ${firstDiff(A.text, B.text)}`);
    const ha = new Set(A.head), hb = new Set(B.head);
    const onlyA = A.head.filter((t) => !hb.has(t)), onlyB = B.head.filter((t) => !ha.has(t));
    if (!onlyA.length && !onlyB.length && A.head.length === B.head.length) pass.b++;
    else failures.push(`${p} (b) head: only off ${JSON.stringify(onlyA.slice(0, 2))}; only on ${JSON.stringify(onlyB.slice(0, 2))}; counts ${A.head.length}/${B.head.length}`);
    if (A.ld.length === B.ld.length && A.ld.every((x, i) => x === B.ld[i])) pass.c++;
    else failures.push(`${p} (c) ld+json: ${A.ld.length}/${B.ld.length} blocks; ${firstDiff(A.ld.join('|'), B.ld.join('|'))}`);
    if (A.links.join('\n') === B.links.join('\n')) pass.d++;
    else { const i = A.links.findIndex((h, k) => h !== B.links[k]); failures.push(`${p} (d) links: ${A.links.length}/${B.links.length}, first difference at ${i}: off ${A.links[i]} | on ${B.links[i]}`); }
  }
  console.log(`editorials content check: ${list.length} pages compared; (a) text ${pass.a}, (b) head ${pass.b}, (c) ld+json ${pass.c}, (d) links ${pass.d} pass`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(failures.length ? 1 : 0);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'pages') console.log(pages().join('\n'));
else if (cmd === 'fetch' && a && b) fetchAll(a, b);
else if (cmd === 'diff' && a && b) diff(a, b);
else if (cmd === 'content' && a && b) contentCheck(a, b);
else { console.error('usage: pages | fetch <base> <dir> | diff <dirA> <dirB> | content <dirA> <dirB>'); process.exit(1); }
