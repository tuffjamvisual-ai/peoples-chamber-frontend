// Sync lib/editorials/ registry into the public.editorials Postgres table.
//
// Run via Vercel prebuild:  "prebuild": "npx tsx scripts/sync-editorials-to-db.ts"
//                           (add to package.json scripts)
//
// Writes only happen on production Vercel deploys (VERCEL_ENV === 'production').
// On preview, development, or local (VERCEL_ENV unset), the script logs and
// exits 0 without touching the database — even if service-role credentials
// happen to be present in the environment.
//
// Exits non-zero on any DB error on a production deploy, so a broken sync
// fails the build visibly.
//
// 29 Oct 2026 (owner's approval, "go stage A"): every EditorialEntry field is written (migration 2026-10-29b), plus
// topic_slugs (lib/topics.ts editorialSlugs membership), unpublished and updated_at (set only when a row's content
// changes). The round trip check is scripts/checks/editorials-db-roundtrip.ts.
// 29 Oct 2026 (option 1): also registry_order (position in the registry) and topic_positions (position in each
// topic's editorialSlugs), migration 2026-10-29c, so pages read from the database can keep today's order.
// Local mode, for guarded backfills: --sql <dir> writes <dir>/rehearse.sql (ends ROLLBACK) and <dir>/apply.sql (ends
// COMMIT), one transaction with the 60 s and 5 s timeouts, run with psql. It reads the current rows (read only) to set
// updated_at, and writes nothing itself.

import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { editorials, UNPUBLISHED_EDITORIALS } from '../lib/editorials/index';
import type { Block, EditorialEntry } from '../lib/editorials/types';
import { topics } from '../lib/topics';

config({ path: '.env.local', quiet: true });

const sqlDirIndex = process.argv.indexOf('--sql');
const SQL_DIR = sqlDirIndex >= 0 ? process.argv[sqlDirIndex + 1] : null;
if (sqlDirIndex >= 0 && !SQL_DIR) { console.error('sync-editorials: --sql needs a directory'); process.exit(1); }

// Vercel sets VERCEL_ENV to 'production' | 'preview' | 'development'.
// Writes are intentionally restricted to production deploys only; local mode only writes SQL files.
const VERCEL_ENV = process.env.VERCEL_ENV;

if (VERCEL_ENV !== 'production' && !SQL_DIR) {
  console.log(
    `sync-editorials: VERCEL_ENV=${VERCEL_ENV ?? '(unset)'} — ` +
    `writes only run on production deploys, skipping`
  );
  process.exit(0);
}

// On a production deploy these must be present; missing = real misconfiguration.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'sync-editorials: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY ' +
    'missing on production deploy — failing build'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractBodyText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'bioLine':
      case 'pullQuote':
      case 'cta':
        parts.push(block.text);
        break;
      case 'heading':
        parts.push(block.text);
        break;
      case 'statBlock':
        parts.push([block.stat, block.label, block.context].filter(Boolean).join(' '));
        break;
      case 'dataBlock':
        parts.push([block.headlineFigure, block.context].filter(Boolean).join(' '));
        break;
      case 'councilEntry':
        parts.push([block.name, block.topLine, ...block.paragraphs, block.verdict].join(' '));
        break;
      case 'mpEntry':
        parts.push([block.name, block.topLine, ...block.paragraphs, block.verdict].join(' '));
        break;
      // signature: no readable text
    }
  }
  return parts.join('\n\n');
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// evidence.lastChecked is written either as 2026-10-29 or as 29 October 2026; the date, or null if neither.
function lastCheckedDate(v: string | undefined): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  const mi = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  return m && mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

// The database row for one piece: every EditorialEntry field. An absent optional field is NULL, except the three
// older related_* arrays, which keep their existing convention of an empty array.
const REGISTRY_ORDER = new Map(Object.keys(editorials).map((slug, i) => [slug, i]));
function topicPositions(slug: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of topics) { const i = t.editorialSlugs.indexOf(slug); if (i >= 0) out[t.slug] = i; }
  return out;
}

function buildRow(piece: EditorialEntry) {
  return {
    slug:                    piece.slug,
    headline:                piece.headline,
    standfirst:              piece.standfirst,
    summary:                 piece.summary ?? null,
    published_at:            piece.publishedAt,
    author_byline:           piece.authorByline,
    kind:                    piece.kind   ?? null,
    kicker:                  piece.kicker ?? null,
    body_text:               extractBodyText(piece.body),
    body_json:               piece.body as unknown as object,
    related_dept_slugs:      piece.relatedDeptSlugs  ?? [],
    related_member_ids:      piece.relatedMemberIds  ?? [],
    related_bill_ids:        piece.relatedBillIds    ?? [],
    opinion:                 piece.opinion ?? null,
    hero_image:              piece.heroImage ?? null,
    hero_alt:                piece.heroAlt ?? null,
    evidence:                (piece.evidence ?? null) as object | null,
    last_checked:            lastCheckedDate(piece.evidence?.lastChecked),
    update_note:             (piece.updateNote ?? null) as object | null,
    related_programme_slugs: piece.relatedProgrammeSlugs ?? null,
    explore:                 (piece.explore ?? null) as object | null,
    read_next:               piece.readNext ?? null,
    topic_slugs:             topics.filter((t) => t.editorialSlugs.includes(piece.slug)).map((t) => t.slug),
    unpublished:             UNPUBLISHED_EDITORIALS.includes(piece.slug),
    registry_order:          REGISTRY_ORDER.get(piece.slug) ?? null,
    topic_positions:         topicPositions(piece.slug) as object,
    // search_vec is GENERATED ALWAYS AS STORED — not supplied in upsert
  };
}
type Row = ReturnType<typeof buildRow>;

// A stable string of a row's content, for deciding whether updated_at moves.
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

async function currentRows(): Promise<Map<string, Record<string, unknown>>> {
  const cols = 'slug, headline, standfirst, summary, published_at, author_byline, kind, kicker, body_text, body_json, related_dept_slugs, related_member_ids, related_bill_ids, opinion, hero_image, hero_alt, evidence, last_checked, update_note, related_programme_slugs, explore, read_next, topic_slugs, unpublished, registry_order, topic_positions, updated_at';
  const { data, error } = await supabase.from('editorials').select(cols).range(0, 999);
  if (error) throw new Error(`reading current rows: ${error.message}`);
  return new Map(((data ?? []) as unknown as Record<string, unknown>[]).map((r) => [r.slug as string, r]));
}

// updated_at: now when the content differs from the stored row (or the row is new), else the stored value.
function withTimes(row: Row, stored: Record<string, unknown> | undefined, now: string) {
  const { updated_at: storedUpdated, ...storedContent } = stored ?? {};
  const same = stored && canon(row) === canon(Object.fromEntries(Object.keys(row).map((k) => [k, (storedContent as Record<string, unknown>)[k]])));
  return { ...row, synced_at: now, updated_at: same ? (storedUpdated as string | null) : now };
}

function sqlFiles(rows: ReturnType<typeof withTimes>[], dir: string) {
  // One JSON literal, dollar quoted with a tag that cannot occur in the content.
  const json = JSON.stringify(rows);
  let tag = 'editorials_json';
  while (json.includes(`$${tag}$`)) tag += '_x';
  const cols = Object.keys(rows[0]);
  const types: Record<string, string> = {
    slug: 'text', headline: 'text', standfirst: 'text', summary: 'text', published_at: 'date', author_byline: 'text', kind: 'text',
    kicker: 'text', body_text: 'text', body_json: 'jsonb', related_dept_slugs: 'text[]', related_member_ids: 'int[]',
    related_bill_ids: 'int[]', opinion: 'boolean', hero_image: 'text', hero_alt: 'text', evidence: 'jsonb', last_checked: 'date',
    update_note: 'jsonb', related_programme_slugs: 'text[]', explore: 'jsonb', read_next: 'text[]', topic_slugs: 'text[]',
    unpublished: 'boolean', registry_order: 'int', topic_positions: 'jsonb', synced_at: 'timestamptz', updated_at: 'timestamptz',
  };
  for (const c of cols) if (!types[c]) throw new Error(`no SQL type for ${c}`);
  const sql = (end: string) => `BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
INSERT INTO public.editorials (${cols.join(', ')})
SELECT ${cols.join(', ')} FROM jsonb_to_recordset($${tag}$${json}$${tag}$::jsonb) AS r(${cols.map((c) => `${c} ${types[c]}`).join(', ')})
ON CONFLICT (slug) DO UPDATE SET ${cols.filter((c) => c !== 'slug').map((c) => `${c} = EXCLUDED.${c}`).join(', ')};
DELETE FROM public.editorials WHERE slug IN (${UNPUBLISHED_EDITORIALS.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')});
${end}
`;
  writeFileSync(`${dir}/rehearse.sql`, sql('ROLLBACK;'));
  writeFileSync(`${dir}/apply.sql`, sql('COMMIT;'));
}

async function main() {
  const entries = Object.values(editorials);
  console.log(`sync-editorials: syncing ${entries.length} entries${SQL_DIR ? ` (SQL files to ${SQL_DIR}, nothing written)` : ''}`);

  const now = new Date().toISOString();
  const stored = await currentRows();
  const rows = entries.map((piece) => withTimes(buildRow(piece), stored.get(piece.slug), now));
  const changed = rows.filter((r) => r.updated_at === now).length;
  console.log(`  ${stored.size} rows stored; ${rows.filter((r) => !stored.has(r.slug)).length} new; ${changed} with changed content`);

  if (SQL_DIR) {
    sqlFiles(rows, SQL_DIR);
    console.log(`  wrote ${SQL_DIR}/rehearse.sql and ${SQL_DIR}/apply.sql`);
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    const { error } = await supabase
      .from('editorials')
      .upsert(row, { onConflict: 'slug' });

    if (error) {
      console.error(`  FAIL  ${row.slug}  ${error.message}`);
      failed++;
    } else {
      console.log(`  ok    ${row.slug}`);
      ok++;
    }
  }

  // Unpublished pieces leave the database copy too, so search and department pages stop listing them.
  const { error: delError, count } = await supabase
    .from('editorials')
    .delete({ count: 'exact' })
    .in('slug', UNPUBLISHED_EDITORIALS);
  if (delError) {
    console.error(`  FAIL  removing unpublished pieces  ${delError.message}`);
    failed++;
  } else {
    console.log(`  removed ${count ?? 0} unpublished (${UNPUBLISHED_EDITORIALS.join(', ')})`);
  }

  console.log(`\nsync-editorials: ${ok} ok, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('sync-editorials: fatal error:', e);
  process.exit(1);
});
