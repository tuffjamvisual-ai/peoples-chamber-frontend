// Meaning search loader (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): builds the corpus (scripts/meaning/corpus.sql,
// read only, plus the site's own pages from lib/directory.ts), embeds it on the Mac with the model kept in the repo
// (models/Supabase/gte-small, the same model, settings and text the live query uses) and writes the vectors to
// public.search_embeddings (migration 2026-11-21e) in batches.
//
//   npx tsx --tsconfig tsconfig.json scripts/meaning/load-embeddings.ts [--dry-run]   corpus, vectors, counts and the REAL
//        size estimate: a sample is inserted, indexed and measured inside BEGIN ... ROLLBACK (the migration itself is
//        rehearsed in the same transaction while the table does not exist yet). Nothing is kept.
//   ... --sql <file> [--run]   writes the rehearsal of the first batch (with the migration if the table does not exist),
//        ending ROLLBACK, for review; --run runs it.
//   ... --apply [--prune] [--limit N]   writes new and changed rows (by source_hash) in batches of BATCH, PAUSE_MS apart,
//        each batch its own transaction with the 60 s / 5 s limits. Refuses before each batch while `vercel ls` shows a
//        deploy Building (or cannot be read) and between 03:00 and 04:00 UK time (the 03:08 sync). Resumable: rows
//        already written with the same hash are skipped, so a stopped run carries on where it was. --prune then deletes
//        rows whose path is no longer in the corpus. Run 2026-11-21f (the HNSW index) after the first full load.
// Options: --out <dir> (default ~/opengovt-backup/meaning-embeddings): corpus.jsonl, vectors.f32, vectors.meta.json. The
// vectors are reused for unchanged rows. vectors (.f32 + .meta.json) is also what MEANING_LOCAL_VECTORS reads in local
// development only (lib/meaning/local-vectors.ts).
// DATABASE_URL comes from .env.local and is never printed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { DIRECTORY } from '@/lib/directory';
import { COMMITTEE_IDS } from '@/lib/committees';
import { MEANING_KINDS, type MeaningKind } from '@/lib/meaning/kinds';

dotenv.config({ path: '.env.local', quiet: true });
const ROOT = process.cwd();
const MODEL = 'Supabase/gte-small';
const DIMS = 384;
const BATCH = 500;
const PAUSE_MS = 5000;
const SAMPLE = 4000;

const args = process.argv.slice(2);
const has = (n: string) => args.includes(n);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const APPLY = has('--apply');
const SQL_OUT = opt('--sql');
const RUN = has('--run');
const PRUNE = has('--prune');
const LIMIT = Number(opt('--limit')) || Infinity;
const OUT = opt('--out') ?? path.join(os.homedir(), 'opengovt-backup/meaning-embeddings');
if (PRUNE && !APPLY) fail('--prune goes with --apply');
if (APPLY && SQL_OUT) fail('--apply and --sql are separate runs');
const DB = process.env.DATABASE_URL;
if (!DB) fail('DATABASE_URL is not set (.env.local)');

function fail(msg: string): never { console.error(msg); process.exit(1); }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const LIMITS = "SET LOCAL statement_timeout = '60s'; SET LOCAL lock_timeout = '5s';";

function pgEnv(url: string): Record<string, string> {
  const u = new URL(url);
  const env: Record<string, string> = {
    PGHOST: u.hostname, PGPORT: u.port || '5432', PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: decodeURIComponent(u.pathname.slice(1)) || 'postgres',
  };
  const ssl = u.searchParams.get('sslmode');
  if (ssl) env.PGSSLMODE = ssl;
  return env;
}
// The connection string goes in the environment, not the arguments, and an error carries psql's own message only, so the
// address and password are never printed.
function psql(sql: string): string {
  try {
    return execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'], {
      input: sql, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...pgEnv(DB as string) },
    });
  } catch (e) {
    throw new Error(`psql failed: ${String((e as { stderr?: string }).stderr ?? '').trim().slice(0, 2000)}`);
  }
}
const readOnly = (sql: string) => psql(`BEGIN READ ONLY;\n${LIMITS}\n${sql}\nROLLBACK;\n`);

// --- guards for writes -----------------------------------------------------------------------------------------------
function ukClock(): { h: number; m: number; text: string } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { h: Number(p.hour), m: Number(p.minute), text: `${p.hour}:${p.minute} ${p.timeZoneName === 'BST' || p.timeZoneName === 'GMT+1' ? 'BST' : 'GMT'}` };
}
function writeRefusal(): string | null {
  const t = ukClock();
  if (t.h === 3) return `${t.text}: no database writes between 03:00 and 04:00 UK time (the 03:08 sync)`;
  // vercel ls prints its table on stderr (the manual check reads it with 2>&1).
  const r = spawnSync('vercel', ['ls'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const states = [...out.matchAll(/● ([A-Za-z]+)/g)].map((m) => m[1]).slice(0, 2);
  if (states.length < 2) return 'cannot read the deploy state from `vercel ls` (run from the linked repo folder)';
  if (states.some((s) => s !== 'Ready' && s !== 'Error' && s !== 'Canceled')) return `a deploy is ${states.join(', ')}: wait until it is Ready`;
  return null;
}

// --- corpus ----------------------------------------------------------------------------------------------------------
type Rec = { kind: MeaningKind; path: string; title: string; text: string; hash: string };
const hashOf = (text: string) => crypto.createHash('sha256').update(`${MODEL}\nq8 mean normalize\n${text}`).digest('hex').slice(0, 32);
// The special advisers page's anchor for an adviser (as lib/search/name-index.ts and SpadRosterTable adviserAnchor).
const anchor = (name: string) => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function buildCorpus(): { rows: Rec[]; dropped: Record<string, number> } {
  const dropped: Record<string, number> = {};
  const drop = (why: string) => { dropped[why] = (dropped[why] ?? 0) + 1; };
  const out: Rec[] = [];
  const seen = new Set<string>();
  const add = (kind: MeaningKind, p: string, title: string, text: string) => {
    if (!p.startsWith('/') || p.startsWith('//') || p.length > 300) return drop('bad path');
    if (seen.has(p)) return drop(`duplicate path (${kind})`);
    const t = title.replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!t) return drop('no title');
    seen.add(p);
    out.push({ kind, path: p, title: t, text, hash: hashOf(text) });
  };
  // The site's own pages first (as the ENTRY 390 test, scripts/meaning-test/dir-export.ts): one per address, with all its
  // directory names and its description.
  const byHref = new Map<string, { names: string[]; desc: string }>();
  for (const e of DIRECTORY) {
    const r = byHref.get(e.href) ?? { names: [], desc: '' };
    r.names.push(e.name);
    if (!r.desc && e.desc) r.desc = e.desc;
    byHref.set(e.href, r);
  }
  for (const [href, r] of byHref) {
    const title = r.names.find((n) => !DIRECTORY.find((d) => d.name === n && d.see)) ?? r.names[0];
    add('page', href, title, `${r.names.join('; ')}. ${r.desc}`);
  }
  const lines = readOnly(fs.readFileSync(path.join(ROOT, 'scripts/meaning/corpus.sql'), 'utf8')).split('\n').filter((l) => l.startsWith('{'));
  const committees = new Set(COMMITTEE_IDS.map(String));
  for (const l of lines) {
    const r = JSON.parse(l) as { kind: MeaningKind; path: string; title: string | null; text: string; ref: string | null };
    if (!MEANING_KINDS.includes(r.kind)) { drop(`unknown kind ${r.kind}`); continue; }
    if (r.kind === 'committee' && !committees.has(String(r.ref))) { drop('committee without a page'); continue; }
    if (r.kind === 'special_adviser') {
      if (r.ref !== 'listed') { drop('special adviser not in the latest list (no row on the page)'); continue; }
      add(r.kind, `${r.path}#${anchor(String(r.title))}`, String(r.title), r.text);
      continue;
    }
    add(r.kind, r.path, String(r.title ?? ''), r.text);
  }
  return { rows: out, dropped };
}

// --- vectors ---------------------------------------------------------------------------------------------------------
async function embedAll(rows: Rec[]): Promise<Float32Array> {
  fs.mkdirSync(OUT, { recursive: true });
  const metaFile = path.join(OUT, 'vectors.meta.json');
  const vecFile = path.join(OUT, 'vectors.f32');
  const old = new Map<string, Float32Array>();
  if (fs.existsSync(metaFile) && fs.existsSync(vecFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as { hash: string }[];
    const b = fs.readFileSync(vecFile);
    const v = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
    if (v.length === meta.length * DIMS) meta.forEach((m, i) => old.set(m.hash, v.slice(i * DIMS, (i + 1) * DIMS)));
  }
  const buf = new Float32Array(rows.length * DIMS);
  const todo: number[] = [];
  rows.forEach((r, i) => { const v = old.get(r.hash); if (v) buf.set(v, i * DIMS); else todo.push(i); });
  console.log(`vectors: ${rows.length - todo.length} reused, ${todo.length} to embed`);
  if (todo.length) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowRemoteModels = false;
    env.localModelPath = path.join(ROOT, 'models');
    const ext = (await pipeline('feature-extraction', MODEL, { dtype: 'q8' })) as unknown as (t: string[], o: object) => Promise<{ data: Float32Array }>;
    const t0 = performance.now();
    for (let k = 0; k < todo.length; k += 32) {
      const idx = todo.slice(k, k + 32);
      const out = await ext(idx.map((i) => rows[i].text), { pooling: 'mean', normalize: true });
      idx.forEach((i, j) => buf.set(out.data.subarray(j * DIMS, (j + 1) * DIMS), i * DIMS));
      if (k % 3200 === 0) process.stdout.write(`  ${k} of ${todo.length}, ${((performance.now() - t0) / 1000).toFixed(0)} s\n`);
    }
    console.log(`embedded ${todo.length} in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  }
  fs.writeFileSync(path.join(OUT, 'corpus.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(vecFile, Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength));
  fs.writeFileSync(metaFile, JSON.stringify(rows.map(({ kind, path: p, title, hash }) => ({ kind, path: p, title, hash }))));
  return buf;
}

// --- SQL -------------------------------------------------------------------------------------------------------------
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const vecLit = (v: Float32Array) => `'[${Array.from(v, (x) => x.toFixed(5)).join(',')}]'`;
function upsertSql(rows: Rec[], vecOf: (r: Rec) => Float32Array): string {
  return `INSERT INTO public.search_embeddings (path, kind, title, embedding, source_hash) VALUES\n${rows
    .map((r) => `(${lit(r.path)}, ${lit(r.kind)}, ${lit(r.title)}, ${vecLit(vecOf(r))}::extensions.halfvec(384), ${lit(r.hash)})`).join(',\n')}
ON CONFLICT (path) DO UPDATE SET kind = excluded.kind, title = excluded.title, embedding = excluded.embedding,
  source_hash = excluded.source_hash, updated_at = now()
WHERE search_embeddings.source_hash IS DISTINCT FROM excluded.source_hash OR search_embeddings.title IS DISTINCT FROM excluded.title
  OR search_embeddings.kind IS DISTINCT FROM excluded.kind;\n`;
}
// The migration's own text, without its COMMIT, to rehearse inside a transaction that is rolled back.
function migrationBody(): string {
  const m = fs.readFileSync(path.join(ROOT, 'scripts/migrations/2026-11-21e-meaning-search.sql'), 'utf8');
  if (!/\nCOMMIT;\s*$/.test(m)) fail('the migration file no longer ends with COMMIT;');
  return m.replace(/^\\set ON_ERROR_STOP on\n/m, '').replace(/\nCOMMIT;\s*$/, '\n');
}
const tableExists = () => readOnly(`SELECT to_regclass('public.search_embeddings') IS NOT NULL;`).trim() === 't';

// --- main ------------------------------------------------------------------------------------------------------------
(async () => {
  const { rows: all, dropped } = buildCorpus();
  const rows = all.slice(0, LIMIT);
  const byKind = new Map<string, number>();
  for (const r of rows) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  console.log(`corpus: ${rows.length} rows${LIMIT < Infinity ? ` (--limit ${LIMIT} of ${all.length})` : ''}`);
  for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${n}`);
  for (const [why, n] of Object.entries(dropped)) console.log(`  left out: ${why}: ${n}`);
  const vecs = await embedAll(rows);
  const index = new Map(rows.map((r, i) => [r.path, i]));
  const vecOf = (r: Rec) => vecs.subarray(index.get(r.path)! * DIMS, (index.get(r.path)! + 1) * DIMS);
  console.log(`vectors file: ${path.join(OUT, 'vectors')} (.f32 ${(vecs.byteLength / 1048576).toFixed(1)} MB, .meta.json)`);

  const exists = tableExists();
  const held = new Map<string, string>();
  if (exists) for (const l of readOnly('SELECT path, source_hash FROM public.search_embeddings;').split('\n').filter(Boolean)) {
    const i = l.lastIndexOf('|'); held.set(l.slice(0, i), l.slice(i + 1));
  }
  const todo = rows.filter((r) => held.get(r.path) !== r.hash);
  const stale = [...held.keys()].filter((p) => !index.has(p));
  console.log(`database: table ${exists ? 'exists' : 'not created yet'}; ${held.size} rows held; ${todo.length} new or changed; ${rows.length - todo.length} unchanged; ${stale.length} no longer in the corpus`);

  if (SQL_OUT) {
    const sql = `\\set ON_ERROR_STOP on\n-- Rehearsal (Cowork ENTRY 390 GO): ${exists ? '' : 'the migration and '}the first batch of ${Math.min(BATCH, todo.length)} rows; ROLLBACK at the end.\n`
      + (exists ? `BEGIN;\n${LIMITS}\n` : migrationBody())
      + upsertSql(todo.slice(0, BATCH), vecOf)
      + `SELECT 'rows in search_embeddings (inside the rehearsal)', count(*) FROM public.search_embeddings;\nROLLBACK;\n`;
    fs.writeFileSync(SQL_OUT, sql);
    console.log(`rehearsal SQL: ${SQL_OUT} (${(sql.length / 1048576).toFixed(1)} MB)`);
    if (RUN) {
      const refusal = writeRefusal();
      if (refusal) fail(`not run: ${refusal}`);
      console.log(psql(sql).trim());
    }
    return;
  }

  if (!APPLY) {
    // The real size: the migration (if needed) and a spread sample of SAMPLE rows inside one transaction that is rolled
    // back; sizes from pg_relation_size / pg_total_relation_size, scaled to the full corpus; the HNSW build timed on it.
    const refusal = writeRefusal();
    if (refusal) fail(`size rehearsal not run: ${refusal}`);
    const step = Math.max(1, Math.floor(rows.length / SAMPLE));
    const sample = rows.filter((_, i) => i % step === 0).slice(0, SAMPLE);
    let sql = '\\set ON_ERROR_STOP on\n' + (exists ? `BEGIN;\n${LIMITS}\n` : migrationBody());
    for (let i = 0; i < sample.length; i += BATCH) sql += upsertSql(sample.slice(i, i + BATCH), vecOf);
    sql += `SELECT 'heap', pg_relation_size('public.search_embeddings'), 'toast', coalesce(pg_total_relation_size(nullif(reltoastrelid, 0)), 0), 'pkey', pg_relation_size('public.search_embeddings_pkey'), 'rows', (SELECT count(*) FROM public.search_embeddings)
  FROM pg_class WHERE oid = 'public.search_embeddings'::regclass;
\\timing on
SELECT count(*) FROM public.search_meaning(${vecLit(vecOf(sample[0]))}, 15);
CREATE INDEX search_embeddings_embedding_hnsw_rehearsal ON public.search_embeddings USING hnsw (embedding extensions.halfvec_cosine_ops);
SELECT count(*) FROM public.search_meaning(${vecLit(vecOf(sample[1]))}, 15);
\\timing off
-- The function's query as a generic plan (a SQL function with SET is not inlined, so the vector is a parameter): it
-- must use the HNSW index. Execution Time is the database's own time, without the trip from the Mac.
SET LOCAL plan_cache_mode = force_generic_plan;
PREPARE near(text) AS SELECT path FROM public.search_embeddings ORDER BY embedding OPERATOR(extensions.<=>) $1::extensions.halfvec(384) LIMIT 15;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON) EXECUTE near(${vecLit(vecOf(sample[2]))});
SELECT 'hnsw', pg_relation_size('public.search_embeddings_embedding_hnsw_rehearsal'), 'total', pg_total_relation_size('public.search_embeddings');
ROLLBACK;
`;
    const t0 = performance.now();
    const res = psql(sql);
    const nums = Object.fromEntries([...res.matchAll(/(heap|toast|pkey|rows|hnsw|total)\|(\d+)/g)].map((m) => [m[1], Number(m[2])]));
    const times = [...res.matchAll(/^Time: ([\d.]+) ms/gm)].map((m) => Number(m[1]));
    const plan = res.split('\n').filter((l) => /Index Scan|Seq Scan|Execution Time/.test(l)).map((l) => l.trim()).join('; ');
    const scale = rows.length / nums.rows;
    const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
    console.log(`size rehearsal (BEGIN ... ROLLBACK, ${((performance.now() - t0) / 1000).toFixed(0)} s): ${nums.rows} sample rows`);
    console.log(`  sample: table ${mb(nums.heap)}, toast ${mb(nums.toast)}, key ${mb(nums.pkey)}, HNSW ${mb(nums.hnsw)}, total ${mb(nums.total)}`);
    console.log(`  per row: ${(nums.total / nums.rows).toFixed(0)} bytes (table and key ${((nums.heap + nums.toast + nums.pkey) / nums.rows).toFixed(0)}, HNSW ${(nums.hnsw / nums.rows).toFixed(0)})`);
    console.log(`  ESTIMATE for ${rows.length} rows: table and key ${mb((nums.heap + nums.toast + nums.pkey) * scale)}, HNSW ${mb(nums.hnsw * scale)}, total ${mb(nums.total * scale)}`);
    console.log(`  times: search without index ${times[0]} ms; HNSW build on the sample ${times[1]} ms (full set about ${((times[1] * scale) / 1000).toFixed(0)} s if linear; HNSW builds grow a little faster than linear); search with index ${times[2]} ms (both from the Mac, with the network trip)`);
    console.log(`  plan of search_meaning's query (generic): ${plan}`);
    return;
  }

  if (!exists) fail('search_embeddings does not exist: run scripts/migrations/2026-11-21e-meaning-search.sql first');
  let written = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    for (;;) {
      const refusal = writeRefusal();
      if (!refusal) break;
      console.log(`  waiting: ${refusal}`);
      await sleep(60_000);
    }
    const part = todo.slice(i, i + BATCH);
    psql(`BEGIN;\n${LIMITS}\n${upsertSql(part, vecOf)}COMMIT;\n`);
    written += part.length;
    console.log(`  ${ukClock().text} batch ${i / BATCH + 1}: ${part.length} rows (${written} of ${todo.length})`);
    if (i + BATCH < todo.length) await sleep(PAUSE_MS);
  }
  if (PRUNE && stale.length) {
    for (let i = 0; i < stale.length; i += BATCH) {
      const refusal = writeRefusal();
      if (refusal) fail(`prune stopped: ${refusal}`);
      psql(`BEGIN;\n${LIMITS}\nDELETE FROM public.search_embeddings WHERE path IN (${stale.slice(i, i + BATCH).map(lit).join(',')});\nCOMMIT;\n`);
      await sleep(PAUSE_MS);
    }
    console.log(`  pruned ${stale.length} rows no longer in the corpus`);
  }
  console.log(readOnly(`SELECT 'search_embeddings: ' || count(*) || ' rows, ' || pg_size_pretty(pg_total_relation_size('public.search_embeddings')) FROM public.search_embeddings;`).trim());
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
