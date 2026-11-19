// Every hub page is in the A to Z directory and the sitemap (owner approved 19 Nov 2026, Cowork ENTRY 363 item 3).
// A hub page: an app route with no dynamic segment ([id], [slug] ...) and no API path, that answers 200 and is not
// noindex. Each is requested from a running build (--base), and must appear in /directory (a link) and in /sitemap.xml
// (a <loc>). Gaps are listed; with --warn the check never fails (the first stage: warning, then failing once clean).
//   node scripts/checks/hub-coverage.mjs --base http://localhost:3197 [--warn] [--out <report.md>]
// Pages requested one after another (a local build reads the production database; at most about 1 a second here).
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const base = arg('--base');
const warn = process.argv.includes('--warn');
const out = arg('--out');

// Routes from app/: folders holding a page file, with no dynamic segment; route groups ((name)) leave the path.
export function hubRoutes(appDir = 'app') {
  const found = [];
  const walk = (dir, parts) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) {
        if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(e.name)) found.push('/' + parts.filter((p) => !/^\(.*\)$/.test(p)).join('/'));
        continue;
      }
      if (e.name.startsWith('[') || e.name.startsWith('_') || e.name.startsWith('@') || e.name === 'api' || e.name === 'node_modules') continue;
      walk(path.join(dir, e.name), [...parts, e.name]);
    }
  };
  walk(appDir, []);
  return [...new Set(found.map((r) => (r === '/' ? '/' : r.replace(/\/$/, ''))))].sort();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u) {
  const res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(120_000) });
  return { status: res.status, text: res.status === 200 ? await res.text() : '' };
}
const noindex = (html) => /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html) || /<meta[^>]+content="[^"]*noindex[^"]*"[^>]+name="robots"/i.test(html);
const norm = (h) => { try { const u = new URL(h, 'https://www.opengovt.uk'); return u.pathname.replace(/\/$/, '') || '/'; } catch { return null; } };

async function main() {
  if (!base) { console.error('usage: --base <url> [--warn] [--out <report.md>]'); process.exit(2); }
  const routes = hubRoutes();
  const dir = await get(`${base}/directory`);
  const dirLinks = new Set([...dir.text.matchAll(/href="([^"#?]*)/g)].map((m) => norm(m[1])).filter(Boolean));
  const sm = await get(`${base}/sitemap.xml`);
  const smLocs = new Set([...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => norm(m[1])).filter(Boolean));
  const gaps = [], skipped = [];
  for (const r of routes) {
    if (r === '/directory') continue;
    let res;
    try { res = await get(`${base}${r}`); } catch (e) { skipped.push(`${r} (${String(e.message).slice(0, 60)})`); continue; }
    await sleep(1000);
    if (res.status !== 200) { skipped.push(`${r} (${res.status})`); continue; }
    if (noindex(res.text)) { skipped.push(`${r} (noindex)`); continue; }
    const inDir = dirLinks.has(r), inSm = smLocs.has(r);
    if (!inDir || !inSm) gaps.push(`${r}: ${[!inDir && 'not in /directory', !inSm && 'not in /sitemap.xml'].filter(Boolean).join(', ')}`);
  }
  const lines = [`# Hub coverage (${new Date().toISOString().slice(0, 16)}), ${routes.length} static routes`, '', `## Gaps (${gaps.length})`, ...gaps.map((g) => `- ${g}`), '', `## Not hub pages here (${skipped.length})`, ...skipped.map((s) => `- ${s}`), ''];
  if (out) fs.writeFileSync(out, lines.join('\n'));
  console.log(`hub coverage: ${routes.length} static routes, ${gaps.length} gap(s)${gaps.length ? ': ' + gaps.slice(0, 12).join('; ') : ''}`);
  if (gaps.length && !warn) process.exit(1);
  if (gaps.length) console.log('hub coverage: WARNING ONLY, the push goes ahead');
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(`hub coverage: ${e.message}`); process.exit(warn ? 0 : 1); });
