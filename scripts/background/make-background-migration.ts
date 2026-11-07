// MP Background load generator (owner, 7 Nov 2026, BGL1): writes a migration and its UNDO for a batch of MP Background
// timelines, from a JSON file keyed by member_id. Reads the database (read only, through psql) and writes files; it never
// changes the database. Apply the migration by hand under the production rules: rehearse it and its UNDO in one transaction
// ending in ROLLBACK, then apply when no deployment is building and no crawl is running.
//
//   npx tsx --tsconfig tsconfig.json scripts/background/make-background-migration.ts --mode new|topup --file <batch json> \
//     --tag <migration tag, e.g. 2026-11-08a> --sources "<header source list>" [--date YYYY-MM-DD]
//
// new:   MPs with no timeline yet. Writes only WHERE background_timeline IS NULL (the 2026-11-07l/m/n pattern).
// topup: MPs who already have a timeline. Each new array is the existing entries plus the new ones, in lib/background-timeline.ts
//        sortTimeline order (phase, then start). A new entry that repeats an existing one (phase, title, organisation, start
//        and end) is left out and listed. An extra "quote" field on an entry is dropped. Stops if an MP has no timeline.
// Both:  every array must pass validate(); the backup of the rows goes to "Claude outputs/backups/<tag>-mp-biography-before.csv";
//        scripts/migrations/<tag>-UNDO.sql is written first, then scripts/migrations/<tag>-background-<mode>.sql. The UNDO puts
//        back the exact arrays and checked dates read at generation time. The checked date is --date, or today in London.
// DATABASE_URL comes from .env.local and is never printed.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validate, sortTimeline, type BackgroundEntry } from '../../lib/background-timeline';

type Mode = 'new' | 'topup';
const ROOT = process.cwd(); // run from the repository root
const BACKUPS = '/Volumes/GoliathSSD/opengovt-work/Claude outputs/backups';

function fail(msg: string): never {
  console.error(`make-background-migration: ${msg}`);
  process.exit(1);
}

function args(): { mode: Mode; file: string; tag: string; sources: string; date: string } {
  const a = process.argv.slice(2);
  const get = (k: string) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const mode = get('--mode'), file = get('--file'), tag = get('--tag'), sources = get('--sources');
  if (mode !== 'new' && mode !== 'topup') fail('--mode must be new or topup');
  if (!file || !fs.existsSync(file)) fail('--file must name the batch JSON file');
  if (!tag || !/^\d{4}-\d{2}-\d{2}[a-z]{1,2}$/.test(tag)) fail('--tag must look like 2026-11-08a');
  if (!sources || !sources.trim()) fail('--sources must list the sources for the header');
  const london = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const date = get('--date') ?? london;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('--date must be YYYY-MM-DD');
  return { mode, file, tag, sources: sources.trim(), date };
}

function databaseUrl(): string {
  if (!fs.existsSync(path.join(ROOT, '.env.local'))) fail('run from the repository root (no .env.local here)');
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) fail('DATABASE_URL is not in .env.local');
  return line.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
}

// One read only query through psql, returning the single text value it selects.
function readOnly(url: string, select: string): string {
  const sql = `BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\n${select};\nROLLBACK;\n`;
  return execFileSync('psql', [url, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const dollar = (json: string) => {
  if (json.includes('$bt$')) fail('a timeline contains "$bt$", which the migration uses to quote it');
  return `$bt$${json}$bt$`;
};
const key = (e: BackgroundEntry) => JSON.stringify([e.phase, e.title, e.organisation ?? null, e.start ?? null, e.end ?? null]);
const n0 = (n: number) => n.toLocaleString('en-GB');

function main() {
  const { mode, file, tag, sources, date } = args();
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const ids = Object.keys(raw).map(Number).filter((n) => Number.isInteger(n) && n > 0).sort((x, y) => x - y);
  if (ids.length !== Object.keys(raw).length) fail('every key must be a member_id');
  if (!ids.length) fail('the file has no timelines');

  // The file's arrays; in topup mode a "quote" field is dropped first.
  const given = new Map<number, BackgroundEntry[]>();
  for (const id of ids) {
    let arr = raw[String(id)];
    if (!Array.isArray(arr)) fail(`member ${id}: not an array`);
    if (mode === 'topup') arr = (arr as Record<string, unknown>[]).map(({ quote: _q, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
    const problems = validate(arr);
    if (problems.length) fail(`member ${id} fails validate():\n  ${problems.join('\n  ')}`);
    given.set(id, arr as BackgroundEntry[]);
  }

  // Live state, read only.
  const url = databaseUrl();
  const totals = JSON.parse(readOnly(url, `SELECT json_build_object('mps', count(*), 'entries', coalesce(sum(jsonb_array_length(background_timeline)), 0))::text FROM public.mp_biography WHERE background_timeline IS NOT NULL`)) as { mps: number; entries: number };
  const current = JSON.parse(readOnly(url, `SELECT coalesce(json_agg(json_build_object('member_id', member_id, 'tl', background_timeline, 'checked', background_last_checked, 'md5', md5(background_timeline::text)) ORDER BY member_id), '[]')::text FROM public.mp_biography WHERE member_id IN (${ids.join(', ')})`)) as { member_id: number; tl: BackgroundEntry[] | null; checked: string | null; md5: string | null }[];
  const byId = new Map(current.map((r) => [r.member_id, r]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) fail(`not in mp_biography: ${missing.join(', ')}`);

  // The arrays to write, and the rejected duplicates in topup mode.
  const target = new Map<number, BackgroundEntry[]>();
  const added = new Map<number, number>();
  const rejects: string[] = [];
  if (mode === 'new') {
    const already = ids.filter((id) => byId.get(id)!.tl !== null);
    if (already.length) fail(`stopped: ${already.length} of these MPs already have a timeline (new mode writes only where it is NULL): ${already.join(', ')}`);
    for (const id of ids) { target.set(id, given.get(id)!); added.set(id, given.get(id)!.length); }
  } else {
    const none = ids.filter((id) => byId.get(id)!.tl === null);
    if (none.length) fail(`stopped: ${none.length} of these MPs have no timeline to top up (use --mode new): ${none.join(', ')}`);
    for (const id of ids) {
      const old = byId.get(id)!.tl!;
      const seen = new Set(old.map(key));
      const fresh: BackgroundEntry[] = [];
      for (const e of given.get(id)!) {
        if (seen.has(key(e))) { rejects.push(`member ${id}: ${e.phase}, "${e.title}", ${e.organisation ?? 'no organisation'}, ${e.start ?? '?'} to ${e.end ?? '?'}`); continue; }
        seen.add(key(e));
        fresh.push(e);
      }
      if (!fresh.length) continue; // nothing new for this MP: left out of the migration
      const merged = sortTimeline([...old, ...fresh]);
      const problems = validate(merged);
      if (problems.length) fail(`member ${id}: the merged timeline fails validate():\n  ${problems.join('\n  ')}`);
      target.set(id, merged);
      added.set(id, fresh.length);
    }
    if (!target.size) fail(`nothing to add: every new entry repeats an existing one (${rejects.length} rejected)`);
  }

  const changing = [...target.keys()].sort((x, y) => x - y);
  const N = changing.length;
  const entriesAdded = changing.reduce((n, id) => n + added.get(id)!, 0);
  const mpsAfter = mode === 'new' ? totals.mps + N : totals.mps;
  const entriesAfter = totals.entries + entriesAdded;
  const idList = changing.join(', ');

  // Backup of the rows, read only.
  fs.mkdirSync(BACKUPS, { recursive: true });
  const backup = path.join(BACKUPS, `${tag}-mp-biography-before.csv`);
  execFileSync('psql', [url, '-X', '-q', '-v', 'ON_ERROR_STOP=1'], {
    input: `BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\n\\copy (SELECT * FROM public.mp_biography WHERE member_id IN (${idList}) ORDER BY member_id) TO ${q(backup)} CSV HEADER\nROLLBACK;\n`,
    encoding: 'utf8',
  });

  const migName = `${tag}-background-${mode}.sql`;
  const undoName = `${tag}-UNDO.sql`;
  const migPath = path.join(ROOT, 'scripts', 'migrations', migName);
  const undoPath = path.join(ROOT, 'scripts', 'migrations', undoName);
  if (fs.existsSync(migPath) || fs.existsSync(undoPath)) fail(`scripts/migrations/${tag}-* already exists; choose another --tag`);

  // The UNDO first: the exact arrays and checked dates read now, put back only where the row still holds this migration's array.
  const restoreRows = changing.map((id) => {
    const r = byId.get(id)!;
    const tl = r.tl === null ? 'NULL' : `${dollar(JSON.stringify(r.tl))}::jsonb`;
    const checked = r.checked === null ? 'NULL' : `DATE ${q(r.checked.slice(0, 10))}`;
    return `  (${id}, ${tl}, ${checked}, md5(${dollar(JSON.stringify(target.get(id)))}::jsonb::text))`;
  });
  const undo = `-- ${tag} UNDO: puts back the background timelines and checked dates of the ${N} MPs changed by ${migName}
-- (member_ids ${idList}), exactly as they were when the migration was generated on ${date}
-- (backup off the repo: "Claude outputs/backups/${tag}-mp-biography-before.csv"). Each row changes only WHERE it still holds the
-- ${tag} array (md5), so a later edit is never overwritten silently. No other row changes.
-- Guards (RAISE): exactly ${N} rows change; nothing else changes; MPs with a timeline ${n0(mpsAfter)} to ${n0(totals.mps)}; ${n0(totals.entries)} entries.
\\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE bt_before ON COMMIT DROP AS
SELECT member_id, md5(to_jsonb(b)::text) AS h FROM public.mp_biography b;

CREATE TEMP TABLE bt_restore (member_id integer PRIMARY KEY, tl jsonb, checked date, cur_md5 text NOT NULL) ON COMMIT DROP;
INSERT INTO bt_restore (member_id, tl, checked, cur_md5) VALUES
${restoreRows.join(',\n')};

DO $$ BEGIN
  IF (SELECT count(*) FROM public.mp_biography b JOIN bt_restore r USING (member_id) WHERE md5(b.background_timeline::text) = r.cur_md5) <> ${N} THEN
    RAISE EXCEPTION 'a timeline is not the ${tag} value (changed since)';
  END IF;
END $$;

UPDATE public.mp_biography b SET background_timeline = r.tl, background_last_checked = r.checked
  FROM bt_restore r WHERE b.member_id = r.member_id AND md5(b.background_timeline::text) = r.cur_md5;

DO $$
DECLARE
  changed integer;
  changed_outside integer;
  restored integer;
  with_timeline integer;
  entry_total integer;
BEGIN
  SELECT count(*) INTO changed FROM public.mp_biography b JOIN bt_before o USING (member_id) WHERE md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO changed_outside FROM public.mp_biography b JOIN bt_before o USING (member_id)
   WHERE b.member_id NOT IN (${idList}) AND md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO restored FROM public.mp_biography b JOIN bt_restore r USING (member_id)
   WHERE b.background_timeline IS NOT DISTINCT FROM r.tl AND b.background_last_checked IS NOT DISTINCT FROM r.checked;
  SELECT count(*) INTO with_timeline FROM public.mp_biography WHERE background_timeline IS NOT NULL;
  SELECT coalesce(sum(jsonb_array_length(background_timeline)), 0) INTO entry_total FROM public.mp_biography WHERE background_timeline IS NOT NULL;
  RAISE NOTICE 'UNDO: rows changed %, outside the ${N} %, rows restored exactly %, MPs with a timeline %, entries %', changed, changed_outside, restored, with_timeline, entry_total;
  IF changed <> ${N} THEN RAISE EXCEPTION 'expected exactly ${N} rows changed, got %', changed; END IF;
  IF changed_outside <> 0 THEN RAISE EXCEPTION '% rows outside the ${N} changed', changed_outside; END IF;
  IF restored <> ${N} THEN RAISE EXCEPTION 'expected ${N} rows restored exactly, got %', restored; END IF;
  IF with_timeline <> ${totals.mps} THEN RAISE EXCEPTION 'expected ${totals.mps} MPs with a timeline, got %', with_timeline; END IF;
  IF entry_total <> ${totals.entries} THEN RAISE EXCEPTION 'expected ${totals.entries} entries, got %', entry_total; END IF;
END $$;

COMMIT;
`;
  fs.writeFileSync(undoPath, undo);

  // Then the migration.
  // In topup mode each row also carries the md5 of the timeline read at generation: the row is written only if it still holds it.
  const newRows = changing.map((id) => `  (${id}, ${target.get(id)!.length}, ${dollar(JSON.stringify(target.get(id)))}, ${mode === 'topup' ? q(byId.get(id)!.md5!) : 'NULL'})`);
  const where = mode === 'new' ? 'b.background_timeline IS NULL' : 'md5(b.background_timeline::text) = n.old_md5';
  const oldTable = mode === 'topup' ? `
CREATE TEMP TABLE bt_old ON COMMIT DROP AS
SELECT member_id, jsonb_array_length(background_timeline) AS n, background_timeline AS tl FROM public.mp_biography WHERE member_id IN (${idList});
` : '';
  const preCheck = mode === 'new'
    ? `  IF EXISTS (SELECT 1 FROM public.mp_biography WHERE member_id IN (${idList}) AND background_timeline IS NOT NULL) THEN RAISE EXCEPTION 'a new MP already has a timeline'; END IF;`
    : `  IF EXISTS (SELECT 1 FROM public.mp_biography WHERE member_id IN (${idList}) AND background_timeline IS NULL) THEN RAISE EXCEPTION 'an MP to top up has no timeline'; END IF;
  IF (SELECT count(*) FROM public.mp_biography b JOIN bt_new n USING (member_id) WHERE md5(b.background_timeline::text) = n.old_md5) <> ${N} THEN RAISE EXCEPTION 'a timeline is not the one read at generation (changed since)'; END IF;`;
  const updateFrom = 'FROM bt_new n';
  const extraDecl = mode === 'topup' ? '  kept_wrong integer;\n  length_wrong integer;\n' : '  existing_changed integer;\n';
  const extraChecks = mode === 'new'
    ? `  SELECT count(*) INTO existing_changed FROM public.mp_biography b JOIN bt_before o USING (member_id)
   WHERE o.had AND md5(coalesce(b.background_timeline::text, '')) IS DISTINCT FROM o.th;`
    : `  -- Every entry the MP had before is still there, as many times as before.
  SELECT count(*) INTO kept_wrong FROM (
    SELECT o.member_id, e, count(*) AS c FROM bt_old o, jsonb_array_elements(o.tl) e GROUP BY o.member_id, e
  ) x JOIN public.mp_biography b USING (member_id)
   WHERE (SELECT count(*) FROM jsonb_array_elements(b.background_timeline) m WHERE m = x.e) <> x.c;
  SELECT count(*) INTO length_wrong FROM public.mp_biography b JOIN bt_old o USING (member_id) JOIN bt_new n USING (member_id)
   WHERE jsonb_array_length(b.background_timeline) <> n.n;`;
  const noticeExtra = mode === 'new' ? 'existing timelines changed %' : 'earlier entries missing or repeated %, lengths wrong %';
  const noticeArgs = mode === 'new' ? 'existing_changed' : 'kept_wrong, length_wrong';
  const raiseExtra = mode === 'new'
    ? `  IF existing_changed <> 0 THEN RAISE EXCEPTION '% of the ${totals.mps} existing timelines changed', existing_changed; END IF;`
    : `  IF kept_wrong <> 0 THEN RAISE EXCEPTION '% earlier entries are missing or repeated', kept_wrong; END IF;
  IF length_wrong <> 0 THEN RAISE EXCEPTION '% MPs do not have their old length plus the additions', length_wrong; END IF;`;
  const what = mode === 'new'
    ? `Sets background_timeline (${n0(entriesAdded)} entries, copied exactly from "${path.basename(file)}", which is not committed)`
    : `Adds ${n0(entriesAdded)} entries from "${path.basename(file)}" (not committed) to the timelines of these MPs, each new array the existing
-- entries plus the new ones in sortTimeline order (phase, then start); ${rejects.length} entries repeating an existing one were left out`;
  const mig = `-- ${tag}: MP Background timelines, ${mode === 'new' ? `${N} more current MPs` : `top up for ${N} MPs`} (owner's approval).
-- ${what} and
-- background_last_checked = ${date} for member_ids ${idList},
-- each only WHERE ${mode === 'new' ? 'background_timeline IS NULL' : 'the stored timeline is still the one read at generation (md5)'}. Every array passed lib/background-timeline.ts validate().
-- Sources: ${sources}
-- Nothing else changes. No code change. Backup of the ${N} rows, off the repo: "Claude outputs/backups/${tag}-mp-biography-before.csv".
-- Guards (RAISE): exactly ${N} rows change, all of them these ${N}; ${mode === 'new' ? `the ${n0(totals.mps)} existing timelines are unchanged (md5)` : 'every row outside them is unchanged; every earlier entry is still present exactly as often as before; each new length is the old one plus the additions'};
-- MPs with a timeline ${n0(totals.mps)} to ${n0(mpsAfter)}; each array equals the generated one exactly; ${n0(entriesAfter)} entries in all afterwards.
-- Generated by scripts/background/make-background-migration.ts --mode ${mode} on ${date}. Undo: ${undoName}.
\\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE bt_new (member_id integer PRIMARY KEY, n integer NOT NULL, tl jsonb NOT NULL, old_md5 text) ON COMMIT DROP;
INSERT INTO bt_new (member_id, n, tl, old_md5) VALUES
${newRows.join(',\n')};
${oldTable}
DO $$ BEGIN
  IF (SELECT count(*) FROM public.mp_biography WHERE member_id IN (${idList})) <> ${N} THEN RAISE EXCEPTION 'expected ${N} biography rows'; END IF;
${preCheck}
  IF (SELECT count(*) FROM public.mp_biography WHERE background_timeline IS NOT NULL) <> ${totals.mps} THEN RAISE EXCEPTION 'expected ${totals.mps} MPs with a timeline before'; END IF;
  IF (SELECT coalesce(sum(jsonb_array_length(background_timeline)), 0) FROM public.mp_biography WHERE background_timeline IS NOT NULL) <> ${totals.entries} THEN RAISE EXCEPTION 'expected ${totals.entries} entries before'; END IF;
END $$;

CREATE TEMP TABLE bt_before ON COMMIT DROP AS
SELECT member_id, md5(to_jsonb(b)::text) AS h, background_timeline IS NOT NULL AS had, md5(coalesce(background_timeline::text, '')) AS th
  FROM public.mp_biography b;

UPDATE public.mp_biography b SET background_timeline = n.tl, background_last_checked = DATE ${q(date)}
  ${updateFrom} WHERE b.member_id = n.member_id AND ${where};

DO $$
DECLARE
  changed integer;
  changed_outside integer;
${extraDecl}  matching integer;
  with_timeline integer;
  entry_total integer;
BEGIN
  SELECT count(*) INTO changed FROM public.mp_biography b JOIN bt_before o USING (member_id) WHERE md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
  SELECT count(*) INTO changed_outside FROM public.mp_biography b JOIN bt_before o USING (member_id)
   WHERE b.member_id NOT IN (${idList}) AND md5(to_jsonb(b)::text) IS DISTINCT FROM o.h;
${extraChecks}
  SELECT count(*) INTO matching FROM public.mp_biography b JOIN bt_new n USING (member_id)
   WHERE b.background_timeline = n.tl AND jsonb_array_length(b.background_timeline) = n.n AND b.background_last_checked = DATE ${q(date)};
  SELECT count(*) INTO with_timeline FROM public.mp_biography WHERE background_timeline IS NOT NULL;
  SELECT coalesce(sum(jsonb_array_length(background_timeline)), 0) INTO entry_total FROM public.mp_biography WHERE background_timeline IS NOT NULL;
  RAISE NOTICE 'rows changed %, outside the ${N} %, ${noticeExtra}, rows matching the file %, MPs with a timeline %, entries %',
    changed, changed_outside, ${noticeArgs}, matching, with_timeline, entry_total;
  IF changed <> ${N} THEN RAISE EXCEPTION 'expected exactly ${N} rows changed, got %', changed; END IF;
  IF changed_outside <> 0 THEN RAISE EXCEPTION '% rows outside the ${N} changed', changed_outside; END IF;
${raiseExtra}
  IF matching <> ${N} THEN RAISE EXCEPTION 'expected ${N} rows matching the file, got %', matching; END IF;
  IF with_timeline <> ${mpsAfter} THEN RAISE EXCEPTION 'expected ${mpsAfter} MPs with a timeline after, got %', with_timeline; END IF;
  IF entry_total <> ${entriesAfter} THEN RAISE EXCEPTION 'expected ${entriesAfter} entries, got %', entry_total; END IF;
END $$;

COMMIT;
`;
  fs.writeFileSync(migPath, mig);

  const expectedNotice = mode === 'new'
    ? `NOTICE:  rows changed ${N}, outside the ${N} 0, existing timelines changed 0, rows matching the file ${N}, MPs with a timeline ${mpsAfter}, entries ${entriesAfter}`
    : `NOTICE:  rows changed ${N}, outside the ${N} 0, earlier entries missing or repeated 0, lengths wrong 0, rows matching the file ${N}, MPs with a timeline ${mpsAfter}, entries ${entriesAfter}`;
  console.log(`Wrote scripts/migrations/${undoName} (first) and scripts/migrations/${migName}; backup ${backup}.`);
  console.log(`Expected NOTICE lines:\n  migration: ${expectedNotice}\n  UNDO:      NOTICE:  UNDO: rows changed ${N}, outside the ${N} 0, rows restored exactly ${N}, MPs with a timeline ${totals.mps}, entries ${totals.entries}`);
  console.log(`Summary: ${mode} mode, ${N} MPs, ${n0(entriesAdded)} entries added (${n0(totals.mps)} to ${n0(mpsAfter)} MPs, ${n0(totals.entries)} to ${n0(entriesAfter)} entries), ${rejects.length} duplicates rejected.`);
  for (const r of rejects) console.log(`  rejected: ${r}`);
}

main();
