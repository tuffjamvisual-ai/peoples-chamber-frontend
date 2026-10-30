#!/usr/bin/env node
// Council byelections since May 2026 (owner's approval of the design, 30 Oct 2026), into council_byelections
// (migration 2026-10-30e-council-byelections.sql). Shown on /councils/[slug] under the seats.
//
// Reads the two research files (never retyped):
//   "Claude outputs/data/councils/byelections-since-may-2026-gains.json" and "...-holds.json"
// and loads only items with status "confirmed_council" or "winner_only_council" ("not_confirmed" is left out).
//
// Each council name is matched to the councils table exactly: the table's short_name, or its name without the
// trailing " Council" (case and the "&"/"and" spelling ignored), or a fixed mapping in ALIASES (owner's approval,
// 30 Oct 2026). Nothing is guessed: if any council is not matched, the script lists them and stops without writing.
// EXCLUDE leaves out polls the page already shows elsewhere. Joint runners up are read from the item's note
// ("Runners up tied on 21: A (party) and B (party)") into joint_runners_up.
//
// DRY RUN BY DEFAULT: prints the rows per council and writes nothing.
//   --write         upserts every row in one psql transaction (60 s statement and 5 s lock timeouts), keyed on
//                   (council_slug, ward_name, poll_date), so a rerun changes nothing; then refreshes the affected
//                   /councils/<slug> pages through scripts/revalidate.js
//   --sql=file.sql  also writes the upsert statement (no BEGIN or COMMIT) to file.sql, for a rehearsal inside
//                   BEGIN ... ROLLBACK
//   --dir=folder    where the two files are (default "Claude outputs/data/councils")
//   --leave-out-unmatched  for a dry run or --sql rehearsal only (refused with --write): lists the unmatched
//                   councils, then carries on without their rows
// DATABASE_URL comes from .env.local and is never printed.

'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: `${__dirname}/../.env.local`, quiet: true });
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).slice(n.length + 3);
const WRITE = process.argv.includes('--write');
const SQL = arg('sql');
const DIR = arg('dir', path.join(__dirname, '..', 'Claude outputs', 'data', 'councils'));
const FILES = ['byelections-since-may-2026-gains.json', 'byelections-since-may-2026-holds.json'];
const LOAD = new Set(['confirmed_council', 'winner_only_council']);
// Fixed name mappings (owner's approval, 30 Oct 2026): the research file's name -> councils.slug.
const ALIASES = { 'Newcastle upon Tyne': 'newcastle' };
// Left out (owner's approval, 30 Oct 2026): Bradford's postponed Idle & Thackley poll already shows under "Last election".
const EXCLUDE = new Set(['Bradford|Idle & Thackley|2026-06-18']);
const LEAVE_OUT = process.argv.includes('--leave-out-unmatched');
const fail = (m) => { console.error(m); process.exit(1); };
if (WRITE && LEAVE_OUT) fail('--leave-out-unmatched is for a rehearsal only, not with --write.');
const db = () => (process.env.DATABASE_URL || fail('DATABASE_URL is not set in .env.local.')).trim();
const psql = (sql) => {
  const r = spawnSync('psql', [db(), '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', '-f', '-'], { input: sql, encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = ((r.stdout || '') + (r.stderr || '')).replace(/postgres(ql)?:\/\/\S+/gi, '[url]');
  if (r.status !== 0) fail(`psql failed:\n${out}`);
  return r.stdout;
};

// The research files.
const items = [];
let checkedOn = null;
for (const f of FILES) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  if (!Array.isArray(j.items)) fail(`${f}: no "items" list`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(j.checked_on || '')) fail(`${f}: checked_on must be YYYY-MM-DD`);
  checkedOn = checkedOn && checkedOn > j.checked_on ? checkedOn : j.checked_on;
  for (const x of j.items) items.push({ ...x, checked_on: j.checked_on, file: f });
}
let rows = items.filter((x) => LOAD.has(x.status));
const left = items.length - rows.length;
const excluded = rows.filter((x) => EXCLUDE.has(`${x.council}|${x.ward}|${x.poll_date}`));
if (excluded.length !== EXCLUDE.size) fail(`EXCLUDE: found ${excluded.length} of ${EXCLUDE.size} polls in the files; check the list.`);
rows = rows.filter((x) => !excluded.includes(x));

// Joint runners up, from the note: "Runners up tied on 21: A (party) and B (party)".
const TIED = /^Runners up tied on (\d+): (.+?) \((.+?)\) and (.+?) \((.+?)\)$/;
for (const x of rows) {
  const m = TIED.exec(x.notes || '');
  x.joint_runners_up = null;
  if (!m) continue;
  if (x.runner_up_name != null || Number(m[1]) !== x.runner_up_votes) fail(`${x.council}, ${x.ward}: the tied note does not agree with runner_up_name or runner_up_votes`);
  x.joint_runners_up = JSON.stringify([{ name: m[2], party: m[3] }, { name: m[4], party: m[5] }]);
}

// Checks the table would refuse anyway, made here so a dry run shows them.
const problems = [];
const seen = new Set();
for (const x of rows) {
  const at = `${x.file}: ${x.council}, ${x.ward}, ${x.poll_date}`;
  if (!x.council || !x.ward || !x.winner_name) problems.push(`${at}: council, ward and winner_name are required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.poll_date || '')) problems.push(`${at}: poll_date must be YYYY-MM-DD`);
  if (!/^https:\/\//.test(x.declaration_url || '')) problems.push(`${at}: declaration_url must start https://`);
  if (!['by-election', 'postponed_ordinary'].includes(x.kind)) problems.push(`${at}: kind "${x.kind}"`);
  if (x.former_party_source != null && !['council', 'secondary'].includes(x.former_party_source)) problems.push(`${at}: former_party_source "${x.former_party_source}"`);
  for (const k of ['winner_votes', 'runner_up_votes']) if (x[k] != null && !(Number.isInteger(x[k]) && x[k] >= 0)) problems.push(`${at}: ${k} ${x[k]}`);
  if (x.turnout_pct != null && !(typeof x.turnout_pct === 'number' && x.turnout_pct >= 0 && x.turnout_pct <= 100)) problems.push(`${at}: turnout_pct ${x.turnout_pct}`);
  const key = `${x.council}|${x.ward}|${x.poll_date}`;
  if (seen.has(key)) problems.push(`${at}: appears twice`);
  seen.add(key);
}
if (problems.length) fail(`Stopped, nothing written:\n  ${problems.join('\n  ')}`);

// Councils, exact match only.
const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
const councils = psql("SET statement_timeout = '60s';\nSELECT slug || '|' || name || '|' || coalesce(short_name, '') FROM public.councils;")
  .trim().split('\n').filter(Boolean).map((l) => { const [slug, name, short] = l.split('|'); return { slug, name, short }; });
const byName = new Map();
for (const c of councils) {
  for (const n of new Set([c.short, c.name.replace(/ Council$/, '')].filter(Boolean).map(norm))) {
    if (!byName.has(n)) byName.set(n, new Set());
    byName.get(n).add(c.slug);
  }
}
const slugOf = new Map();
const unmatched = [];
for (const name of [...new Set(rows.map((x) => x.council))].sort()) {
  if (ALIASES[name]) {
    if (!councils.some((c) => c.slug === ALIASES[name])) fail(`ALIASES: ${ALIASES[name]} is not in the councils table`);
    slugOf.set(name, ALIASES[name]);
    continue;
  }
  const hits = byName.get(norm(name));
  if (hits && hits.size === 1) slugOf.set(name, [...hits][0]);
  else unmatched.push(hits ? `${name} (more than one council: ${[...hits].join(', ')})` : name);
}

// Report.
const per = new Map();
for (const x of rows) per.set(x.council, (per.get(x.council) || 0) + 1);
console.log(`${items.length} items read, ${rows.length} to load (${rows.filter((x) => x.status === 'winner_only_council').length} winner only), ${left} not confirmed left out, ${excluded.length} excluded (${excluded.map((x) => `${x.council}, ${x.ward}`).join('; ')}).`);
for (const x of rows) if (x.joint_runners_up) console.log(`Joint runners up, ${x.council}, ${x.ward}: ${x.joint_runners_up}`);
console.log(`${per.size} councils:`);
for (const [name, n] of [...per].sort((a, b) => a[0].localeCompare(b[0]))) console.log(`  ${(slugOf.get(name) || 'UNMATCHED').padEnd(32)} ${String(n).padStart(2)}  ${name}`);
if (unmatched.length && !LEAVE_OUT) fail(`\nStopped, nothing written: ${unmatched.length} council name(s) not matched to the councils table:\n  ${unmatched.join('\n  ')}`);
if (unmatched.length) {
  console.log(`\nNot matched, left out of this rehearsal: ${unmatched.join('; ')}`);
  rows = rows.filter((x) => slugOf.has(x.council));
  console.log(`${rows.length} rows in this rehearsal.`);
} else console.log('Every council matched.');

// The upsert.
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const COLS = ['council_slug', 'ward_name', 'poll_date', 'kind', 'winner_name', 'winner_party', 'winner_votes', 'runner_up_name', 'runner_up_party', 'runner_up_votes', 'turnout_pct', 'declaration_url', 'former_councillor', 'former_party_at_vacancy', 'former_party_source', 'vacancy_reason', 'joint_runners_up', 'notes', 'status', 'checked_on'];
const values = rows.map((x) => `(${[slugOf.get(x.council), x.ward, x.poll_date, x.kind, x.winner_name, x.winner_party, x.winner_votes, x.runner_up_name, x.runner_up_party, x.runner_up_votes, x.turnout_pct, x.declaration_url, x.former_councillor, x.former_party_at_vacancy, x.former_party_source, x.vacancy_reason, x.joint_runners_up, x.notes, x.status, x.checked_on].map(q).join(', ')})`);
const upsert = `INSERT INTO public.council_byelections (${COLS.join(', ')}) VALUES\n${values.join(',\n')}\n`
  + `ON CONFLICT (council_slug, ward_name, poll_date) DO UPDATE SET ${COLS.slice(3).map((c) => `${c} = EXCLUDED.${c}`).join(', ')}\n`
  + `WHERE (${COLS.slice(3).map((c) => `council_byelections.${c}`).join(', ')}) IS DISTINCT FROM (${COLS.slice(3).map((c) => `EXCLUDED.${c}`).join(', ')});\n`;

// What a write would change, against the rows already saved (none before migration 2026-10-30e is applied).
const saved = new Map();
const exists = psql("SET statement_timeout = '60s';\nSELECT to_regclass('public.council_byelections') IS NOT NULL;").trim().split('\n').pop() === 't';
if (exists) {
  const json = psql(`SET statement_timeout = '60s';\nSELECT coalesce(json_agg(json_build_object(${COLS.map((c) => `'${c}', ${c}`).join(', ')})), '[]') FROM public.council_byelections;`).trim().split('\n').pop();
  for (const r of JSON.parse(json)) saved.set(`${r.council_slug}|${r.ward_name}|${r.poll_date}`, r);
}
const same = (a, b, c) => (c === 'joint_runners_up' ? JSON.stringify(a == null ? null : JSON.parse(a)) === JSON.stringify(b ?? null)
  : c === 'turnout_pct' ? (a == null ? null : Number(a)) === (b == null ? null : Number(b)) : (a ?? null) === (b ?? null));
let added = 0, changed = 0;
for (const x of rows) {
  const r = saved.get(`${slugOf.get(x.council)}|${x.ward}|${x.poll_date}`);
  if (!r) { added++; continue; }
  const x2 = { ...x, council_slug: slugOf.get(x.council), ward_name: x.ward };
  const diff = COLS.filter((c) => !same(x2[c], r[c], c));
  if (diff.length) { changed++; console.log(`Changed, ${x.council}, ${x.ward}: ${diff.join(', ')}`); }
}
console.log(`Against the saved rows: ${added} new, ${changed} changed, ${rows.length - added - changed} unchanged${exists ? '' : ' (no table yet)'}.`);
if (SQL) { fs.writeFileSync(SQL, upsert); console.log(`Upsert written to ${SQL} (${rows.length} rows).`); }
if (!WRITE) { console.log('\nDry run: nothing written. Add --write to save.'); process.exit(0); }

psql(`BEGIN;\nSET LOCAL statement_timeout = '60s';\nSET LOCAL lock_timeout = '5s';\n${upsert}COMMIT;\n`);
console.log(`Saved: ${added} new and ${changed} changed rows (${rows.length - added - changed} unchanged rows left as they were).`);

const slugs = [...new Set(rows.map((x) => slugOf.get(x.council)))].sort();
const pathArgs = slugs.flatMap((s) => ['--path', `/councils/${s}`]);
try {
  execFileSync(process.execPath, [path.join(__dirname, 'revalidate.js'), ...pathArgs], { stdio: 'inherit' });
} catch {
  fail(`Saved, but the page refresh failed: run node scripts/revalidate.js with these ${slugs.length} paths, or they refresh within 6 hours.`);
}
