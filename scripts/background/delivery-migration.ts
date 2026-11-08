// make-background-migration.ts --column delivery (owner approved the format, 8 Nov 2026, DR1): a migration, its UNDO and a
// rehearsal for MP biographies with a delivery record, from a JSON file in the shape of
// scripts/background/fixtures/delivery-4820.json (one MP object, or an array of them).
//
//   npx tsx --tsconfig tsconfig.json scripts/background/make-background-migration.ts --column delivery --input <file.json> \
//     --before <export.csv> --tag <e.g. 2026-11-09a> [--out <folder>]
//
// It never reads or writes the database. The values the UNDO puts back come from --before: a fresh export of the MPs'
// mp_biography rows, made by whoever applies the migration, in the same form as the generator's other backups:
//   \copy (SELECT * FROM public.mp_biography WHERE member_id IN (...) ORDER BY member_id) TO '<file>' CSV HEADER
// (exported before migration 2026-11-08b the file has no delivery_record column, which counts as NULL). The migration then
// stops unless every row still holds exactly the exported values, so the UNDO can never put back stale ones.
// Every MP passes lib/delivery-record.ts validate() and the field checks below before anything is written; any problem
// stops the run with no files written. Files: <tag>-delivery-UNDO.sql first, then <tag>-delivery.sql, then
// <tag>-delivery-REHEARSAL.sql (the migration and the UNDO in one transaction ending in ROLLBACK), in --out (default
// scripts/migrations).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validate } from '../../lib/delivery-record';

type Fixture = { member_id: number; checked: string; political_bio: string; bio_sources: unknown; delivery_record: unknown };
type Before = {
  member_id: number; political_bio: string | null; bio_sources: string | null; bio_last_reviewed: string | null;
  bio_review_reason: string | null; bio_review_flagged_at: string | null; bio_visible: boolean; delivery_record: string | null;
};

function fail(msg: string): never {
  console.error(`make-background-migration --column delivery: ${msg}`);
  process.exit(1);
}

// A CSV file as psql \copy ... CSV HEADER writes it: an unquoted empty field is NULL, a quoted one ("") is an empty string.
export function parseCsv(text: string): Array<Record<string, string | null>> {
  const rows: Array<Array<string | null>> = [];
  let row: Array<string | null> = [], field = '', quoted = false, inQuotes = false, i = 0;
  const end = () => { row.push(quoted || field !== '' ? field : null); field = ''; quoted = false; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; quoted = true; i++; continue; }
    if (c === ',') { end(); i++; continue; }
    if (c === '\n' || c === '\r') { end(); rows.push(row); row = []; i += c === '\r' && text[i + 1] === '\n' ? 2 : 1; continue; }
    field += c; i++;
  }
  if (field !== '' || quoted || row.length) { end(); rows.push(row); }
  const [head, ...body] = rows.filter((r) => !(r.length === 1 && r[0] === null));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, k) => [h ?? '', r[k] ?? null])));
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const dollar = (s: string) => {
  if (s.includes('$dr$')) fail('a value contains "$dr$", which the migration uses to quote it');
  return `$dr$${s}$dr$`;
};
const textOrNull = (v: string | null) => (v === null ? 'NULL' : dollar(v));
const jsonOrNull = (v: string | null) => (v === null ? 'NULL' : `${dollar(v)}::jsonb`);
const md5 = (s: string) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

// The fields the migration writes, checked before anything is written.
function checkFixture(f: Fixture, at: string): string[] {
  const p: string[] = [];
  if (!Number.isInteger(f.member_id) || f.member_id <= 0) p.push(`${at}: member_id must be a positive whole number`);
  if (typeof f.checked !== 'string' || !DAY.test(f.checked)) p.push(`${at}: checked must be YYYY-MM-DD`);
  if (typeof f.political_bio !== 'string' || !f.political_bio.trim()) p.push(`${at}: political_bio is empty`);
  if (!Array.isArray(f.bio_sources) || f.bio_sources.length === 0) p.push(`${at}: bio_sources must be a non empty array`);
  else f.bio_sources.forEach((s, i) => {
    const o = s as Record<string, unknown>;
    if (!o || typeof o !== 'object' || typeof o.title !== 'string' || !o.title.trim()) p.push(`${at}: bio source ${i + 1}: title is empty`);
    if (typeof o?.url !== 'string' || !o.url.startsWith('https://')) p.push(`${at}: bio source ${i + 1}: url must start with https://`);
  });
  p.push(...validate(f.delivery_record).map((x) => `${at}: delivery_record ${x}`));
  return p;
}

export function runDelivery(argv: string[]): void {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const input = get('--input'), beforeFile = get('--before'), tag = get('--tag');
  const out = get('--out') ?? path.join(process.cwd(), 'scripts', 'migrations');
  if (!input || !fs.existsSync(input)) fail('--input must name the delivery JSON file (one MP object or an array)');
  if (!tag || !/^\d{4}-\d{2}-\d{2}[a-z]{1,2}$/.test(tag)) fail('--tag must look like 2026-11-09a');
  if (!beforeFile || !fs.existsSync(beforeFile)) fail('--before must name a fresh CSV export of these MPs\' mp_biography rows (see the header of scripts/background/delivery-migration.ts); this mode never reads the database');

  // 1. Every MP is checked first; any problem stops the run before a file is written.
  const raw = JSON.parse(fs.readFileSync(input, 'utf8')) as unknown;
  const list = (Array.isArray(raw) ? raw : [raw]) as Fixture[];
  if (!list.length) fail('the file has no MPs');
  const problems = list.flatMap((f, i) => checkFixture(f, `MP ${i + 1} (member ${f?.member_id ?? '?'})`));
  const ids = list.map((f) => f.member_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`member_id given more than once: ${[...new Set(dupes)].join(', ')}`);
  if (problems.length) fail(`stopped, nothing written:\n  ${problems.join('\n  ')}`);

  // 2. The values before, from the export: exactly one row per MP.
  const csv = parseCsv(fs.readFileSync(beforeFile, 'utf8'));
  const need = ['member_id', 'political_bio', 'bio_sources', 'bio_last_reviewed', 'bio_review_reason', 'bio_review_flagged_at', 'bio_visible'];
  const cols = csv.length ? Object.keys(csv[0]) : [];
  const lacking = need.filter((c) => !cols.includes(c));
  if (lacking.length) fail(`stopped, nothing written: the export lacks ${lacking.join(', ')}`);
  const before = new Map<number, Before>();
  for (const id of ids) {
    const rows = csv.filter((r) => Number(r.member_id) === id);
    if (rows.length !== 1) fail(`stopped, nothing written: the export holds ${rows.length} rows for member ${id}, not exactly 1`);
    const r = rows[0];
    if (r.bio_visible !== 't' && r.bio_visible !== 'f') fail(`stopped, nothing written: member ${id}: bio_visible in the export is not t or f`);
    before.set(id, {
      member_id: id, political_bio: r.political_bio, bio_sources: r.bio_sources, bio_last_reviewed: r.bio_last_reviewed,
      bio_review_reason: r.bio_review_reason, bio_review_flagged_at: r.bio_review_flagged_at, bio_visible: r.bio_visible === 't',
      delivery_record: cols.includes('delivery_record') ? r.delivery_record : null,
    });
  }
  for (const b of before.values()) {
    for (const [k, v] of [['bio_sources', b.bio_sources], ['delivery_record', b.delivery_record]] as const) {
      if (v !== null) { try { JSON.parse(v); } catch { fail(`stopped, nothing written: member ${b.member_id}: ${k} in the export is not JSON`); } }
    }
    if (b.bio_last_reviewed !== null && !DAY.test(b.bio_last_reviewed)) fail(`stopped, nothing written: member ${b.member_id}: bio_last_reviewed in the export is not a date`);
  }

  fs.mkdirSync(out, { recursive: true });
  const undoName = `${tag}-delivery-UNDO.sql`, migName = `${tag}-delivery.sql`, rehName = `${tag}-delivery-REHEARSAL.sql`;
  for (const n of [undoName, migName, rehName]) if (fs.existsSync(path.join(out, n))) fail(`${path.join(out, n)} already exists; choose another --tag`);

  const N = ids.length;
  const idList = [...ids].sort((a, b) => a - b).join(', ');
  const sorted = [...list].sort((a, b) => a.member_id - b.member_id);
  const exportName = path.basename(beforeFile);

  // The export's values, as the migration checks them and the UNDO puts them back.
  const beforeRows = sorted.map((f) => {
    const b = before.get(f.member_id)!;
    return `  (${f.member_id}, ${textOrNull(b.political_bio)}, ${jsonOrNull(b.bio_sources)}, ${b.bio_last_reviewed === null ? 'NULL' : `DATE ${lit(b.bio_last_reviewed)}`}, ${textOrNull(b.bio_review_reason)}, ${b.bio_review_flagged_at === null ? 'NULL' : `${lit(b.bio_review_flagged_at)}::timestamptz`}, ${b.bio_visible}, ${jsonOrNull(b.delivery_record)})`;
  });
  const beforeTable = (name: string) => `CREATE TEMP TABLE ${name} (member_id integer PRIMARY KEY, political_bio text, bio_sources jsonb, bio_last_reviewed date,
  bio_review_reason text, bio_review_flagged_at timestamptz, bio_visible boolean NOT NULL, delivery_record jsonb) ON COMMIT DROP;
INSERT INTO ${name} VALUES
${beforeRows.join(',\n')};`;
  const sameAs = (t: string) => `b.political_bio IS NOT DISTINCT FROM ${t}.political_bio AND b.bio_sources IS NOT DISTINCT FROM ${t}.bio_sources
     AND b.bio_last_reviewed IS NOT DISTINCT FROM ${t}.bio_last_reviewed AND b.bio_review_reason IS NOT DISTINCT FROM ${t}.bio_review_reason
     AND b.bio_review_flagged_at IS NOT DISTINCT FROM ${t}.bio_review_flagged_at AND b.bio_visible = ${t}.bio_visible
     AND b.delivery_record IS NOT DISTINCT FROM ${t}.delivery_record`;
  const newRows = sorted.map((f) => `  (${f.member_id}, ${dollar(f.political_bio)}, ${lit(md5(f.political_bio))}, ${dollar(JSON.stringify(f.bio_sources))}::jsonb, ${dollar(JSON.stringify(f.delivery_record))}::jsonb, DATE ${lit(f.checked)})`);
  const newTable = (name: string) => `CREATE TEMP TABLE ${name} (member_id integer PRIMARY KEY, political_bio text NOT NULL, bio_md5 text NOT NULL, bio_sources jsonb NOT NULL,
  delivery_record jsonb NOT NULL, checked date NOT NULL) ON COMMIT DROP;
INSERT INTO ${name} VALUES
${newRows.join(',\n')};`;
  const isNew = (t: string) => `b.political_bio = ${t}.political_bio AND b.bio_sources = ${t}.bio_sources AND b.delivery_record = ${t}.delivery_record
     AND b.bio_last_reviewed = ${t}.checked AND b.bio_review_reason IS NULL AND b.bio_review_flagged_at IS NULL AND b.bio_visible`;
  const exactlyOne = (t: string) => `  FOR r IN SELECT n.member_id, (SELECT count(*) FROM public.mp_biography b WHERE b.member_id = n.member_id) AS c FROM ${t} n LOOP
    IF r.c <> 1 THEN RAISE EXCEPTION 'member_id % matches % rows in mp_biography, expected exactly 1', r.member_id, r.c; END IF;
  END LOOP;`;

  // The migration body (no BEGIN or COMMIT), shared by the migration and the rehearsal.
  const migBody = `-- The column must exist (migration 2026-11-08b) and every MP must match exactly one row.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mp_biography' AND column_name = 'delivery_record') THEN
    RAISE EXCEPTION 'mp_biography.delivery_record does not exist: apply 2026-11-08b-delivery-record.sql first';
  END IF;
END $$;

${newTable('dr_new')}

${beforeTable('dr_export')}

DO $$
DECLARE r record;
BEGIN
${exactlyOne('dr_new')}
  -- Every row still holds exactly the exported values, so the UNDO puts back what is really there.
  IF (SELECT count(*) FROM public.mp_biography b JOIN dr_export x USING (member_id) WHERE ${sameAs('x')}) <> ${N} THEN
    RAISE EXCEPTION 'a row differs from the export "${exportName}" (changed since it was made): export again and regenerate';
  END IF;
END $$;

CREATE TEMP TABLE dr_hash_before ON COMMIT DROP AS SELECT member_id, md5(to_jsonb(b)::text) AS h FROM public.mp_biography b;

UPDATE public.mp_biography b SET
  political_bio = n.political_bio, bio_sources = n.bio_sources, delivery_record = n.delivery_record,
  bio_last_reviewed = n.checked, bio_review_reason = NULL, bio_review_flagged_at = NULL, bio_visible = true
  FROM dr_new n WHERE b.member_id = n.member_id;

DO $$
DECLARE
  changed integer;
  changed_outside integer;
  matching integer;
BEGIN
  SELECT count(*) INTO changed FROM public.mp_biography b JOIN dr_hash_before o USING (member_id) WHERE md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO changed_outside FROM public.mp_biography b JOIN dr_hash_before o USING (member_id)
   WHERE b.member_id NOT IN (${idList}) AND md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO matching FROM public.mp_biography b JOIN dr_new n USING (member_id)
   WHERE ${isNew('n')} AND md5(b.political_bio) = n.bio_md5;
  RAISE NOTICE 'delivery: rows changed %, outside the ${N} %, rows matching the file %', changed, changed_outside, matching;
  IF changed > ${N} THEN RAISE EXCEPTION 'expected at most ${N} rows changed, got %', changed; END IF;
  IF changed_outside <> 0 THEN RAISE EXCEPTION '% rows outside the ${N} changed', changed_outside; END IF;
  IF matching <> ${N} THEN RAISE EXCEPTION 'expected ${N} rows matching the file, got %', matching; END IF;
END $$;`;

  // The UNDO body: puts back the exported values, only where the row still holds exactly this migration's values.
  const undoBody = `${newTable('dru_new')}

${beforeTable('dru_restore')}

DO $$
DECLARE r record;
BEGIN
${exactlyOne('dru_new')}
  IF (SELECT count(*) FROM public.mp_biography b JOIN dru_new n USING (member_id) WHERE ${isNew('n')}) <> ${N} THEN
    RAISE EXCEPTION 'a row no longer holds the ${tag} values (changed since): not undone';
  END IF;
END $$;

CREATE TEMP TABLE dru_hash_before ON COMMIT DROP AS SELECT member_id, md5(to_jsonb(b)::text) AS h FROM public.mp_biography b;

UPDATE public.mp_biography b SET
  political_bio = r.political_bio, bio_sources = r.bio_sources, bio_last_reviewed = r.bio_last_reviewed,
  bio_review_reason = r.bio_review_reason, bio_review_flagged_at = r.bio_review_flagged_at, bio_visible = r.bio_visible,
  delivery_record = r.delivery_record
  FROM dru_restore r WHERE b.member_id = r.member_id;

DO $$
DECLARE
  changed_outside integer;
  restored integer;
BEGIN
  SELECT count(*) INTO changed_outside FROM public.mp_biography b JOIN dru_hash_before o USING (member_id)
   WHERE b.member_id NOT IN (${idList}) AND md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO restored FROM public.mp_biography b JOIN dru_restore r USING (member_id) WHERE ${sameAs('r')};
  RAISE NOTICE 'delivery UNDO: rows outside the ${N} changed %, rows restored exactly %', changed_outside, restored;
  IF changed_outside <> 0 THEN RAISE EXCEPTION '% rows outside the ${N} changed', changed_outside; END IF;
  IF restored <> ${N} THEN RAISE EXCEPTION 'expected ${N} rows restored exactly, got %', restored; END IF;
END $$;`;

  const head = (what: string) => `-- ${tag}: ${what}
-- MPs: ${idList}. Generated by scripts/background/make-background-migration.ts --column delivery from "${path.basename(input)}"
-- (every MP passed lib/delivery-record.ts validate()), with the values before taken from the export "${exportName}"
-- (not committed). It never read the database.`;
  const tx = (body: string, end: 'COMMIT' | 'ROLLBACK') => `\\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

${body}

${end};
`;

  // UNDO first.
  fs.writeFileSync(path.join(out, undoName), `${head(`UNDO of ${migName}: puts back political_bio, bio_sources, bio_last_reviewed, bio_review_reason,
-- bio_review_flagged_at, bio_visible and delivery_record exactly as exported, only where each row still holds the ${tag} values.`)}
-- Guards (RAISE): every member_id matches exactly one row; every row holds the ${tag} values; no other row changes; ${N} rows restored exactly.
${tx(undoBody, 'COMMIT')}`);
  fs.writeFileSync(path.join(out, migName), `${head(`MP biography and delivery record for ${N} MP${N === 1 ? '' : 's'} (owner's approval). For each member_id sets
-- political_bio, bio_sources and delivery_record from the file, bio_last_reviewed = its checked date, bio_review_reason and
-- bio_review_flagged_at = NULL and bio_visible = true. Nothing else changes. Needs 2026-11-08b-delivery-record.sql applied.`)}
-- Guards (RAISE): the column exists; every member_id matches exactly one row; every row still holds the exported values;
-- no row outside these changes; every row then matches the file exactly. Undo: ${undoName}.
${tx(migBody, 'COMMIT')}`);
  fs.writeFileSync(path.join(out, rehName), `${head(`REHEARSAL: ${migName} and then ${undoName} in one transaction, ending in ROLLBACK, so nothing is kept.`)}
-- Expect the migration's NOTICE (rows changed up to ${N}, outside 0, matching ${N}), then the UNDO's (outside 0, restored ${N}), then ROLLBACK.
${tx(`${migBody}\n\n-- Then the UNDO.\n${undoBody}`, 'ROLLBACK')}`);

  console.log(`Wrote ${path.join(out, undoName)} (first), ${path.join(out, migName)} and ${path.join(out, rehName)}.`);
  console.log(`Summary: ${N} MP${N === 1 ? '' : 's'} (${idList}); delivery records with ${sorted.map((f) => (f.delivery_record as { items: unknown[] }).items.length).join(', ')} items; before values from ${exportName}.`);
  console.log(`Expected NOTICE lines: "delivery: rows changed ${N}, outside the ${N} 0, rows matching the file ${N}" and "delivery UNDO: rows outside the ${N} changed 0, rows restored exactly ${N}".`);
}
