#!/usr/bin/env node
// One off (owner, 3 Nov 2026): written questions skipped by the Parliament archive backfill. Until 3 Nov, a run that
// stopped part way through a batch saved its cursor past up to 19 questions it had read but not written. This finds
// the days that are short and fetches them again through the fixed code path.
//
//   node scripts/recover-written-question-days.js --check
//     Read only. For every day from 2024-07-04 to yesterday: Parliament's total of written questions tabled that day
//     (one list request a day, 0.6 s apart) against the count stored in parliament_written_questions (one query inside
//     BEGIN READ ONLY). Writes the short days to "Claude outputs/written-question-short-days.json".
//
//   node scripts/recover-written-question-days.js --refetch --base http://localhost:3100 [--max-minutes 9]
//     For each short day not yet done: GET {base}/api/sync-parliament-archive?source=questions&date=DAY&missing_only=1 on a local
//     server (next start; test options are refused on Vercel production). That runs runQuestions for the one day as a
//     top up with missing_only=1 (owner's choice, 3 Nov 2026): the day's list pages, then one request for each question
//     not already stored, at the route's 0.5 s gap, upserted by id; the backfill cursor is not touched.
//
//   npx tsx scripts/recover-written-question-days.js --refetch --direct [--max-minutes 9]
//     The same, calling the route's GET handler in this process (run under tsx) instead of a local server, so a build
//     can replace .next while it runs (owner, 3 Nov 2026: one background job). Same code path, same pace.
//
//   Either way, no new day starts after --max-minutes; run it again until it says done. Progress and the stored count
//   before and after each day go in the same JSON file.
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const { execFileSync } = require('child_process');

const OUT = 'Claude outputs/written-question-short-days.json';
const START = '2024-07-04';
const LIST = 'https://questions-statements-api.parliament.uk/api/writtenquestions/questions';
const UA = 'opengovt.uk parliament archive (https://www.opengovt.uk; contact@opengovt.uk)';
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : dflt; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Stored counts by day, read only (BEGIN READ ONLY inside the transaction, never a session setting).
function storedCounts(days) {
  const where = days ? `date_tabled = ANY(ARRAY[${days.map((d) => `'${d}'`).join(',')}]::date[])` : `date_tabled >= '${START}'`;
  const out = execFileSync('psql', [process.env.DATABASE_URL, '-X', '-A', '-t', '-F', '|', '-c', 'BEGIN READ ONLY',
    '-c', `SELECT date_tabled, count(*) FROM parliament_written_questions WHERE ${where} GROUP BY 1`, '-c', 'COMMIT'], { encoding: 'utf8' });
  const m = new Map();
  for (const line of out.split('\n')) { const [d, n] = line.split('|'); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) m.set(d, Number(n)); }
  return m;
}

async function parliamentTotal(day) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${LIST}?tabledWhenFrom=${day}&tabledWhenTo=${day}&take=1`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.ok) return (await res.json()).totalResults;
    if (res.status === 429 || res.status >= 500) { await sleep(30_000); continue; }
    throw new Error(`HTTP ${res.status} for ${day}`);
  }
  throw new Error(`no answer for ${day} after 3 tries`);
}

async function check() {
  const yesterday = addDays(new Date().toISOString().slice(0, 10), -1);
  const stored = storedCounts();
  const short = [];
  let days = 0, totalParliament = 0, totalStored = 0;
  for (let d = START; d <= yesterday; d = addDays(d, 1)) {
    const total = await parliamentTotal(d);
    const have = stored.get(d) ?? 0;
    days++; totalParliament += total; totalStored += Math.min(have, total);
    if (have < total) short.push({ day: d, parliament: total, stored: have, missing: total - have });
    if (days % 100 === 0) console.log(`${new Date().toISOString()} ${d}: ${days} days read, ${short.length} short`);
    await sleep(600);
  }
  const report = { checked_at: new Date().toISOString(), from: START, to: yesterday, days, parliament_total: totalParliament,
    stored_total: totalStored, short_days: short.length, missing: short.reduce((s, x) => s + x.missing, 0), short, done: {} };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.log(`checked ${days} days: ${short.length} short, ${report.missing} questions missing (${OUT})`);
}

async function refetch() {
  const direct = process.argv.includes('--direct');
  const base = direct ? 'http://localhost' : arg('--base');
  if (!direct && (!base || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))) throw new Error('--base must be a local server, e.g. http://localhost:3100, or use --direct');
  if (direct && process.env.VERCEL_ENV === 'production') throw new Error('--direct is for local runs only');
  // The route's own handler (test options are honoured off Vercel production only). Outside Next.js, 'server-only'
  // (imported by the server clients) resolves to the empty module Next.js itself uses on the server.
  if (direct) {
    const Module = require('module');
    const resolve = Module._resolveFilename;
    const empty = require.resolve('next/dist/compiled/server-only/empty.js');
    Module._resolveFilename = function (request, ...rest) { return request === 'server-only' ? empty : resolve.call(this, request, ...rest); };
  }
  const routeModule = direct ? await import('../app/api/sync-parliament-archive/route.ts') : null;
  const handler = routeModule ? (routeModule.GET ?? (routeModule.default && routeModule.default.GET)) : null;
  if (direct && typeof handler !== 'function') throw new Error('route GET handler not found');
  const call = (url, init) => (direct ? handler(new Request(url, init)) : fetch(url, init));
  const maxMs = Number(arg('--max-minutes', '9')) * 60_000;
  const started = Date.now();
  const report = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  report.done = report.done || {};
  const todo = report.short.filter((s) => !report.done[s.day]);
  console.log(`${todo.length} short days left`);
  for (const s of todo) {
    if (Date.now() - started > maxMs) break;
    const before = storedCounts([s.day]).get(s.day) ?? 0;
    // The whole day in one call: ?budget_ms lifts the route's 216 s run limit for this local test only.
    const t = Date.now();
    const res = await call(`${base}/api/sync-parliament-archive?source=questions&date=${s.day}&missing_only=1&budget_ms=1500000`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const body = await res.json().catch(() => ({}));
    const result = body.results && body.results.questions;
    const after = storedCounts([s.day]).get(s.day) ?? 0;
    console.log(`${s.day}: HTTP ${res.status} ${result}, ${body.requests} requests, stored ${before} -> ${after} of ${s.parliament} (${Math.round((Date.now() - t) / 1000)} s)`);
    if (res.status !== 200 || result !== 'done') { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); throw new Error(`${s.day} not done (${result}); run again later`); }
    report.done[s.day] = { before, after, parliament: s.parliament, at: new Date().toISOString() };
    fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  }
  const left = report.short.filter((s) => !report.done[s.day]).length;
  const recovered = Object.values(report.done).reduce((n, d) => n + (d.after - d.before), 0);
  console.log(left ? `${left} short days left: run again` : 'done', `| recovered so far: ${recovered}`);
}

(process.argv.includes('--check') ? check() : process.argv.includes('--refetch') ? refetch() : Promise.reject(new Error('--check or --refetch')))
  .catch((e) => { console.error(`recover-written-question-days: ${e.message}`); process.exit(1); });
