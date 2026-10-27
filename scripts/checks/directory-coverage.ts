// Keeps /directory complete (owner, 27 Oct 2026): lists every reader facing static page under app/ that the directory
// (lib/directory.ts) does not link to, and every directory link with no page behind it. Exits 1 if either list is not
// empty. Run: npx tsx scripts/checks/directory-coverage.ts
//
// A page is reader facing unless EXCLUDED below says why not. Pages with a [segment] are single records (an MP, a
// donor, a bill) and are not listed, except the index pages of dynamic routes named in DYNAMIC_INDEXES.
import fs from 'fs';
import path from 'path';
import { DIRECTORY } from '@/lib/directory';

const EXCLUDED: Record<string, string> = {
  '/account': 'account page', '/login': 'sign in', '/signup': 'sign up', '/reset-password': 'password reset',
  '/preferences': 'member preferences', '/admin/users': 'admin', '/internal/humaniser': 'internal tool',
  '/donate/thank-you': 'shown after paying', '/template': 'template', '/folder-bg': 'design test',
  '/blank-landing': 'demo', '/homepage-v2': 'demo', '/land101': 'demo', '/landing-demo': 'demo', '/landing-demo2': 'demo',
  '/landing-pca': 'demo', '/landing-preview': 'demo', '/landing1012': 'demo', '/mp121': 'demo', '/new2': 'demo',
  '/newpage': 'demo', '/newspaper-101': 'demo', '/newspaper-112': 'demo', '/newspaper-blank': 'demo',
  '/newspaper-demo': 'demo', '/newspaper-new1': 'demo', '/newspaper-preview': 'demo', '/preview': 'demo',
  '/preview-2': 'demo', '/preview-3': 'demo', '/preview-4': 'demo', '/preview-5': 'demo', '/preview-footer': 'demo',
  '/preview-home2': 'demo',
  '/council-tax': 'redirects to a report', '/polls/voting-intention': 'redirects to /polls',
  '/your-tax-pound': 'hidden (feature flag off)', '/budget-trade-offs': 'hidden (feature flag off)',
  '/councils/league-table': 'hidden (feature flag off) and noindex', '/your-area': 'noindex results page',
  '/tools/welfare/search': 'noindex results page',
};
// Index pages of dynamic routes that readers use: each must be in the directory.
const DYNAMIC_INDEXES = ['/transparency/ministers-meetings', '/transparency/hospitality', '/transparency/appgs', '/transparency/revolving-door',
  '/transparency/donations', '/transparency/contracts', '/sections/parliament', '/sections/local', '/sections/accountability', '/sections/vote'];

function routes(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) { if (e.name === 'page.tsx') out.push(base || '/'); continue; }
    if (e.name === 'api' || e.name.startsWith('_') || e.name.startsWith('.')) continue;
    const seg = /^\(.*\)$/.test(e.name) ? '' : `/${e.name}`; // route groups add no segment
    out.push(...routes(path.join(dir, e.name), base + seg));
  }
  return out;
}

const all = routes('app');
const statics = all.filter((r) => !r.includes('['));
const linked = new Set(DIRECTORY.map((e) => e.href.split(/[?#]/)[0]));
const missing = [...statics.filter((r) => !EXCLUDED[r]), ...DYNAMIC_INDEXES].filter((r) => !linked.has(r));
// Every directory link must have a page: a static route, or a dynamic one whose pattern matches.
const patterns = all.filter((r) => r.includes('[')).map((r) => new RegExp('^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '$'));
const dead = [...linked].filter((h) => !statics.includes(h) && !patterns.some((p) => p.test(h)));
const excludedLinked = [...linked].filter((h) => EXCLUDED[h]);

console.log(`${all.length} page routes; ${statics.length} static; ${Object.keys(EXCLUDED).length} excluded; directory: ${DIRECTORY.length} entries, ${linked.size} pages`);
for (const r of missing) console.log(`MISSING from the directory: ${r}`);
for (const r of dead) console.log(`NO PAGE for directory link: ${r}`);
for (const r of excludedLinked) console.log(`EXCLUDED page linked from the directory: ${r} (${EXCLUDED[r]})`);
if (missing.length || dead.length || excludedLinked.length) process.exit(1);
console.log('directory complete: every reader facing page is listed and every link has a page');
