// Publish one editorial straight to the database, the master copy since EDITORIALS_FROM_DB=1 (owner, 29 Oct 2026,
// "go stage C"). No copying into lib/editorials and no deploy.
//
//   npx tsx scripts/publish-editorial.ts <draft.ts> [--topic <slug>]... [--allow <name>]... [--rehearse | --apply]
//
// The draft exports an EditorialEntry (default export, or a named `piece`), as in "Claude outputs/drafts/<slug>.ts".
// Updating an existing piece needs a draft from scripts/export-editorial.ts (its `exportedFrom` stamp) no older than the
// live row (working rule 8); a new piece needs none.
// --rehearse (the default) runs the write in a transaction and rolls it back; --apply commits it and then refreshes
// the live site with scripts/revalidate.js (tags editorials, editorial:<slug> and editorial-links:mp|bill:<id> for every
// MP and bill the piece names before or after, and every page that lists the piece). --rehearse prints that list.
// --topic places a new piece at the end of each topic named; on an update the stored topics are kept unless the
// --topic set differs (kept topics keep their position, added ones go at the end). --allow names a proper name that
// may contain a hyphen (e.g. --allow "Manningham-Buller").
//
// Stops before writing if any check fails: slug format (new: 6 to 16 lower case letters or digits); summary 22 words or fewer; headline 70 characters or fewer
// (a warning above 60); no hyphens or dashes in our wording outside quotations, URLs and --allow names; every
// relatedMemberIds a current member in mps; every relatedDeptSlugs, relatedBillIds and topic slug real; every
// evidence URL https; every Open Govt evidence URL pointing at an id that exists.
//
// Safeguards: reads run in a READ ONLY transaction; the write is one statement in its own transaction with
// SET LOCAL statement_timeout = '60s' and lock_timeout = '5s'; the row counts before and after are read separately,
// outside it. DATABASE_URL comes from .env.local and is never printed.

import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EditorialEntry } from '../lib/editorials/types';
import { topics } from '../lib/topics';
import { departments } from '../lib/departments/index';
import { rowFor, canon, SQL_TYPES, dollarTag, type Placement } from './sync-editorials-to-db';

config({ path: '.env.local', quiet: true });

// ---- arguments
const args = process.argv.slice(2);
let draftPath = '';
const topicArgs: string[] = [];
const allow: string[] = [];
let apply = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => { const v = args[++i]; if (!v) fail(`${a} needs a value`); return v; };
  if (a === '--topic') topicArgs.push(next());
  else if (a === '--allow') allow.push(next());
  else if (a === '--apply') apply = true;
  else if (a === '--rehearse') apply = false;
  else if (a.startsWith('--')) fail(`unknown option ${a}`);
  else if (!draftPath) draftPath = a;
  else fail(`one draft only (also given ${a})`);
}
if (!draftPath) fail('usage: npx tsx scripts/publish-editorial.ts <draft.ts> [--topic <slug>]... [--allow <name>]... [--rehearse | --apply]');

function fail(message: string): never {
  console.error(`publish-editorial: ${message}`);
  process.exit(1);
}

// ---- database, through psql (the URL is passed as an argument, never printed)
function psql(sql: string): string {
  const url = process.env.DATABASE_URL;
  if (!url) fail('DATABASE_URL is not set in .env.local');
  const r = spawnSync('psql', [url, '-X', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  if (r.status !== 0) fail(`database error: ${(r.stderr || '').replace(/postgres(ql)?:\/\/\S+/gi, '[url]').trim()}`);
  return r.stdout;
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
const textArray = (xs: string[]) => `ARRAY[${xs.map(lit).join(',')}]::text[]`;
const intArray = (xs: number[]) => `ARRAY[${xs.map((n) => String(Math.trunc(n))).join(',')}]::int[]`;
function readJson<T>(select: string): T {
  const out = psql(`BEGIN READ ONLY;\nSET LOCAL statement_timeout = '60s';\nSELECT (${select})::text;\nROLLBACK;\n`);
  const line = out.split('\n').find((l) => l.startsWith('{') || l.startsWith('['));
  if (!line) fail('no result from the database read');
  return JSON.parse(line) as T;
}
const rowCount = () => Number(readJson<{ n: number }>(`SELECT json_build_object('n', count(*)) FROM public.editorials`).n);

// ---- checks
const problems: string[] = [];
const warnings: string[] = [];

// Our wording: every text a reader sees as ours. Evidence record titles and quoted responses are other people's words.
function ourWording(p: EditorialEntry): [string, string][] {
  const out: [string, string][] = [];
  const add = (where: string, v: unknown) => { if (typeof v === 'string' && v) out.push([where, v]); };
  add('headline', p.headline); add('standfirst', p.standfirst); add('summary', p.summary); add('kicker', p.kicker);
  add('heroAlt', p.heroAlt); add('evidence.contacted', p.evidence?.contacted);
  (p.updateNote ?? []).forEach((u, i) => add(`updateNote[${i}].text`, u.text));
  (p.explore ?? []).forEach((e, i) => { add(`explore[${i}].label`, e.label); add(`explore[${i}].note`, e.note); });
  const skip = new Set(['type', 'url', 'href', 'src', 'image', 'imageUrl', 'photo', 'date', 'slug', 'id']);
  const walk = (where: string, v: unknown) => {
    if (typeof v === 'string') add(where, v);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(`${where}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!skip.has(k)) walk(`${where}.${k}`, x);
  };
  walk('body', p.body);
  return out;
}

const DASH = /[-‐-―−]/;
function strayDash(text: string): string | null {
  let t = text.replace(/https?:\/\/\S+/g, ' ').replace(/"[^"]*"/g, '""').replace(/“[^”]*”/g, '“”');
  for (const name of allow) t = t.split(name).join(' ');
  const m = DASH.exec(t);
  return m ? t.slice(Math.max(0, m.index - 30), m.index + 30) : null;
}

function evidenceUrls(p: EditorialEntry): string[] {
  const urls: string[] = [];
  for (const r of p.evidence?.recordsReviewed ?? []) {
    const text = typeof r === 'string' ? r : r.text;
    if (typeof r !== 'string') { if (r.url) urls.push(r.url); for (const l of r.links ?? []) urls.push(l.url); }
    urls.push(...(text.match(/\bhttps?:\/\/[^\s'"<>)]+/g) ?? []));
  }
  return urls;
}

async function main() {
  const abs = resolve(draftPath);
  const mod = (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
  const loaded = (mod.default as { default?: unknown })?.default ?? mod.default ?? mod.piece;
  const exportedFrom = (mod.default as { exportedFrom?: unknown })?.exportedFrom ?? mod.exportedFrom;
  const piece = loaded as EditorialEntry | undefined;
  if (!piece || typeof piece !== 'object' || typeof piece.slug !== 'string') fail(`${draftPath} does not export an EditorialEntry (default export or \`piece\`)`);
  const kind = piece.kind === 'briefing' ? 'briefings' : 'editorials';
  console.log(`publish-editorial: ${piece.slug} (${kind.slice(0, -1)}), ${apply ? 'APPLY' : 'rehearsal, ends ROLLBACK'}`);

  // Local checks.
  if (!piece.headline || !piece.standfirst || !piece.publishedAt || !piece.authorByline || !Array.isArray(piece.body) || piece.body.length === 0) {
    problems.push('headline, standfirst, publishedAt, authorByline and a body are all required');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(piece.publishedAt ?? '')) problems.push(`publishedAt "${piece.publishedAt}" is not YYYY-MM-DD`);
  const words = (piece.summary ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (!piece.summary) problems.push('summary is missing');
  else if (words > 22) problems.push(`summary is ${words} words (22 at most)`);
  const chars = [...(piece.headline ?? '')].length;
  if (chars > 70) problems.push(`headline is ${chars} characters (70 at most)`);
  else if (chars > 60) warnings.push(`headline is ${chars} characters (aim for 60 or fewer)`);
  for (const [where, text] of ourWording(piece)) {
    const hit = strayDash(text);
    if (hit) problems.push(`hyphen or dash in ${where}: "...${hit}..." (rephrase, quote it, or --allow the name)`);
  }
  const urls = evidenceUrls(piece);
  for (const u of urls) if (!u.startsWith('https://')) problems.push(`evidence URL is not https: ${u}`);
  const topicSlugs = new Set(topics.map((t) => t.slug));
  for (const t of topicArgs) if (!topicSlugs.has(t)) problems.push(`no topic "${t}"`);
  const deptSlugs = new Set(departments.map((d) => d.slug));
  for (const d of piece.relatedDeptSlugs ?? []) if (!deptSlugs.has(d)) problems.push(`no department "${d}"`);
  const memberIds = piece.relatedMemberIds ?? [];
  const billIds = piece.relatedBillIds ?? [];
  for (const n of [...memberIds, ...billIds]) if (!Number.isInteger(n)) problems.push(`${n} is not a whole number id`);

  // Open Govt evidence URLs: the section and id of each.
  const og: { url: string; section: string; id: string }[] = [];
  for (const u of urls) {
    const m = u.match(/^https?:\/\/(?:www\.)?opengovt\.uk(\/[^?#]*)?/i);
    if (!m) continue;
    const [section = '', id = ''] = (m[1] ?? '/').split('/').filter(Boolean).map(decodeURIComponent);
    og.push({ url: u, section, id });
  }
  const ids = (section: string) => og.filter((o) => o.section === section && o.id).map((o) => o.id);
  const intIds = (section: string) => ids(section).filter((x) => /^\d+$/.test(x)).map(Number);
  for (const o of og) if (['mps', 'bills', 'committees'].includes(o.section) && o.id && !/^\d+$/.test(o.id)) problems.push(`Open Govt URL with a non number id: ${o.url}`);

  // Database reads, one READ ONLY transaction. A new slug must be 6 to 16 lower case letters or digits (house style is
  // ten); an update may keep an older hyphenated slug.
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(piece.slug);
  if (!slugOk) fail(`slug "${piece.slug}" is not lower case letters, digits and single hyphens`);
  const memberLookup = [...new Set([...memberIds, ...intIds('mps')])];
  const db = readJson<{
    rows: number; max_order: number | null; topic_max: Record<string, number>; existing: Record<string, unknown> | null;
    members: { id: number; current: boolean | null; name: string }[]; bills: number[]; councils: string[]; news: string[];
    editorials: string[]; committees: number[];
  }>(`SELECT json_build_object(
    'rows', (SELECT count(*) FROM public.editorials),
    'max_order', (SELECT max(registry_order) FROM public.editorials),
    'topic_max', (SELECT coalesce(json_object_agg(k, m), '{}') FROM (SELECT k, max((e.topic_positions->>k)::int) m FROM public.editorials e, jsonb_object_keys(e.topic_positions) k GROUP BY k) t),
    'existing', (SELECT to_jsonb(e) - 'search_vec' FROM public.editorials e WHERE slug = ${lit(piece.slug)}),
    'members', (SELECT coalesce(json_agg(json_build_object('id', member_id, 'current', current_member, 'name', name)), '[]') FROM public.mps WHERE member_id = ANY(${intArray(memberLookup)})),
    'bills', (SELECT coalesce(json_agg(id), '[]') FROM public.bill WHERE id = ANY(${intArray([...new Set([...billIds, ...intIds('bills')])])})),
    'councils', (SELECT coalesce(json_agg(slug), '[]') FROM public.councils WHERE slug = ANY(${textArray(ids('councils'))})),
    'news', (SELECT coalesce(json_agg(news_slug), '[]') FROM public.press_releases WHERE news_slug = ANY(${textArray(ids('news'))})),
    'editorials', (SELECT coalesce(json_agg(slug), '[]') FROM public.editorials WHERE slug = ANY(${textArray([...ids('editorials'), ...ids('briefings')])})),
    'committees', (SELECT coalesce(json_agg(id), '[]') FROM public.committees WHERE id = ANY(${intArray(intIds('committees'))}))
  )`);
  const existing = db.existing;
  // Working rule 8 (owner, 30 Oct 2026): an update starts from the live row. The draft must come from
  // scripts/export-editorial.ts, and the live row must not have been updated since that export.
  if (existing) {
    const liveAt = String(existing.updated_at ?? '');
    if (typeof exportedFrom !== 'string' || !exportedFrom) problems.push(`this draft was not exported from the live row; run npx tsx scripts/export-editorial.ts ${piece.slug} first (it overwrites the draft), then make the edits again`);
    else if (liveAt && Date.parse(liveAt) > Date.parse(exportedFrom)) problems.push(`the live row was updated at ${liveAt}, after this draft was exported (${exportedFrom}); export it again and redo the edits`);
  }
  if (!existing && !/^[a-z0-9]{6,16}$/.test(piece.slug)) problems.push(`a new slug must be 6 to 16 lower case letters or digits ("${piece.slug}")`);

  const members = new Map(db.members.map((m) => [Number(m.id), m]));
  for (const id of memberIds) {
    const m = members.get(id);
    if (!m) problems.push(`relatedMemberIds ${id} is not in mps`);
    else if (m.current !== true) problems.push(`relatedMemberIds ${id} (${m.name}) is not a current member`);
  }
  const bills = new Set(db.bills.map(Number));
  for (const id of billIds) if (!bills.has(id)) problems.push(`relatedBillIds ${id} is not in bill`);
  const has: Record<string, (id: string) => boolean> = {
    mps: (id) => members.has(Number(id)),
    bills: (id) => bills.has(Number(id)),
    committees: (id) => db.committees.map(Number).includes(Number(id)),
    councils: (id) => db.councils.includes(id),
    news: (id) => db.news.includes(id),
    editorials: (id) => id === piece.slug || db.editorials.includes(id),
    briefings: (id) => id === piece.slug || db.editorials.includes(id),
    departments: (id) => deptSlugs.has(id),
    topics: (id) => topicSlugs.has(id),
  };
  for (const o of og) {
    if (!o.id) warnings.push(`Open Govt URL without an id, not checked: ${o.url}`);
    else if (!has[o.section]) warnings.push(`Open Govt section /${o.section} has no id check: ${o.url}`);
    else if (!has[o.section](o.id)) problems.push(`Open Govt URL points at an id that does not exist: ${o.url}`);
  }

  for (const w of warnings) console.log(`  warning: ${w}`);
  if (problems.length) {
    console.log(`publish-editorial: REFUSED, ${problems.length} problem${problems.length === 1 ? '' : 's'}, nothing written`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log(`  checks passed: summary ${words} words, headline ${chars} characters, ${urls.length} evidence URLs (${og.length} Open Govt), ${memberIds.length} members, ${billIds.length} bills, ${(piece.relatedDeptSlugs ?? []).length} departments`);

  // Placement: a new piece goes last in the registry and last in each --topic; an update keeps its place.
  const storedTopics = existing ? ((existing.topic_slugs as string[] | null) ?? []) : [];
  const storedPositions = existing ? ((existing.topic_positions as Record<string, number> | null) ?? {}) : {};
  const wanted = existing && topicArgs.length === 0 ? storedTopics : [...new Set(topicArgs)];
  const positions: Record<string, number> = {};
  for (const t of wanted) positions[t] = storedPositions[t] ?? ((db.topic_max[t] ?? -1) + 1);
  const place: Placement = {
    topic_slugs: topics.map((t) => t.slug).filter((t) => wanted.includes(t)),
    unpublished: existing ? existing.unpublished === true : false,
    registry_order: existing ? (existing.registry_order as number | null) : null,
    topic_positions: positions,
  };
  if (!existing && wanted.length === 0) console.log('  warning: no --topic given; the piece will be on no topic page');
  const row = rowFor(piece, place);

  // What changes.
  const changed = existing ? Object.keys(row).filter((k) => canon((row as Record<string, unknown>)[k]) !== canon(existing[k])) : Object.keys(row);
  if (existing) {
    console.log(`  update of an existing row (registry_order ${existing.registry_order} kept): ${changed.length} column${changed.length === 1 ? '' : 's'} would change${changed.length ? `: ${changed.join(', ')}` : ''}`);
    if (changed.length === 0) { console.log('publish-editorial: nothing to write (0 changes)'); return; }
  } else {
    console.log(`  new row: registry_order ${(db.max_order ?? -1) + 1} (after ${db.rows} rows, the ${(db.max_order ?? -1) + 2}th piece); topic positions ${JSON.stringify(positions)}`);
  }

  // The write: one statement in its own transaction.
  const json = JSON.stringify([row]);
  const tag = dollarTag(json);
  const cols = Object.keys(row);
  for (const c of cols) if (!SQL_TYPES[c]) fail(`no SQL type for ${c}`);
  const select = cols.map((c) => (c === 'registry_order' ? `coalesce(r.registry_order, (SELECT coalesce(max(registry_order), -1) + 1 FROM public.editorials))` : `r.${c}`));
  const sql = `BEGIN;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
INSERT INTO public.editorials (${cols.join(', ')}, synced_at, updated_at)
SELECT ${select.join(', ')}, now(), now() FROM jsonb_to_recordset($${tag}$${json}$${tag}$::jsonb) AS r(${cols.map((c) => `${c} ${SQL_TYPES[c]}`).join(', ')})
ON CONFLICT (slug) DO UPDATE SET ${[...cols.filter((c) => c !== 'slug'), 'synced_at', 'updated_at'].map((c) => `${c} = EXCLUDED.${c}`).join(', ')}
RETURNING json_build_object('slug', slug, 'inserted', xmax = 0, 'registry_order', registry_order, 'topic_positions', topic_positions)::text;
${apply ? 'COMMIT' : 'ROLLBACK'};
`;
  const before = db.rows;
  const out = psql(sql);
  const result = out.split('\n').find((l) => l.startsWith('{'));
  if (!result) fail('the write returned no row');
  const r = JSON.parse(result) as { inserted: boolean; registry_order: number; topic_positions: Record<string, number> };
  const after = rowCount();
  console.log(`  ${apply ? 'wrote' : 'would write'} 1 row (${r.inserted ? 'insert' : 'update'}), registry_order ${r.registry_order}, topic_positions ${JSON.stringify(r.topic_positions)}`);
  console.log(`  rows before ${before}, after ${after}${apply ? '' : ' (rolled back)'}`);
  // What the publish refreshes (cache Stage 2a, owner, 30 Oct 2026): the piece, the full list ('editorials': home,
  // topics, departments, read next, feed, sitemap), and the linked reads of every MP and bill the piece names, both
  // before the change (from the stored row, so a removed link is refreshed too) and after it.
  const oldMembers = ((existing?.related_member_ids as number[] | null) ?? []);
  const oldBills = ((existing?.related_bill_ids as number[] | null) ?? []);
  const oldDepts = ((existing?.related_dept_slugs as string[] | null) ?? []);
  const allMembers = [...new Set([...oldMembers, ...memberIds])].sort((a, b) => a - b);
  const allBills = [...new Set([...oldBills, ...billIds])].sort((a, b) => a - b);
  const tags = ['editorials', `editorial:${piece.slug}`, ...allMembers.map((m) => `editorial-links:mp:${m}`), ...allBills.map((b) => `editorial-links:bill:${b}`)];
  const paths = [
    `/${kind}/${piece.slug}`, `/${kind}/${piece.slug}/sources`, '/reports', '/', '/feed.xml', '/sitemap.xml',
    ...[...new Set([...storedTopics, ...wanted])].map((t) => `/topics/${t}`),
    ...[...new Set([...oldDepts, ...(piece.relatedDeptSlugs ?? [])])].map((d) => `/departments/${d}`),
    ...allMembers.flatMap((m) => [`/mps/${m}`, `/mps/${m}/reports`]),
    ...allBills.map((b) => `/bills/${b}`),
  ];
  console.log(`  ${apply ? 'refreshing' : 'would refresh'} ${tags.length} tags: ${tags.join(', ')}`);
  console.log(`  and ${paths.length} paths: ${paths.join(', ')}`);
  if (!apply) { console.log('publish-editorial: rehearsal done, nothing kept. Run again with --apply to publish.'); return; }

  const refresh = spawnSync('node', ['scripts/revalidate.js', ...tags.flatMap((t) => ['--tag', t]), ...paths.flatMap((p) => ['--path', p])], { encoding: 'utf8' });
  console.log(`  refresh (${paths.length} paths, ${tags.length} tags): ${(refresh.stdout || refresh.stderr || '').trim()}`);
  if (refresh.status !== 0) fail(`published, but the refresh failed; run it again: node scripts/revalidate.js ${tags.map((t) => `--tag ${t}`).join(' ')}`);
  console.log('publish-editorial: published. Now check the live page.');
}

main().catch((e) => fail((e as Error).message));
