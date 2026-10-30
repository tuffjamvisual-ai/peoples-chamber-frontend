// Export a live editorial to its draft file (working rule 8, owner, 30 Oct 2026): before editing or republishing an
// article, the live database row is written to "Claude outputs/drafts/<slug>.ts" (overwriting the draft), so edits start
// from the master copy. The draft carries `exportedFrom`, the row's updated_at at export; scripts/publish-editorial.ts
// refuses to update a row that was updated after that.
//
//   npx tsx scripts/export-editorial.ts <slug>
//
// Read only (one READ ONLY transaction). DATABASE_URL comes from .env.local and is never printed.
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local', quiet: true });

const slug = process.argv[2];
function fail(message: string): never {
  console.error(`export-editorial: ${message}`);
  process.exit(1);
}
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('usage: npx tsx scripts/export-editorial.ts <slug>');

const url = process.env.DATABASE_URL;
if (!url) fail('DATABASE_URL is not set in .env.local');
const sql = `BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\nSELECT (to_jsonb(e) - 'search_vec')::text FROM public.editorials e WHERE slug = '${slug.replace(/'/g, "''")}';\nROLLBACK;\n`;
const r = spawnSync('psql', [url, '-X', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 1 << 26 });
if (r.status !== 0) fail(`database error: ${(r.stderr || '').replace(/postgres(ql)?:\/\/\S+/gi, '[url]').trim()}`);
const line = r.stdout.split('\n').find((l) => l.startsWith('{'));
if (!line) fail(`no editorial "${slug}"`);
const row = JSON.parse(line) as Record<string, unknown>;

// The row back into an EditorialEntry, as lib/editorials-source.ts does (NULL is an absent field; the three older
// related_* arrays store absent as empty).
const e: Record<string, unknown> = {
  slug: row.slug, headline: row.headline, standfirst: row.standfirst, publishedAt: row.published_at, authorByline: row.author_byline, body: row.body_json,
};
const optional: [string, string][] = [
  ['summary', 'summary'], ['kind', 'kind'], ['kicker', 'kicker'], ['opinion', 'opinion'], ['heroImage', 'hero_image'], ['heroAlt', 'hero_alt'],
  ['evidence', 'evidence'], ['updateNote', 'update_note'], ['relatedProgrammeSlugs', 'related_programme_slugs'], ['explore', 'explore'], ['readNext', 'read_next'],
];
for (const [field, col] of optional) if (row[col] !== null && row[col] !== undefined) e[field] = row[col];
for (const [field, col] of [['relatedDeptSlugs', 'related_dept_slugs'], ['relatedMemberIds', 'related_member_ids'], ['relatedBillIds', 'related_bill_ids']]) {
  if (Array.isArray(row[col]) && (row[col] as unknown[]).length > 0) e[field] = row[col];
}

const updatedAt = String(row.updated_at ?? '');
const topicsOf = Object.keys((row.topic_positions as Record<string, number> | null) ?? {});
const out = `// Exported from the live database row by scripts/export-editorial.ts at ${new Date().toISOString()}.
// Edit this copy, then publish it with scripts/publish-editorial.ts${topicsOf.map((t) => ` --topic ${t}`).join('')}.
// exportedFrom is the row's updated_at at export: the publish refuses if the live row has changed since.
import type { EditorialEntry } from './types';

export const exportedFrom = ${JSON.stringify(updatedAt)};

const piece: EditorialEntry = ${JSON.stringify(e, null, 2)};

export default piece;
`;
mkdirSync('Claude outputs/drafts', { recursive: true });
const path = `Claude outputs/drafts/${slug}.ts`;
writeFileSync(path, out);
console.log(`export-editorial: wrote ${path} (live row updated_at ${updatedAt}${row.unpublished ? ', UNPUBLISHED' : ''}; topics: ${topicsOf.join(', ') || 'none'})`);
