// Weekly summary of the search term log for the owner (Cowork ENTRY 375 item 2): the last 7 days of public.search_terms
// (migration 2026-11-19c), per box the 20 most searched terms with their counts, and the 20 most searched terms that
// found nothing. Read only: one psql session, BEGIN READ ONLY with 60 s / 5 s timeouts, then ROLLBACK.
//
//   node scripts/search-terms-weekly.mjs              print the summary as Markdown
//   node scripts/search-terms-weekly.mjs --status     also append one line per box (and one for no results) to STATUS.md
//   node scripts/search-terms-weekly.mjs --fixture f  format the JSON in file f (the query's output) instead of reading
//                                                     the database (to check the formatting)
//   node scripts/search-terms-weekly.mjs --print-sql  print the query only
// DATABASE_URL from the environment or .env.local; it is never printed.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const STATUS_FILE = '/Volumes/EDGE_SSD/opengovt-work/Claude outputs/STATUS.md';
export const BOX_ORDER = ['site', 'home-site', 'councils', 'home-council', 'pmqs', 'home-pmqs', 'mps', 'home-mp'];

// The last 7 days to the start of this hour (UTC). One JSON object: total, per box searches, top 20 per box, top 20 with
// no results (with the boxes they were typed in).
export const WEEK_SQL = `
WITH w AS (
  SELECT box, term, results FROM public.search_terms
  WHERE at_hour >= date_trunc('hour', now()) - interval '7 days'
), t AS (
  SELECT box, term, count(*) AS n, row_number() OVER (PARTITION BY box ORDER BY count(*) DESC, term) AS r
  FROM w GROUP BY box, term
), z AS (
  SELECT term, count(*) AS n, array_agg(DISTINCT box ORDER BY box) AS boxes
  FROM w WHERE results = 0 GROUP BY term ORDER BY count(*) DESC, term LIMIT 20
)
SELECT json_build_object(
  'from', to_char((date_trunc('hour', now()) - interval '7 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'to', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'total', (SELECT count(*) FROM w),
  'zeroTotal', (SELECT count(*) FROM w WHERE results = 0),
  'boxes', (SELECT coalesce(json_agg(json_build_object('box', box, 'searches', s) ORDER BY box), '[]'::json)
            FROM (SELECT box, count(*) AS s FROM w GROUP BY box) b),
  'top', (SELECT coalesce(json_agg(json_build_object('box', box, 'term', term, 'n', n) ORDER BY box, r), '[]'::json)
          FROM t WHERE r <= 20),
  'zero', (SELECT coalesce(json_agg(json_build_object('term', term, 'n', n, 'boxes', boxes) ORDER BY n DESC, term), '[]'::json)
           FROM z)
);`;

function readDb() {
  if (!process.env.DATABASE_URL) {
    try { for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^DATABASE_URL=(.*)$/); if (m) process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, ''); } } catch { /* none */ }
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (environment or .env.local)');
  const out = execFileSync('psql', [process.env.DATABASE_URL, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1',
    '-c', 'BEGIN READ ONLY', '-c', "SET LOCAL statement_timeout = '60s'", '-c', "SET LOCAL lock_timeout = '5s'",
    '-c', WEEK_SQL, '-c', 'ROLLBACK'], { encoding: 'utf8', maxBuffer: 16e6, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.trim().split('\n').filter(Boolean).pop());
}

const searches = (n) => `${n} ${n === 1 ? 'search' : 'searches'}`;
const md = (s) => String(s).replace(/([\\`*_[\]|<>])/g, '\\$1');
const byBox = (data) => {
  const m = new Map();
  for (const r of data.top ?? []) { if (!m.has(r.box)) m.set(r.box, []); m.get(r.box).push(r); }
  return m;
};
const ordered = (data) => {
  const seen = (data.boxes ?? []).map((b) => b.box);
  return [...BOX_ORDER.filter((b) => seen.includes(b)), ...seen.filter((b) => !BOX_ORDER.includes(b))];
};

export function toMarkdown(data) {
  const lines = [`# Search terms, ${data.from.slice(0, 10)} to ${data.to.slice(0, 10)}`, '',
    `${searches(data.total)}, ${data.zeroTotal} with no results.`, ''];
  const top = byBox(data);
  const count = new Map((data.boxes ?? []).map((b) => [b.box, b.searches]));
  for (const box of ordered(data)) {
    lines.push(`## ${box} (${searches(count.get(box))})`, '', '| # | Term | Searches |', '|---|---|---|');
    (top.get(box) ?? []).forEach((r, i) => lines.push(`| ${i + 1} | ${md(r.term)} | ${r.n} |`));
    lines.push('');
  }
  lines.push('## No results (top 20)', '');
  if (!(data.zero ?? []).length) lines.push('None.', '');
  else {
    lines.push('| # | Term | Searches | Boxes |', '|---|---|---|---|');
    data.zero.forEach((r, i) => lines.push(`| ${i + 1} | ${md(r.term)} | ${r.n} | ${r.boxes.join(', ')} |`));
    lines.push('');
  }
  return lines.join('\n');
}

// UK time as STATUS.md writes it: "19 Nov 2026 19:18 GMT" (BST in summer).
export function ukStamp(d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' })
    .formatToParts(d).map((p) => [p.type, p.value]));
  const zone = parts.timeZoneName === 'GMT' ? 'GMT' : 'BST';
  return `${parts.day} ${parts.month} ${parts.year} ${parts.hour}:${parts.minute} ${zone}`;
}

// One compact line per box (its top 5) and one for the searches with no results (top 5).
export function statusLines(data, now = new Date()) {
  const stamp = ukStamp(now);
  const prefix = `${stamp} T1 SEARCH TERMS WEEK`;
  const top = byBox(data);
  const count = new Map((data.boxes ?? []).map((b) => [b.box, b.searches]));
  const flat = (s) => String(s).replace(/[\r\n]+/g, ' ');
  const out = ordered(data).map((box) => `${prefix} ${box}: ${searches(count.get(box))}; top ${(top.get(box) ?? []).slice(0, 5).map((r) => `"${flat(r.term)}" ${r.n}`).join(', ')}.`);
  if (!out.length) out.push(`${prefix}: no searches logged ${data.from.slice(0, 10)} to ${data.to.slice(0, 10)}.`);
  out.push(`${prefix} no results: ${searches(data.zeroTotal)}; top ${(data.zero ?? []).slice(0, 5).map((r) => `"${flat(r.term)}" ${r.n}`).join(', ') || 'none'}.`);
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--print-sql')) { console.log(WEEK_SQL.trim()); return; }
  const fixture = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null;
  const data = fixture ? JSON.parse(fs.readFileSync(fixture, 'utf8')) : readDb();
  console.log(toMarkdown(data));
  if (args.includes('--status')) {
    if (fixture) { console.error('--status is not used with --fixture'); process.exit(1); }
    const lines = statusLines(data);
    fs.appendFileSync(STATUS_FILE, lines.join('\n') + '\n');
    console.log(`Appended ${lines.length} lines to STATUS.md`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => { console.error(String(e?.message ?? e).replace(/postgres(ql)?:\/\/\S+/g, '[DATABASE_URL]')); process.exit(1); });
}
