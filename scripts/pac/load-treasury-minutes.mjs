#!/usr/bin/env node
// Load parsed Treasury Minutes and Progress Reports (scripts/pac/parse-treasury-minutes.mjs) into the recommendations
// tracker tables (migration 2026-10-29d) (owner's approval, 29 Oct 2026, "go stage 2"). Idempotent: every table is
// upserted on its natural key and a row is only rewritten when something in it differs, so a second run changes 0 rows.
//
//   node scripts/pac/load-treasury-minutes.mjs <parsed.json>             rehearsal: the writes run, then ROLLBACK
//   node scripts/pac/load-treasury-minutes.mjs <parsed.json> --apply     the same, then COMMIT
//   node scripts/pac/load-treasury-minutes.mjs --summary                 read only: rows, needs review, moved and passed targets
//   node scripts/pac/load-treasury-minutes.mjs --status                  read only: the status view (migration 2026-10-29e)
// Stage 4 (owner, 29 Oct 2026, "go stage 4"): after --apply it runs node scripts/revalidate.js --tag pac.
// Stage 3 (owner, 29 Oct 2026, "go stage 3"): also the reports each progress report lists under "Reports completed"
// (pac_progress_completed_reports). A completed report not answered in any loaded document is added to pac_reports
// with its listed title and no department; an existing report row is never changed by a completed list.
//
// Documents marked excluded by the parser are skipped and listed. Where documents differ about a report or a
// recommendation, the latest document's title, department and texts are kept. One transaction, SET LOCAL
// statement_timeout = '60s' and lock_timeout = '5s'; the row counts before and after are read outside it.
// DATABASE_URL comes from .env.local and is never printed.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { monthDate } from './parse-treasury-minutes.mjs';

createRequire(import.meta.url)('dotenv').config({ path: '.env.local', quiet: true });

function psql(sql) {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set in .env.local'); process.exit(1); }
  const r = spawnSync('psql', [process.env.DATABASE_URL, '-X', '-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.error(`database error: ${(r.stderr || '').replace(/postgres(ql)?:\/\/\S+/gi, '[url]').trim()}`); process.exit(1); }
  return r.stdout;
}
const readOnly = (sql) => psql(`BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\n${sql}\nROLLBACK;\n`);
const TABLES = ['pac_source_documents', 'pac_reports', 'pac_recommendations', 'pac_recommendation_events', 'pac_progress_completed_reports'];
function counts() {
  const out = readOnly(`SELECT ${TABLES.map((t) => `(SELECT count(*) FROM public.${t})`).join(', ')};`);
  const line = out.split('\n').find((l) => /^\d+(\t\d+){4}$/.test(l));
  return Object.fromEntries(line.split('\t').map((n, i) => [TABLES[i], +n]));
}

// ---------- the rows wanted
function rowsFrom(docs) {
  const used = docs.filter((d) => !d.checks.excluded).sort((a, b) => a.published_on.localeCompare(b.published_on));
  const documents = used.map((d) => ({ kind: d.kind, cp_number: d.cp_number, title: d.title, published_on: d.published_on, url: d.url, pages: d.pages ?? d.pages_parsed, sha256: d.sha256, fetched_at: d.fetched_at }));
  const reports = new Map(), recs = new Map(), events = [];
  for (const d of used) for (const r of d.reports) {
    const rk = `${r.session}|${r.report_number}`;
    reports.set(rk, { session: r.session, report_number: r.report_number, title: r.title, department: r.departments.join(' ') || null, committee_url: null });
    for (const x of r.recommendations) {
      const key = `${rk}|${x.number}`;
      const prev = recs.get(key);
      recs.set(key, { session: r.session, report_number: r.report_number, rec_number: x.number,
        conclusion_text: x.conclusion ?? prev?.conclusion_text ?? null, recommendation_text: x.recommendation || prev?.recommendation_text || null });
      const response = x.response ? (x.response.kind === 'as_worded' ? x.response.as_worded : x.response.kind) : null;
      const progress = d.kind === 'progress_report';
      events.push({
        session: r.session, report_number: r.report_number, rec_number: x.number, cp_number: d.cp_number, page: x.page ?? null,
        response, response_text: (progress ? x.paragraphs.slice(0, 1) : x.paragraphs).join('\n') || null,
        status: x.status ?? null,
        target_text: x.target?.as_written ?? null, target_month: monthDate(x.target?.parsed),
        original_target_text: x.original_target?.as_written ?? null, original_target_month: monthDate(x.original_target?.parsed),
        revised_target_text: x.revised_target?.as_written ?? null, revised_target_month: monthDate(x.revised_target?.parsed),
        implemented_text: x.implemented ? (x.implemented.as_written || 'Recommendation implemented') : null, implemented_month: monthDate(x.implemented?.parsed),
        progress_text: progress ? x.paragraphs.slice(1).join('\n') || null : null,
        needs_review: !!x.needs_review,
      });
    }
  }
  const completed = [];
  for (const d of used.filter((x) => x.kind === 'progress_report')) for (const s of d.sessions) for (const c of s.completed_list) {
    completed.push({ cp_number: d.cp_number, session: s.session, report_number: c.report_number, title: c.title });
  }
  return { used, excluded: docs.filter((d) => d.checks.excluded), documents, reports: [...reports.values()], recs: [...recs.values()], events, completed };
}

const tagFor = (s) => { let t = 'pac_json'; while (s.includes(`$${t}$`)) t += '_x'; return t; };
const lit = (rows) => { const j = JSON.stringify(rows); const t = tagFor(j); return `$${t}$${j}$${t}$::jsonb`; };
// INSERT ... ON CONFLICT DO UPDATE only where a column differs; reports inserted and updated.
function upsert(table, rows, cols, types, conflict, select, from = '') {
  const set = cols.filter((c) => !conflict.includes(c));
  return `WITH src AS (SELECT * FROM jsonb_to_recordset(${lit(rows)}) AS r(${Object.entries(types).map(([c, t]) => `${c} ${t}`).join(', ')})),
up AS (
  INSERT INTO public.${table} AS t (${cols.join(', ')})
  SELECT ${select} FROM src ${from}
  ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${set.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}
  WHERE (${set.map((c) => `t.${c}`).join(', ')}) IS DISTINCT FROM (${set.map((c) => `EXCLUDED.${c}`).join(', ')})
  RETURNING (xmax = 0) AS inserted
)
SELECT '${table}', count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) FROM up;`;
}

function load(file, apply) {
  const { used, excluded, documents, reports, recs, events, completed } = rowsFrom(JSON.parse(readFileSync(file, 'utf8')));
  console.log(`load-treasury-minutes: ${apply ? 'APPLY' : 'rehearsal, ends ROLLBACK'}; ${used.length} documents used, ${excluded.length} excluded`);
  for (const d of excluded) console.log(`  excluded ${d.cp_number} (${d.published_on}): ${d.checks.structural.join('; ')}`);
  console.log(`  wanted: ${documents.length} documents, ${reports.length} reports, ${recs.length} recommendations, ${events.length} events, ${completed.length} completed report listings`);
  for (const d of used) for (const c of d.corrections_applied ?? []) console.log(`  correction in ${c.cp_number} ${c.session} report ${c.report_number} (printed page ${c.printed_page}): "${c.raw_heading}" read as "${c.corrected_heading}"`);
  const before = counts();
  const sql = `BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
${upsert('pac_source_documents', documents, ['kind', 'cp_number', 'title', 'published_on', 'url', 'pages', 'sha256', 'fetched_at'],
    { kind: 'text', cp_number: 'text', title: 'text', published_on: 'date', url: 'text', pages: 'int', sha256: 'text', fetched_at: 'timestamptz' }, ['cp_number'],
    'kind, cp_number, title, published_on, url, pages, sha256, fetched_at')}
${upsert('pac_reports', reports, ['session', 'report_number', 'title', 'department', 'committee_url'],
    { session: 'text', report_number: 'int', title: 'text', department: 'text', committee_url: 'text' }, ['session', 'report_number'],
    'session, report_number, title, department, committee_url')}
${upsert('pac_recommendations', recs, ['report_id', 'rec_number', 'conclusion_text', 'recommendation_text'],
    { session: 'text', report_number: 'int', rec_number: 'text', conclusion_text: 'text', recommendation_text: 'text' }, ['report_id', 'rec_number'],
    'p.id, src.rec_number, src.conclusion_text, src.recommendation_text', 'JOIN public.pac_reports p ON p.session = src.session AND p.report_number = src.report_number')}
${upsert('pac_recommendation_events', events,
    ['recommendation_id', 'document_id', 'page', 'response', 'response_text', 'status', 'target_text', 'target_month', 'original_target_text', 'original_target_month',
      'revised_target_text', 'revised_target_month', 'implemented_text', 'implemented_month', 'progress_text', 'needs_review'],
    { session: 'text', report_number: 'int', rec_number: 'text', cp_number: 'text', page: 'int', response: 'text', response_text: 'text', status: 'text',
      target_text: 'text', target_month: 'date', original_target_text: 'text', original_target_month: 'date', revised_target_text: 'text', revised_target_month: 'date',
      implemented_text: 'text', implemented_month: 'date', progress_text: 'text', needs_review: 'boolean' }, ['recommendation_id', 'document_id'],
    `rec.id, doc.id, src.page, src.response, src.response_text, src.status, src.target_text, src.target_month, src.original_target_text, src.original_target_month,
      src.revised_target_text, src.revised_target_month, src.implemented_text, src.implemented_month, src.progress_text, src.needs_review`,
    `JOIN public.pac_reports p ON p.session = src.session AND p.report_number = src.report_number
     JOIN public.pac_recommendations rec ON rec.report_id = p.id AND rec.rec_number = src.rec_number
     JOIN public.pac_source_documents doc ON doc.cp_number = src.cp_number`)}
WITH src AS (SELECT DISTINCT ON (session, report_number) * FROM jsonb_to_recordset(${lit(completed)}) AS r(cp_number text, session text, report_number int, title text) ORDER BY session, report_number, cp_number DESC),
up AS (INSERT INTO public.pac_reports (session, report_number, title) SELECT session, report_number, title FROM src ON CONFLICT (session, report_number) DO NOTHING RETURNING 1)
SELECT 'pac_reports (from completed lists)', count(*), 0 FROM up;
WITH src AS (SELECT * FROM jsonb_to_recordset(${lit(completed)}) AS r(cp_number text, session text, report_number int, title text)),
up AS (INSERT INTO public.pac_progress_completed_reports (document_id, report_id)
  SELECT DISTINCT d.id, p.id FROM src JOIN public.pac_source_documents d ON d.cp_number = src.cp_number JOIN public.pac_reports p ON p.session = src.session AND p.report_number = src.report_number
  ON CONFLICT DO NOTHING RETURNING 1)
SELECT 'pac_progress_completed_reports', count(*), 0 FROM up;
${apply ? 'COMMIT' : 'ROLLBACK'};
`;
  const out = psql(sql);
  let changed = 0;
  for (const line of out.split('\n').filter((l) => l.startsWith('pac_'))) {
    const [table, ins, upd] = line.split('\t');
    changed += +ins + +upd;
    console.log(`  ${table}: ${ins} inserted, ${upd} updated`);
  }
  const after = counts();
  console.log(`  rows before ${JSON.stringify(before)}`);
  console.log(`  rows after  ${JSON.stringify(after)}${apply ? '' : ' (rolled back)'}`);
  console.log(`load-treasury-minutes: ${changed} rows ${apply ? 'written' : 'would be written'}`);
  // After an apply, refresh the cached recommendations pages (lib/pac.ts reads under the 'pac' tag).
  if (apply) {
    const r = spawnSync('node', ['scripts/revalidate.js', '--tag', 'pac'], { encoding: 'utf8' });
    console.log(`  refresh: ${(r.stdout || r.stderr || '').trim()}`);
    if (r.status !== 0) console.error('  the refresh failed; run it again: node scripts/revalidate.js --tag pac');
  }
}

// ---------- read only summary
function summary() {
  console.log(`rows: ${JSON.stringify(counts())}`);
  const q = (sql) => readOnly(sql).split('\n').filter((l) => l && !/^(BEGIN|SET|ROLLBACK)$/.test(l));
  console.log('\nneeds review (document, report, rec, why as written):');
  for (const l of q(`SELECT d.cp_number, r.session || ' report ' || r.report_number, c.rec_number,
      concat_ws('; ', CASE WHEN e.response IS NULL THEN 'response not recognised' END,
        CASE WHEN e.target_text IS NOT NULL AND e.target_month IS NULL THEN 'target: ' || e.target_text END,
        CASE WHEN e.original_target_text IS NOT NULL AND e.original_target_month IS NULL THEN 'original target: ' || e.original_target_text END,
        CASE WHEN e.revised_target_text IS NOT NULL AND e.revised_target_month IS NULL THEN 'revised target: ' || e.revised_target_text END,
        CASE WHEN e.status IS NULL AND e.response IS NOT NULL THEN 'no target or status line' END)
    FROM public.pac_recommendation_events e JOIN public.pac_recommendations c ON c.id = e.recommendation_id JOIN public.pac_reports r ON r.id = c.report_id
    JOIN public.pac_source_documents d ON d.id = e.document_id WHERE e.needs_review ORDER BY d.published_on, r.session, r.report_number, c.rec_number;`)) console.log(`  ${l.replace(/\t/g, ' | ')}`);
  // Each recommendation's targets in document order: the first original target, then each document's current
  // target (revised, else target, else original). A move is a later month than the one before.
  const moves = q(`WITH ev AS (
      SELECT e.recommendation_id, d.published_on, e.original_target_month o, coalesce(e.revised_target_month, e.target_month, e.original_target_month) cur,
        row_number() OVER (PARTITION BY e.recommendation_id ORDER BY d.published_on) k
      FROM public.pac_recommendation_events e JOIN public.pac_source_documents d ON d.id = e.document_id),
    seq AS (
      SELECT recommendation_id, published_on, 0 AS part, o AS m FROM ev WHERE k = 1 AND o IS NOT NULL
      UNION ALL SELECT recommendation_id, published_on, 1, cur FROM ev WHERE cur IS NOT NULL),
    steps AS (SELECT recommendation_id, m, lag(m) OVER (PARTITION BY recommendation_id ORDER BY published_on, part) prev FROM seq),
    per AS (SELECT recommendation_id, count(*) FILTER (WHERE m > prev) n FROM steps GROUP BY 1)
    SELECT n, count(*) FROM per WHERE n > 0 GROUP BY n ORDER BY n;`);
  const moved = moves.map((l) => l.split('\t').map(Number));
  console.log(`\ntarget moved later: ${moved.reduce((a, [, c]) => a + c, 0)} recommendations (${moved.map(([n, c]) => `${c} moved ${n} time${n === 1 ? '' : 's'}`).join(', ')})`);
  const passed = q(`WITH latest AS (
      SELECT DISTINCT ON (e.recommendation_id) e.recommendation_id, coalesce(e.revised_target_month, e.target_month, e.original_target_month) m
      FROM public.pac_recommendation_events e JOIN public.pac_source_documents d ON d.id = e.document_id
      WHERE coalesce(e.revised_target_month, e.target_month, e.original_target_month) IS NOT NULL
      ORDER BY e.recommendation_id, d.published_on DESC)
    SELECT count(*) FROM latest l WHERE l.m < date '2026-10-01'
      AND NOT EXISTS (SELECT 1 FROM public.pac_recommendation_events x WHERE x.recommendation_id = l.recommendation_id AND x.status = 'implemented');`);
  console.log(`target passed, no published confirmation of delivery as of the latest document: ${passed[0]} recommendations (latest target month ended before 29 Oct 2026)`);
}

// ---------- read only status report (the view from migration 2026-10-29e)
function statusReport() {
  const q = (sql) => readOnly(sql).split('\n').filter((l) => l && !/^(BEGIN|SET|ROLLBACK)$/.test(l)).map((l) => l.split('\t'));
  const short = (t, n = 220) => (t && t.length > n ? `${t.slice(0, n)}...` : t ?? '');
  console.log('counts by status:');
  for (const [s, n] of q(`SELECT status, count(*) FROM public.pac_recommendation_status GROUP BY 1 ORDER BY 2 DESC;`)) console.log(`  ${s}: ${n}`);
  const rec = `session || ' r' || report_number || ' rec ' || rec_number || ' (' || report_title || ')'`;
  console.log('\nmost moved targets:');
  for (const r of q(`SELECT ${rec}, times_target_moved, original_target_month, latest_target_month, latest_cp_number, status FROM public.pac_recommendation_status ORDER BY times_target_moved DESC, latest_target_month DESC NULLS LAST, recommendation_id LIMIT 10;`)) console.log(`  ${r[0]}: moved ${r[1]} times, ${r[2]} -> ${r[3]} (latest ${r[4]}, ${r[5]})`);
  console.log('\nlongest overdue, target_passed_unconfirmed:');
  for (const r of q(`SELECT ${rec}, coalesce(original_target_month::text, '-'), latest_target_month, latest_target_text, latest_cp_number, latest_published_on FROM public.pac_recommendation_status WHERE status = 'target_passed_unconfirmed' ORDER BY latest_target_month, recommendation_id LIMIT 10;`)) console.log(`  ${r[0]}: original ${r[1]}, latest ${r[2]} ("${r[3]}"), latest document ${r[4]} (${r[5]})`);
  console.log('\nfive random rows of each status, with the source text:');
  const rows = q(`SELECT * FROM (SELECT s.status, ${rec.replace(/(session|report_number|rec_number|report_title)/g, 's.$1')}, s.latest_cp_number, s.latest_published_on, s.latest_target_text, s.completed_in_cp_number, s.dropped_in_cp_number,
      e.response, replace(left(coalesce(e.response_text, ''), 400), E'\n', ' '), coalesce(ie.implemented_text, ''), coalesce(id.cp_number, ''),
      (SELECT string_agg(d.cp_number, ', ' ORDER BY d.published_on) FROM public.pac_recommendation_events x JOIN public.pac_source_documents d ON d.id = x.document_id WHERE x.recommendation_id = s.recommendation_id),
      row_number() OVER (PARTITION BY s.status ORDER BY md5(s.recommendation_id::text || 'stage3')) k
    FROM public.pac_recommendation_status s JOIN public.pac_recommendation_events e ON e.id = s.latest_event_id
    LEFT JOIN LATERAL (SELECT x.implemented_text, x.document_id FROM public.pac_recommendation_events x WHERE x.recommendation_id = s.recommendation_id AND x.status = 'implemented' LIMIT 1) ie ON true
    LEFT JOIN public.pac_source_documents id ON id.id = ie.document_id) t WHERE k <= 5 ORDER BY 1, 13;`);
  for (const r of rows) {
    const [status, name, cp, pub, target, completedIn, droppedIn, response, responseText, implText, implCp, docs] = r;
    const why = {
      implemented: `${implCp}: "Recommendation implemented${implText && implText !== 'Recommendation implemented' ? `: ${implText}` : ''}"`,
      rejected: `${cp} response: ${short(responseText)}`,
      report_completed: `${completedIn} lists the report under "Reports completed"; last entry for this recommendation ${cp} (${pub})`,
      dropped_from_update: `last in ${cp} (${pub}); ${droppedIn} updates the report without it`,
      target_passed_unconfirmed: `${cp} (${pub}) target "${target}"; ${short(responseText, 160)}`,
      target_in_future: `${cp} (${pub}) target "${target}"`,
      no_dated_target: `${cp} (${pub}) target "${target || '(none given)'}"; response ${response || 'not recognised'}: ${short(responseText, 160)}`,
    }[status];
    console.log(`  [${status}] ${name}; documents ${docs}\n      ${why}`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--status')) statusReport();
else if (args.includes('--summary')) summary();
else if (args[0] && !args[0].startsWith('--')) load(args[0], args.includes('--apply'));
else { console.error('usage: node scripts/pac/load-treasury-minutes.mjs <parsed.json> [--apply] | --summary | --status'); process.exit(1); }
