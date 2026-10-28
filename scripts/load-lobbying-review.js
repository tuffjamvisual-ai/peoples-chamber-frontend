#!/usr/bin/env node
// Loads one hand-review batch for the lobbying index into the database.
//
// DRY RUN BY DEFAULT: prints what would change and writes NOTHING. Pass --write to save,
// only after the dry-run report has been approved.
//
// The batch is a CSV in data/lobbying-review/ (kept in Git, so every decision is on record):
//   spelling,decision,org_name,org_type,notes
//   spelling  the name as normalised by scripts/lib/lobby-names.js (normalised again here)
//   decision  org      -> this spelling is the organisation org_name, of type org_type
//             same_as  -> this spelling means org_name, which is an org row in the same batch
//                         or an organisation already in lobby_orgs
//             exclude  -> not an organisation; added to lobby_excluded_names (notes = reason)
//
// Organisations are found by slug (from org_name). One that already exists keeps its type
// and source; it only gains the spelling and is marked reviewed. A spelling that already
// points to a DIFFERENT organisation is reported and left alone (never moved silently).
//
// After --write, rebuild the mentions so every meeting picks up the decisions:
//   node scripts/build-lobbying-index.js --write > lobbying-index-write.txt 2>&1
//
// Usage:
//   node scripts/load-lobbying-review.js data/lobbying-review/batch-01.csv
//   node scripts/load-lobbying-review.js data/lobbying-review/batch-01.csv --write

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { normaliseName, slugify } = require('./lib/lobby-names');

const WRITE = process.argv.includes('--write');
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const TYPES = ['company', 'trade_body', 'union', 'charity', 'public_body', 'campaign', 'think_tank', 'professional_body', 'academic', 'media', 'other'];

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }

// Minimal CSV reader: quoted fields, doubled quotes, commas inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function readAll(table, cols, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(cols);
    for (const c of order) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

(async () => {
  if (!file) fail('give the batch file, e.g. data/lobbying-review/batch-01.csv');
  if (!fs.existsSync(file)) fail(`file not found: ${file}`);
  const batch = parseCsv(fs.readFileSync(file, 'utf8'));
  console.log(`${file}: ${batch.length} decisions${WRITE ? '' : ' (DRY RUN)'}`);

  // ── Check the file ─────────────────────────────────────────────────────────
  const problems = [];
  const seen = new Set();
  for (const [i, r] of batch.entries()) {
    const line = i + 2;
    r.norm = normaliseName(r.spelling);
    if (!r.norm) problems.push(`line ${line}: empty spelling`);
    if (seen.has(r.norm)) problems.push(`line ${line}: "${r.norm}" appears twice`);
    seen.add(r.norm);
    if (!['org', 'same_as', 'exclude'].includes(r.decision)) problems.push(`line ${line}: unknown decision "${r.decision}"`);
    if (r.decision === 'org' && !TYPES.includes(r.org_type)) problems.push(`line ${line}: unknown org_type "${r.org_type}"`);
    if (r.decision !== 'exclude' && !r.org_name) problems.push(`line ${line}: org_name is empty`);
    if (r.decision === 'exclude' && !r.notes) problems.push(`line ${line}: exclude needs a reason in notes`);
  }

  const [orgs, aliases, excluded] = await Promise.all([
    readAll('lobby_orgs', 'id, slug, name, org_type, source, reviewed', ['id']),
    readAll('lobby_org_aliases', 'alias_norm, org_id', ['alias_norm']),
    readAll('lobby_excluded_names', 'norm_name', ['norm_name']),
  ]);
  const orgBySlug = new Map(orgs.map((o) => [o.slug, o]));
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const aliasMap = new Map(aliases.map((a) => [a.alias_norm, a.org_id]));
  const excludedSet = new Set(excluded.map((e) => e.norm_name));

  const batchOrgSlugs = new Set(batch.filter((r) => r.decision === 'org').map((r) => slugify(r.org_name)));
  for (const r of batch.filter((x) => x.decision === 'same_as')) {
    const s = slugify(r.org_name);
    if (!batchOrgSlugs.has(s) && !orgBySlug.has(s)) problems.push(`same_as "${r.spelling}": no organisation "${r.org_name}" in this batch or the database`);
  }
  if (problems.length) { console.log('PROBLEMS (nothing done):'); for (const p of problems) console.log(`  ${p}`); process.exit(1); }

  // ── Plan ───────────────────────────────────────────────────────────────────
  const newOrgs = new Map();      // slug -> row to insert
  const reviewExisting = new Set(); // ids of existing orgs to mark reviewed
  const newAliases = [];          // { alias_norm, slug, alias_example }
  const newExcluded = [];
  const skipped = [];
  for (const r of batch) {
    if (r.decision === 'exclude') {
      if (aliasMap.has(r.norm)) { skipped.push(`"${r.norm}" is already a spelling of ${orgById.get(aliasMap.get(r.norm))?.name}; not excluded`); continue; }
      if (excludedSet.has(r.norm)) { skipped.push(`"${r.norm}" already excluded`); continue; }
      newExcluded.push({ norm_name: r.norm, reason: r.notes });
      continue;
    }
    const slug = slugify(r.org_name);
    const existing = orgBySlug.get(slug);
    if (r.decision === 'org') {
      if (existing) {
        if (!existing.reviewed) reviewExisting.add(existing.id);
        if (existing.org_type !== r.org_type) skipped.push(`"${existing.name}" already exists as ${existing.org_type} (${existing.source}); type ${r.org_type} not applied`);
      } else if (!newOrgs.has(slug)) {
        newOrgs.set(slug, { slug, name: r.org_name, org_type: r.org_type, source: 'manual', reviewed: true, reviewed_at: new Date().toISOString(), notes: r.notes || null });
      }
    }
    if (excludedSet.has(r.norm)) { skipped.push(`"${r.norm}" is on the excluded list; not added as a spelling`); continue; }
    const current = aliasMap.get(r.norm);
    if (current != null) {
      const cur = orgById.get(current);
      if (cur && cur.slug === slug) continue; // already right
      skipped.push(`"${r.norm}" already means ${cur ? cur.name : `org ${current}`}; not moved to ${r.org_name}`);
      continue;
    }
    newAliases.push({ alias_norm: r.norm, slug, alias_example: r.spelling });
  }

  console.log(`\nnew organisations: ${newOrgs.size}`);
  const byType = {};
  for (const o of newOrgs.values()) byType[o.org_type] = (byType[o.org_type] || 0) + 1;
  console.log(`  by type: ${Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(', ')}`);
  console.log(`existing organisations marked reviewed: ${reviewExisting.size}`);
  console.log(`new spellings: ${newAliases.length}`);
  for (const a of newAliases.filter((x) => batch.find((r) => r.norm === x.alias_norm).decision === 'same_as')) console.log(`  "${a.alias_norm}" -> ${a.slug}`);
  console.log(`new excluded names: ${newExcluded.length}${newExcluded.length ? ` (${newExcluded.map((e) => e.norm_name).join(', ')})` : ''}`);
  console.log(`left alone: ${skipped.length}`);
  for (const s of skipped) console.log(`  ${s}`);

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }

  // ── Write ──────────────────────────────────────────────────────────────────
  console.log('\n--- Writing ---');
  if (newOrgs.size) {
    const { error } = await db.from('lobby_orgs').insert([...newOrgs.values()]);
    if (error) throw new Error(`lobby_orgs insert: ${error.message}`);
  }
  if (reviewExisting.size) {
    const { error } = await db.from('lobby_orgs').update({ reviewed: true, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in('id', [...reviewExisting]);
    if (error) throw new Error(`lobby_orgs reviewed update: ${error.message}`);
  }
  const fresh = await readAll('lobby_orgs', 'id, slug', ['id']);
  const idBySlug = new Map(fresh.map((o) => [o.slug, o.id]));
  const aliasRows = newAliases.map((a) => ({ alias_norm: a.alias_norm, org_id: idBySlug.get(a.slug), alias_example: a.alias_example, source: 'manual' }));
  if (aliasRows.some((a) => a.org_id == null)) throw new Error('an organisation was not found after insert');
  if (aliasRows.length) {
    const { error } = await db.from('lobby_org_aliases').insert(aliasRows);
    if (error) throw new Error(`lobby_org_aliases insert: ${error.message}`);
  }
  if (newExcluded.length) {
    const { error } = await db.from('lobby_excluded_names').insert(newExcluded);
    if (error) throw new Error(`lobby_excluded_names insert: ${error.message}`);
  }
  console.log(`  organisations added: ${newOrgs.size}; marked reviewed: ${reviewExisting.size}; spellings added: ${aliasRows.length}; excluded names added: ${newExcluded.length}`);
  console.log('\nWRITE complete. Now rebuild the mentions:\n  node scripts/build-lobbying-index.js --write > lobbying-index-write.txt 2>&1');
})().catch((e) => fail(e.message));
