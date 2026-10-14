#!/usr/bin/env node
// Build the lobbying index (migration scripts/migrations/2026-10-13i-lobbying-index.sql).
//
//   1. Reads GOV.UK's official organisations list (Open Government Licence) and makes sure
//      every public body has a lobby_orgs record (source 'govuk', its exact title and, where
//      safe, its abbreviation as spellings). These names also protect commas inside official
//      titles ("Department for Business, Energy and Industrial Strategy") when splitting.
//   2. Reads every ministers' meeting, splits roundtable entries into separate organisations,
//      normalises each name and matches it against lobby_org_aliases; names in
//      lobby_excluded_names are marked excluded; the rest are unmatched (kept, searchable).
//   3. Turns the published date into a real date and flags dates after today or unreadable.
//   4. Writes lobby_meeting_mentions in full (new rows first, then old rows removed).
//
// DRY RUN BY DEFAULT: prints the report, writes NOTHING (including GOV.UK organisations).
// Pass --write to save, only after the dry-run report has been approved.
// Also writes data/lobbying/frequent-names.csv (names mentioned 10+ times) for the hand review.
//
// Usage:
//   node scripts/build-lobbying-index.js > lobbying-index-dryrun.txt 2>&1
//   node scripts/build-lobbying-index.js --write > lobbying-index-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { normaliseName, splitOrganisations, slugify } = require('./lib/lobby-names');

const WRITE = process.argv.includes('--write');
const GOVUK_ORGS = 'https://www.gov.uk/api/organisations';
const UA = { 'User-Agent': 'opengovt-import/1.0 (+https://opengovt.uk)' };
const TODAY = new Date().toISOString().slice(0, 10);
const FREQUENT = 10;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function readAll(table, cols, order) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(cols);
    for (const c of order) q = q.order(c, { ascending: true, nullsFirst: true });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function govukOrganisations() {
  const out = [];
  let url = `${GOVUK_ORGS}?page=1`;
  for (let guard = 0; url && guard < 200; guard++) {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`GOV.UK organisations ${res.status} for ${url}`);
    const j = await res.json();
    for (const r of j.results || []) out.push({ title: r.title, abbreviation: r.details && r.details.abbreviation, slug: r.details && r.details.slug, status: r.details && r.details.govuk_status });
    url = j.next_page_url || null;
  }
  return out;
}

function parseDate(raw) {
  const s = String(raw || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { date: null, flag: 'unreadable' };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { date: null, flag: 'unreadable' };
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  return { date: iso, flag: iso > TODAY ? 'future' : null };
}

(async () => {
  // ── 1. GOV.UK organisations ────────────────────────────────────────────────
  const gov = await govukOrganisations();
  console.log(`GOV.UK organisations: ${gov.length}`);
  const [orgs, aliases, excluded] = await Promise.all([
    readAll('lobby_orgs', 'id, slug, name, source', ['id']),
    readAll('lobby_org_aliases', 'alias_norm, org_id, source', ['alias_norm']),
    readAll('lobby_excluded_names', 'norm_name, reason', ['norm_name']),
  ]);
  const aliasMap = new Map(aliases.map((a) => [a.alias_norm, a.org_id]));
  const excludedSet = new Set(excluded.map((e) => e.norm_name));
  const slugs = new Set(orgs.map((o) => o.slug));
  console.log(`existing: ${orgs.length} organisations, ${aliases.length} spellings, ${excluded.length} excluded names`);

  // Abbreviations are used as spellings only when unique, 3+ characters, and not a plain word.
  const abbrCount = new Map();
  for (const g of gov) { const a = normaliseName(g.abbreviation); if (a) abbrCount.set(a, (abbrCount.get(a) || 0) + 1); }
  const newGovOrgs = [];
  const newGovAliases = [];
  const govNames = new Set();
  for (const g of gov) {
    const n = normaliseName(g.title);
    if (!n) continue;
    govNames.add(n);
    if (aliasMap.has(n)) continue;
    let slug = slugify(g.title);
    while (slugs.has(slug)) slug = `${slug}-gov`;
    slugs.add(slug);
    const rec = { slug, name: g.title, org_type: 'public_body', source: 'govuk', reviewed: false, notes: `GOV.UK organisation${g.slug ? ` /government/organisations/${g.slug}` : ''}${g.status && g.status !== 'live' ? ` (${g.status})` : ''}` };
    const spellings = [{ alias_norm: n, alias_example: g.title, source: 'govuk' }];
    const a = normaliseName(g.abbreviation);
    if (a && a.length >= 3 && abbrCount.get(a) === 1 && a !== n && !aliasMap.has(a) && /[a-z]/.test(a) && !/\s/.test(a)) spellings.push({ alias_norm: a, alias_example: g.abbreviation, source: 'govuk' });
    newGovOrgs.push(rec);
    newGovAliases.push({ slug, spellings });
    // Provisional ids so the dry run can match against these names too.
    for (const sp of spellings) aliasMap.set(sp.alias_norm, `new:${slug}`);
  }
  console.log(`GOV.UK organisations to add: ${newGovOrgs.length} (with ${newGovAliases.reduce((s, x) => s + x.spellings.length, 0)} spellings)`);

  const isKnown = (norm) => aliasMap.has(norm) || govNames.has(norm) || excludedSet.has(norm);

  // ── 2. Meetings → mentions ─────────────────────────────────────────────────
  const meetings = await readAll('ministers_meetings', 'minister_name, minister_dept, meeting_date, organisation, purpose, quarter, source_publication_slug', ['minister_name', 'minister_dept', 'meeting_date', 'organisation', 'purpose', 'quarter', 'source_publication_slug']);
  console.log(`\nministers' meetings read: ${meetings.length}`);
  const keyCount = new Map();
  const mentions = [];
  let blank = 0, roundtables = 0, titleJoins = 0, bracketWhole = 0, bracketMatches = 0;
  const flags = { future: [], unreadable: [] };
  const titleExamples = new Set(), bracketExamples = new Set(), bracketMatchExamples = new Set();
  // A name with a bracketed part removed: "Universities UK (incl. Russell Group)" -> "Universities UK".
  const stripBrackets = (t) => String(t).replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  for (const m of meetings) {
    const base = [m.minister_name, m.minister_dept, m.meeting_date, m.organisation, m.purpose, m.quarter].map((x) => String(x ?? '')).join('|');
    const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 20);
    const n = (keyCount.get(hash) || 0) + 1; keyCount.set(hash, n);
    const meeting_key = n === 1 ? hash : `${hash}-${n}`; // identical published rows stay separate
    const { date, flag } = parseDate(m.meeting_date);
    if (flag) flags[flag].push(`${m.meeting_date} (${m.minister_name})`);
    const names = splitOrganisations(m.organisation, isKnown);
    if (!names.length) { blank++; continue; }
    if (names.length > 1) roundtables++;
    for (const nm of names) {
      if (!nm.includes(',')) continue;
      // A comma left after removing brackets means an official title with a comma was kept
      // whole; otherwise the comma was inside a bracketed description.
      if (stripBrackets(nm).includes(',')) { titleJoins++; if (titleExamples.size < 8) titleExamples.add(nm); }
      else { bracketWhole++; if (bracketExamples.size < 8) bracketExamples.add(nm); }
    }
    names.forEach((raw, i) => {
      const norm = normaliseName(raw);
      if (!norm) return;
      let orgRef = aliasMap.get(norm);
      // Fallback: no match as published, so try it without the bracketed part. Only an exact
      // match to a known spelling counts; anything else stays unmatched for the hand review.
      if (orgRef == null && !excludedSet.has(norm) && /[([]/.test(raw)) {
        const short = normaliseName(stripBrackets(raw));
        if (short && short !== norm && aliasMap.has(short) && !excludedSet.has(short)) {
          orgRef = aliasMap.get(short);
          bracketMatches++;
          if (bracketMatchExamples.size < 8) bracketMatchExamples.add(`${raw} -> ${short}`);
        }
      }
      mentions.push({
        meeting_key, position: i + 1,
        minister_name: m.minister_name, minister_dept: m.minister_dept || null,
        meeting_date: date, meeting_date_raw: m.meeting_date || null, date_flag: flag,
        purpose: m.purpose || null, quarter: m.quarter || null, source_publication_slug: m.source_publication_slug || null,
        raw_name: raw.slice(0, 500), norm_name: norm,
        org_ref: orgRef ?? null,
        match_type: excludedSet.has(norm) ? 'excluded' : orgRef != null ? 'alias' : 'unmatched',
      });
    });
  }
  const by = (t) => mentions.filter((x) => x.match_type === t).length;
  console.log(`blank entries (no organisation): ${blank}; entries naming several organisations: ${roundtables}`);
  console.log(`organisation mentions: ${mentions.length} (matched ${by('alias')}, excluded ${by('excluded')}, unmatched ${by('unmatched')})`);
  console.log(`names kept whole because an official title contains a comma: ${titleJoins}${titleExamples.size ? ` - e.g. ${[...titleExamples].join(' | ')}` : ''}`);
  console.log(`names kept whole because the comma is inside brackets (a description, not a list): ${bracketWhole}${bracketExamples.size ? ` - e.g. ${[...bracketExamples].join(' | ')}` : ''}`);
  console.log(`matched only after removing a bracketed part: ${bracketMatches}${bracketMatchExamples.size ? ` - e.g. ${[...bracketMatchExamples].join(' | ')}` : ''}`);
  console.log(`dates after today: ${flags.future.length}${flags.future.length ? ` - ${flags.future.slice(0, 10).join('; ')}` : ''}`);
  console.log(`dates that cannot be read: ${flags.unreadable.length}${flags.unreadable.length ? ` - e.g. ${flags.unreadable.slice(0, 10).join('; ')}` : ''}`);

  const counts = new Map();
  for (const x of mentions) {
    if (x.match_type === 'excluded') continue;
    const c = counts.get(x.norm_name) || { n: 0, examples: new Map(), matched: x.match_type === 'alias' };
    c.n++; c.examples.set(x.raw_name, (c.examples.get(x.raw_name) || 0) + 1);
    counts.set(x.norm_name, c);
  }
  const frequent = [...counts.entries()].filter(([, c]) => c.n >= FREQUENT).sort((a, b) => b[1].n - a[1].n);
  const freqUnmatched = frequent.filter(([, c]) => !c.matched);
  console.log(`\ndistinct names: ${counts.size}; named ${FREQUENT}+ times: ${frequent.length} (already matched ${frequent.length - freqUnmatched.length}, to review ${freqUnmatched.length}), covering ${frequent.reduce((s, [, c]) => s + c.n, 0)} mentions`);
  console.log('most-mentioned names still to review:');
  for (const [n, c] of freqUnmatched.slice(0, 40)) console.log(`  ${String(c.n).padStart(5)}  ${n}  (e.g. "${[...c.examples.entries()].sort((a, b) => b[1] - a[1])[0][0]}")`);

  const outDir = path.join(process.cwd(), 'data', 'lobbying');
  fs.mkdirSync(outDir, { recursive: true });
  const csvEsc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = ['norm_name,mentions,already_matched,most_common_spelling,other_spellings'];
  for (const [n, c] of frequent) {
    const ex = [...c.examples.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e);
    lines.push([n, c.n, c.matched ? 'yes' : 'no', ex[0], ex.slice(1, 6).join(' | ')].map(csvEsc).join(','));
  }
  fs.writeFileSync(path.join(outDir, 'frequent-names.csv'), lines.join('\n') + '\n');
  console.log(`\nwrote data/lobbying/frequent-names.csv (${frequent.length} names) for the hand review`);

  const seenKeys = new Set(); const dupes = [];
  for (const x of mentions) { const k = `${x.meeting_key}#${x.position}`; if (seenKeys.has(k)) dupes.push(k); else seenKeys.add(k); }
  if (dupes.length) console.log(`DUPLICATE keys (must be fixed before writing): ${dupes.slice(0, 10).join(', ')}`);

  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  if (dupes.length) throw new Error('duplicate keys');

  // ── Write ──────────────────────────────────────────────────────────────────
  console.log('\n--- Writing ---');
  for (let i = 0; i < newGovOrgs.length; i += 500) {
    const { error } = await db.from('lobby_orgs').insert(newGovOrgs.slice(i, i + 500));
    if (error) throw new Error(`lobby_orgs insert: ${error.message}`);
  }
  const fresh = await readAll('lobby_orgs', 'id, slug', ['id']);
  const idBySlug = new Map(fresh.map((o) => [o.slug, o.id]));
  const aliasRows = newGovAliases.flatMap((g) => g.spellings.map((s) => ({ ...s, org_id: idBySlug.get(g.slug) })));
  for (let i = 0; i < aliasRows.length; i += 500) {
    const { error } = await db.from('lobby_org_aliases').upsert(aliasRows.slice(i, i + 500), { onConflict: 'alias_norm', ignoreDuplicates: true });
    if (error) throw new Error(`lobby_org_aliases insert: ${error.message}`);
  }
  console.log(`  lobby_orgs: ${newGovOrgs.length} GOV.UK organisations added; lobby_org_aliases: ${aliasRows.length} spellings added`);

  const resolve = (ref) => (ref == null ? null : typeof ref === 'string' && ref.startsWith('new:') ? idBySlug.get(ref.slice(4)) ?? null : ref);
  const runStart = new Date().toISOString();
  const rows = mentions.map(({ org_ref, ...x }) => ({ ...x, org_id: resolve(org_ref), built_at: runStart }));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from('lobby_meeting_mentions').upsert(rows.slice(i, i + 1000), { onConflict: 'meeting_key,position' });
    if (error) throw new Error(`lobby_meeting_mentions upsert: ${error.message}`);
  }
  const { error: d, count } = await db.from('lobby_meeting_mentions').delete({ count: 'exact' }).lt('built_at', runStart);
  if (d) throw new Error(`stale delete: ${d.message}`);
  console.log(`  lobby_meeting_mentions: ${rows.length} saved; ${count || 0} no longer in the meetings data removed`);
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
