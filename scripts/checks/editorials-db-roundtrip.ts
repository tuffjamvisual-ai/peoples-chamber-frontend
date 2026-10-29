// Round trip check of the editorials table against the code (owner's approval, 29 Oct 2026, "go stage A"). Read only.
// For every editorial in the registry (lib/editorials), rebuilds an EditorialEntry from its database row and deep
// compares it with the code object (object key order ignored), and compares topic_slugs with lib/topics.ts
// editorialSlugs membership. Also reports rows that are not in the registry, and unpublished flags.
//   npx tsx scripts/checks/editorials-db-roundtrip.ts
// Exit 0 when every editorial is identical, 1 otherwise.
//
// Reading a row back: a NULL column is an absent field; the three older related_* arrays store an absent field as an
// empty array, so an empty one is read back as absent (no editorial sets an explicitly empty array, checked 29 Oct).

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { editorials, UNPUBLISHED_EDITORIALS } from '../../lib/editorials/index';
import type { EditorialEntry } from '../../lib/editorials/types';
import { topics } from '../../lib/topics';

config({ path: '.env.local', quiet: true });

type DbRow = Record<string, unknown>;

function fromRow(r: DbRow): EditorialEntry {
  const e: Record<string, unknown> = {
    slug: r.slug,
    headline: r.headline,
    standfirst: r.standfirst,
    publishedAt: r.published_at,
    authorByline: r.author_byline,
    body: r.body_json,
  };
  const optional: [string, string][] = [
    ['summary', 'summary'], ['kind', 'kind'], ['kicker', 'kicker'], ['opinion', 'opinion'], ['heroImage', 'hero_image'],
    ['heroAlt', 'hero_alt'], ['evidence', 'evidence'], ['updateNote', 'update_note'], ['relatedProgrammeSlugs', 'related_programme_slugs'],
    ['explore', 'explore'], ['readNext', 'read_next'],
  ];
  for (const [field, col] of optional) if (r[col] !== null && r[col] !== undefined) e[field] = r[col];
  for (const [field, col] of [['relatedDeptSlugs', 'related_dept_slugs'], ['relatedMemberIds', 'related_member_ids'], ['relatedBillIds', 'related_bill_ids']]) {
    if (Array.isArray(r[col]) && (r[col] as unknown[]).length > 0) e[field] = r[col];
  }
  return e as unknown as EditorialEntry;
}

function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are needed (.env.local)');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from('editorials').select('*').range(0, 999);
  if (error) throw new Error(`reading editorials: ${error.message}`);
  const rows = new Map(((data ?? []) as DbRow[]).map((r) => [r.slug as string, r]));

  const differences: string[] = [];
  let identical = 0;
  const entries = Object.values(editorials);
  for (const piece of entries) {
    const row = rows.get(piece.slug);
    if (!row) { differences.push(`${piece.slug}: no database row`); continue; }
    const rebuilt = fromRow(row) as unknown as Record<string, unknown>;
    const code = piece as unknown as Record<string, unknown>;
    const fields = [...new Set([...Object.keys(code), ...Object.keys(rebuilt)])].filter((f) => canon(code[f]) !== canon(rebuilt[f]));
    const expectTopics = topics.filter((t) => t.editorialSlugs.includes(piece.slug)).map((t) => t.slug);
    if (canon(row.topic_slugs) !== canon(expectTopics)) fields.push('topic_slugs');
    if (row.unpublished !== false) fields.push('unpublished');
    if (fields.length) differences.push(`${piece.slug}: ${fields.join(', ')}`);
    else identical++;
  }
  const extra = [...rows.keys()].filter((s) => !editorials[s]);
  for (const s of extra) differences.push(`${s}: database row not in the registry${UNPUBLISHED_EDITORIALS.includes(s) ? ' (unpublished)' : ''}`);

  console.log(`editorials round trip: ${entries.length} compared, ${identical} identical, ${rows.size} database rows`);
  for (const d of differences) console.log(`  ${d}`);
  process.exit(identical === entries.length && extra.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(`editorials round trip: ${(e as Error).message}`); process.exit(1); });
