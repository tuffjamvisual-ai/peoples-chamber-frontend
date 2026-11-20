// Ref tag click report (Cowork ENTRY 440): clicks through our own tagged links (?ref=x11) from public.ref_clicks
// (migration 2026-11-21g), per tag and per tag and page, and one STATUS line "REF CLICKS: x11 n, x10 n ...". Read only:
// one psql session, BEGIN READ ONLY with 60 s / 5 s timeouts, then ROLLBACK. Nothing is written anywhere.
//
//   node scripts/analytics/ref-report.mjs              all time
//   node scripts/analytics/ref-report.mjs --days 7     the last 7 days (to the start of this hour, UTC)
//   node scripts/analytics/ref-report.mjs --fixture f  format the JSON in file f (the query's output) instead
//   node scripts/analytics/ref-report.mjs --print-sql  print the query only
// DATABASE_URL from the environment or .env.local; it is never printed.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Clicks per tag and page, with the first and last hour seen. :days is a whole number or 0 for all time.
export function reportSql(days = 0) {
  const d = Number.isSafeInteger(days) && days > 0 ? days : 0;
  const where = d ? `WHERE hour >= date_trunc('hour', now()) - interval '${d} days'` : '';
  return `
SELECT coalesce(json_agg(json_build_object('ref', ref, 'path', path, 'n', n,
  'first', to_char(first AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24"Z"'), 'last', to_char(last AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24"Z"'))
  ORDER BY ref, n DESC, path), '[]'::json)
FROM (SELECT ref, path, sum(count)::int AS n, min(hour) AS first, max(hour) AS last FROM public.ref_clicks ${where} GROUP BY ref, path) t;`;
}

function readDb(days) {
  if (!process.env.DATABASE_URL) {
    try { for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^DATABASE_URL=(.*)$/); if (m) process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, ''); } } catch { /* none */ }
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (environment or .env.local)');
  const out = execFileSync('psql', [process.env.DATABASE_URL, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1',
    '-c', 'BEGIN READ ONLY', '-c', "SET LOCAL statement_timeout = '60s'", '-c', "SET LOCAL lock_timeout = '5s'",
    '-c', reportSql(days), '-c', 'ROLLBACK'], { encoding: 'utf8', maxBuffer: 16e6, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.trim().split('\n').filter(Boolean).pop());
}

// Tags by clicks, most first; x tags with the same count newest (highest number) first.
export function perTag(rows) {
  const m = new Map();
  for (const r of rows) m.set(r.ref, (m.get(r.ref) ?? 0) + r.n);
  const xNum = (t) => (/^x\d+$/.test(t) ? Number(t.slice(1)) : -1);
  return [...m].map(([ref, n]) => ({ ref, n })).sort((a, b) => b.n - a.n || xNum(b.ref) - xNum(a.ref) || a.ref.localeCompare(b.ref));
}

export function statusLine(rows) {
  const tags = perTag(rows);
  return `REF CLICKS: ${tags.length ? tags.map((t) => `${t.ref} ${t.n}`).join(', ') : 'none'}`;
}

export function toText(rows, days = 0) {
  const tags = perTag(rows);
  const total = tags.reduce((s, t) => s + t.n, 0);
  const lines = [`Ref tag clicks, ${days > 0 ? `last ${days} days` : 'all time'}: ${total}`, ''];
  for (const t of tags) {
    lines.push(`${t.ref}: ${t.n}`);
    for (const r of rows.filter((x) => x.ref === t.ref)) lines.push(`  ${String(r.n).padStart(6)}  ${r.path}  (${r.first} to ${r.last})`);
  }
  if (tags.length) lines.push('');
  lines.push(statusLine(rows));
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const days = args.includes('--days') ? Number(args[args.indexOf('--days') + 1]) : 0;
  if (args.includes('--days') && !(Number.isSafeInteger(days) && days > 0)) { console.error('--days takes a whole number from 1'); process.exit(1); }
  if (args.includes('--print-sql')) { console.log(reportSql(days).trim()); return; }
  const fixture = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null;
  const rows = fixture ? JSON.parse(fs.readFileSync(fixture, 'utf8')) : readDb(days);
  console.log(toText(rows, days));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { main(); } catch (e) { console.error(String(e?.message ?? e).replace(/postgres(ql)?:\/\/\S+/g, '[DATABASE_URL]')); process.exit(1); }
}
