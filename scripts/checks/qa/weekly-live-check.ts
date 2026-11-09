// QA1 Part B (owner approved, 9 Nov 2026): the weekly live check. Run by .github/workflows/weekly-live-check.yml on
// Mondays, or by hand: npx tsx --tsconfig tsconfig.json scripts/checks/qa/weekly-live-check.ts [--base https://www.opengovt.uk]
//   [--previous <last run's json>] [--out-dir audit/qa]
// Reads only. At most 50 live requests (MAX_REQUESTS): sample pages and a few of their internal links, one request a
// second, user agent "opengovt site check". When SITE_CHECK_TOKEN is set it is sent as the x-opengovt-site-check header,
// for a firewall bypass rule matched on that header (the site's bot protection answers this agent with a 429
// challenge; the rule is the owner's to add, see audit/qa notes). For each page: status code, height at 375px as it
// first opens, internal links that fail, "Updated <date>" lines older than the page's data cadence
// (lib/data-freshness.ts), time relative words in our wording, and for bills and divisions the link to Parliament's
// record. It also runs the bill status data rule (scripts/checks/qa/bill-status-data.ts) when database keys are set.
// Writes <out-dir>/weekly-<date>.md and .json. Exit 1 only for problems not in the previous run's json (new problems),
// or when the site could not be checked at all.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { visibleText, timeWords } from './rendered-checks.mjs';

const argv = process.argv.slice(2);
const arg = (k: string, d: string | null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg('--base', 'https://www.opengovt.uk') as string).replace(/\/$/, '');
const PREVIOUS = arg('--previous', null);
const OUT_DIR = arg('--out-dir', 'audit/qa') as string;
const MAX_REQUESTS = 50;
const SAMPLE_PAGES = 38; // the rest of the 50 go on internal link checks
const LIMIT_PX = 2500;
const UA = 'opengovt site check';
const HEADERS: Record<string, string> = { 'User-Agent': UA, ...(process.env.SITE_CHECK_TOKEN ? { 'x-opengovt-site-check': process.env.SITE_CHECK_TOKEN } : {}) };
const ROOT = path.join(__dirname, '..', '..', '..');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

type PageResult = { route: string; url: string; status: number | null; challenged: boolean; height: number | null; problems: string[] };

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
  }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}

// The pages: the fast list's page types (one example each), bills and divisions first so they are always in.
function sample(): { route: string; url: string }[] {
  const all = parseCsv(fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-pages.csv'), 'utf8')).map((r) => ({ route: r.route, url: r.example_url }));
  const first = new Map<string, { route: string; url: string }>();
  for (const p of all) if (!first.has(p.route)) first.set(p.route, p);
  const types = fs.readFileSync(path.join(ROOT, 'scripts/checks/mobile-audit-fast.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const must = all.filter((p) => p.route === '/bills/[id]' || p.route === '/divisions/[slug]').slice(0, 4);
  const rest = types.map((t) => first.get(t) ?? all.find((p) => p.url === t)).filter((p): p is { route: string; url: string } => !!p);
  return [...new Map([...must, ...rest].map((p) => [p.url, p])).values()].slice(0, SAMPLE_PAGES);
}

// The most lenient cadence of the data a page shows, in days (a page such as a council's shows several sources and an
// "Updated" line cannot be tied to its source from the HTML, so only a date older than all of them is a problem), or null if none is listed. Read from the text of
// lib/data-freshness.ts (one source per line: cadence and page), because that module needs the Next.js server to load.
// CADENCE_MAX_AGE_DAYS there: keep these in step.
const MAX_AGE: Record<string, number> = { daily: 2, weekly: 9, monthly: 35, quarterly: 100, annual: 400 };
const PAGE_CADENCES: { page: string; cadence: string }[] = fs.readFileSync(path.join(ROOT, 'lib/data-freshness.ts'), 'utf8').split('\n')
  .map((l) => ({ cadence: /cadence: '(\w+)'/.exec(l)?.[1], page: /page: '([^']+)'/.exec(l)?.[1] }))
  .filter((x): x is { page: string; cadence: string } => !!x.cadence && !!x.page);
function maxAgeDays(route: string): number | null {
  const ages = PAGE_CADENCES.filter((s) => s.page === route).map((s) => MAX_AGE[s.cadence]).filter((n) => n != null);
  return ages.length ? Math.max(...ages) : null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function updatedDates(html: string): Date[] {
  const out: Date[] = [];
  for (const m of html.matchAll(/class="og-record-date"[^>]*>\s*Updated (\d{1,2}) ([A-Za-z]+) (\d{4})/g)) {
    const mo = MONTHS.indexOf(m[2].toLowerCase());
    if (mo >= 0) out.push(new Date(Date.UTC(Number(m[3]), mo, Number(m[1]))));
  }
  return out;
}

async function get(url: string, method = 'GET'): Promise<Response> {
  requests++;
  const res = await fetch(url, { method, headers: HEADERS, redirect: 'manual', signal: AbortSignal.timeout(45000) });
  await sleep(1000);
  return res;
}

async function main(): Promise<number> {
  const pages = sample();
  const results: PageResult[] = [];
  const internal = new Set<string>();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, userAgent: UA, extraHTTPHeaders: process.env.SITE_CHECK_TOKEN ? { 'x-opengovt-site-check': process.env.SITE_CHECK_TOKEN } : {} });
  // Only the page itself is loaded from the site; its scripts and styles come from the CDN cache. Analytics are blocked.
  await ctx.route('**/*', (r) => (/posthog|vercel-insights|_vercel\/(insights|speed)/.test(r.request().url()) ? r.abort() : r.continue()));
  const tab = await ctx.newPage();

  for (const p of pages) {
    if (requests >= MAX_REQUESTS) break;
    const r: PageResult = { route: p.route, url: p.url, status: null, challenged: false, height: null, problems: [] };
    try {
      const res = await get(BASE + p.url);
      r.status = res.status;
      r.challenged = res.headers.get('x-vercel-mitigated') === 'challenge';
      if (r.challenged) { results.push(r); continue; }
      if (res.status >= 400) r.problems.push(`HTTP ${res.status}`);
      const html = res.status === 200 ? await res.text() : '';
      if (html) {
        for (const w of timeWords(visibleText(html))) r.problems.push(`time word ${w}`);
        const max = maxAgeDays(p.route);
        if (max != null) for (const d of updatedDates(html)) {
          const age = Math.floor((Date.now() - d.getTime()) / 86400000);
          if (age > max) r.problems.push(`"Updated ${d.toISOString().slice(0, 10)}" is ${age} days old, over ${max} for this page's data`);
        }
        if (p.route === '/bills/[id]' && !/href="https:\/\/bills\.parliament\.uk\/bills\/\d+"/.test(html)) r.problems.push('no link to the bill on bills.parliament.uk');
        if (p.route === '/divisions/[slug]' && !/href="https:\/\/votes\.parliament\.uk\/Votes\/(Commons|Lords)\/Division\/\d+"/.test(html)) r.problems.push('no link to the division on votes.parliament.uk');
        for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) if (!/^\/(_next|api|ingest)\//.test(m[1])) internal.add(m[1]);
        await tab.goto(BASE + p.url, { waitUntil: 'load', timeout: 60000 });
        r.height = await tab.evaluate(() => Math.round(document.documentElement.scrollHeight));
        if (r.height > LIMIT_PX) r.problems.push(`${r.height}px tall at 375px, over ${LIMIT_PX}px`);
      }
    } catch (e) { r.problems.push(`could not load: ${(e as Error).message.split('\n')[0]}`); }
    results.push(r);
  }
  await browser.close();

  // Internal links: as many as the request budget leaves, chosen evenly from what the pages link to.
  const linkProblems: string[] = [];
  const sampled = new Set(pages.map((p) => p.url));
  const links = [...internal].filter((u) => !sampled.has(u)).sort();
  const room = Math.max(0, MAX_REQUESTS - requests);
  const step = links.length > room && room > 0 ? links.length / room : 1;
  for (let i = 0; i < links.length && requests < MAX_REQUESTS; i += step) {
    const u = links[Math.floor(i)];
    try { const res = await get(BASE + u, 'HEAD'); if (res.status >= 400 && res.status !== 405 && res.status !== 410) linkProblems.push(`${u}: HTTP ${res.status}`); } catch (e) { linkProblems.push(`${u}: ${(e as Error).message.split('\n')[0]}`); }
  }

  // The bill status data rule, when the database keys are present (read only).
  let billStatus: string | null = null;
  if (process.env.SUPABASE_SECRET_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try { billStatus = execFileSync('npx', ['tsx', '--tsconfig', 'tsconfig.json', 'scripts/checks/qa/bill-status-data.ts'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
    catch (e) { billStatus = String((e as { stdout?: string }).stdout ?? (e as Error).message).trim(); }
  }

  const challenged = results.filter((r) => r.challenged).length;
  const problems = [...new Set([
    ...results.flatMap((r) => r.problems.map((x) => `${r.url}: ${x}`)),
    ...linkProblems.map((x) => `link ${x}`),
    ...(billStatus && / [1-9]\d* list a stage/.test(billStatus) ? billStatus.split('\n').slice(1).map((l) => `bill status: ${l.trim()}`) : []),
  ])];
  const prev: string[] = PREVIOUS && fs.existsSync(PREVIOUS) ? JSON.parse(fs.readFileSync(PREVIOUS, 'utf8')).problems ?? [] : [];
  // A problem is the same one next week when its text matches apart from numbers (heights and ages move).
  const norm = (s: string) => s.replace(/\d+/g, '#');
  const seen = new Set(prev.map(norm));
  const fresh = PREVIOUS ? problems.filter((x) => !seen.has(norm(x))) : [];
  const date = new Date().toISOString().slice(0, 10);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const json = { date, base: BASE, requests, pages: results.length, challenged, problems, new_problems: fresh, bill_status: billStatus, results };
  fs.writeFileSync(path.join(OUT_DIR, `weekly-${date}.json`), JSON.stringify(json, null, 1));
  const md = [
    `# Weekly live check, ${date}`, '',
    `${BASE}: ${results.length} pages and ${requests - results.length} internal links checked (${requests} requests, one a second, "${UA}").`, '',
    challenged ? `**Blocked:** ${challenged} of ${results.length} pages answered 429 with x-vercel-mitigated: challenge (Vercel bot protection). Add the bypass rule for this check's header, or the results below are incomplete.` : 'No page was challenged by bot protection.', '',
    `## New since the last run (${fresh.length})`, '', ...(PREVIOUS ? (fresh.length ? fresh.map((x) => `- ${x}`) : ['None.']) : ['No previous run to compare with: this run is the baseline.']), '',
    `## All problems (${problems.length})`, '', ...(problems.length ? problems.map((x) => `- ${x}`) : ['None.']), '',
    '## Pages', '', '| Page | Status | Height at 375px | Problems |', '|---|---|---|---|',
    ...results.map((r) => `| ${r.url} | ${r.challenged ? '429 challenge' : r.status} | ${r.height ?? ''} | ${r.problems.length} |`), '',
    `Bill status data rule: ${billStatus ?? 'not run (no database keys)'}`, '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, `weekly-${date}.md`), md);
  console.log(`weekly live check: ${results.length} pages, ${requests} requests, ${challenged} challenged, ${problems.length} problems, ${fresh.length} new`);
  if (challenged === results.length) { console.error('weekly live check: every page was challenged by bot protection; nothing was checked'); return 1; }
  return fresh.length ? 1 : 0;
}

main().then((c) => process.exit(c), (e) => { console.error(`weekly live check could not run: ${(e as Error).message}`); process.exit(1); });
