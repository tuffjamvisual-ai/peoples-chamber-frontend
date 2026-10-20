#!/usr/bin/env node
// Build the lobbying index (migration scripts/migrations/2026-10-13i-lobbying-index.sql).
//
//   1. Reads GOV.UK's official organisations list (Open Government Licence) and makes sure
//      every public body has a lobby_orgs record (source 'govuk', its exact title as the only
//      spelling; abbreviations are not used). These names also protect commas inside official
//      titles ("Department for Business, Energy and Industrial Strategy") when splitting.
//   2. Reads every ministers' meeting, splits roundtable entries into separate organisations,
//      normalises each name and matches it against lobby_org_aliases; names in
//      lobby_excluded_names are marked excluded; the rest are unmatched (kept, searchable).
//   3. Turns the published date into a real date and flags dates after today or unreadable.
//   4. Writes lobby_meeting_mentions in full (new rows first, then old rows removed).
//
//   5. Councils (owner's approval, 20 Oct 2026): every council in our councils table becomes an organisation
//      (source 'council', linked by council_slug) with the forms returns use ("Kent County Council", "London
//      Borough of Camden"); a form that would name two councils is left out and stays unmatched.
//   6. Dates and sources come from ministers_meetings as the sync now records them: the published date text,
//      a note where the date could not be used, and the publication's address.
//
// DRY RUN BY DEFAULT: prints the report, writes NOTHING (including GOV.UK organisations).
// Pass --write to save, only after the dry-run report has been approved.
// --sql=file.sql writes the same changes as one guarded transaction instead (for a rehearsal with ROLLBACK).
//   With it: --meetings-json=file reads the meetings from a reload report (scripts/reload-ministers-meetings.ts)
//   instead of the table; --add-excluded=file adds names to lobby_excluded_names: a CSV (norm_name, reason,
//   published_name), as scripts/data/lobby-exclusions-20261020.csv (the owner-approved list of 20 Oct 2026), or JSON;
//   --renormalise rewrites stored spellings and excluded names under the current normalising rules.
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
const { normaliseName, splitOrganisations, slugify, councilForms } = require('./lib/lobby-names');

const WRITE = process.argv.includes('--write');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const SQL = arg('sql');
const RENORMALISE = process.argv.includes('--renormalise');
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
    await new Promise((r) => setTimeout(r, 500)); // one request at a time, half a second apart
  }
  return out;
}

// Dates come from ministers_meetings already checked (lib/ministers-meetings-source.ts): an ISO date, or empty with
// date_note saying why. A date after today is still flagged, in case a return was published before the meeting.
function parseDate(iso) {
  const s = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: null, flag: 'unreadable' };
  return { date: s, flag: s > TODAY ? 'future' : null };
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
  // --renormalise: stored spellings and excluded names were normalised under earlier rules; work out their spelling
  // under the current rules. Two spellings of different organisations that would become one are reported and the
  // stored spelling is left as it is (the run stops in --sql mode).
  const aliasRenames = []; const aliasDrops = []; const aliasClashes = []; const excludedRenames = []; const excludedDrops = [];
  if (RENORMALISE) {
    const target = new Map();
    for (const a of aliases) {
      const n = normaliseName(a.alias_norm);
      const t = target.get(n);
      if (t && t.org_id !== a.org_id) { aliasClashes.push(`${n}: org ${t.org_id} and org ${a.org_id}`); continue; }
      if (n === a.alias_norm) { target.set(n, a); continue; }
      if (t) aliasDrops.push(a.alias_norm); else { aliasRenames.push([a.alias_norm, n]); target.set(n, a); }
    }
    // a spelling already in the new form wins over one that becomes it
    for (const a of aliases) if (normaliseName(a.alias_norm) === a.alias_norm) target.set(a.alias_norm, a);
    for (const [from, to] of [...aliasRenames]) if (target.get(to).alias_norm !== from) { aliasRenames.splice(aliasRenames.findIndex((r) => r[0] === from), 1); aliasDrops.push(from); }
    for (const a of aliases) a.alias_norm = normaliseName(a.alias_norm);
    const seenEx = new Set(excluded.filter((e) => normaliseName(e.norm_name) === e.norm_name).map((e) => e.norm_name));
    for (const e of excluded) {
      const n = normaliseName(e.norm_name);
      if (n === e.norm_name) continue;
      if (seenEx.has(n)) excludedDrops.push(e.norm_name); else { excludedRenames.push([e.norm_name, n]); seenEx.add(n); }
      e.norm_name = n;
    }
    console.log(`renormalised: ${aliasRenames.length} spellings rewritten, ${aliasDrops.length} dropped as duplicates of the same organisation, ${aliasClashes.length} would join two organisations${aliasClashes.length ? `: ${aliasClashes.slice(0, 10).join('; ')}` : ''}; excluded names rewritten ${excludedRenames.length}, dropped ${excludedDrops.length}`);
    if (SQL && aliasClashes.length) throw new Error('spellings would join two organisations; fix them before writing');
  }
  // --add-excluded: people, job titles and generic entries (owner's approval, 20 Oct 2026). Kept in the meeting
  // records; left out of the rankings and of the matched share.
  // A .csv (norm_name,reason,published_name: scripts/data/lobby-exclusions-20261020.csv) or a .json [{ norm, reason }].
  const readExcluded = (f) => {
    if (!f) return [];
    if (!f.endsWith('.csv')) return JSON.parse(fs.readFileSync(f, 'utf8'));
    const { parse } = require('csv-parse/sync');
    return parse(fs.readFileSync(f), { columns: true }).map((r) => ({ norm: r.norm_name, reason: r.reason }));
  };
  const addExcluded = readExcluded(arg('add-excluded'));
  const excludedHad = new Set(excluded.map((e) => e.norm_name));
  const newExcluded = addExcluded.filter((e) => e.norm && !excludedHad.has(e.norm) && !aliases.some((a) => a.alias_norm === e.norm));
  for (const e of newExcluded) excluded.push({ norm_name: e.norm, reason: e.reason });
  if (addExcluded.length) console.log(`excluded names to add: ${newExcluded.length} (${Object.entries(newExcluded.reduce((m, e) => { m[e.reason] = (m[e.reason] || 0) + 1; return m; }, {})).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  const aliasMap = new Map(aliases.map((a) => [a.alias_norm, a.org_id]));
  const excludedSet = new Set(excluded.map((e) => e.norm_name));
  const slugs = new Set(orgs.map((o) => o.slug));
  console.log(`existing: ${orgs.length} organisations, ${aliases.length} spellings, ${excluded.length} excluded names`);

  // Only GOV.UK's full titles are used as spellings. Its abbreviations are NOT: checked
  // against meeting topics, many meant other organisations ("Sage", "GLA", "PPF", "TPAS").
  // Correct short forms are added through the hand review (scripts/load-lobbying-review.js).
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
    newGovOrgs.push(rec);
    newGovAliases.push({ slug, spellings });
    // Provisional ids so the dry run can match against these names too.
    for (const sp of spellings) aliasMap.set(sp.alias_norm, `new:${slug}`);
  }
  console.log(`GOV.UK organisations to add: ${newGovOrgs.length} (with ${newGovAliases.reduce((s, x) => s + x.spellings.length, 0)} spellings)`);

  // ── 1b. Councils ───────────────────────────────────────────────────────────
  const councils = await readAll('councils', 'slug, name, short_name', ['slug']);
  let withCouncil = [];
  try { withCouncil = await readAll('lobby_orgs', 'id, slug, council_slug', ['id']); } catch (e) { if (!/council_slug/.test(e.message)) throw e; } // before migration 2026-10-20f
  const existingCouncilOrgs = new Map(withCouncil.filter((o) => o.council_slug).map((o) => [o.council_slug, o]));
  const { unique: cForms, ambiguous: cAmbiguous } = councilForms(councils);
  const newCouncilOrgs = []; const councilAliases = []; const councilLinks = []; let councilFormsTaken = 0;
  const councilOrgRef = new Map();
  for (const c of councils) {
    const ex = existingCouncilOrgs.get(c.slug);
    if (ex) { councilOrgRef.set(c.slug, ex.id); continue; }
    // A council already added by hand ("Birmingham City Council"): that organisation is linked to the council and gets
    // its other forms, rather than a second organisation for the same council.
    let byForm = null;
    for (const [n, f] of cForms) if (f.slug === c.slug && typeof aliasMap.get(n) === 'number') { byForm = aliasMap.get(n); break; }
    if (byForm != null && !councilLinks.some((l) => l.org_id === byForm)) { councilOrgRef.set(c.slug, byForm); councilLinks.push({ org_id: byForm, council_slug: c.slug }); continue; }
    let slug = slugify(c.name);
    while (slugs.has(slug)) slug = `${slug}-council`;
    slugs.add(slug);
    newCouncilOrgs.push({ slug, name: c.name, org_type: 'public_body', source: 'council', council_slug: c.slug, reviewed: false, notes: `Council /councils/${c.slug}` });
    councilOrgRef.set(c.slug, `new:${slug}`);
  }
  for (const [n, f] of cForms) {
    if (aliasMap.has(n) || govNames.has(n)) { if (aliasMap.get(n) !== councilOrgRef.get(f.slug)) councilFormsTaken++; continue; } // already a spelling
    const ref = councilOrgRef.get(f.slug);
    councilAliases.push({ alias_norm: n, alias_example: f.example, source: 'council', council_slug: f.slug, ref });
    aliasMap.set(n, ref);
  }
  console.log(`councils: ${councils.length}; organisations to add ${newCouncilOrgs.length}; existing organisations linked to their council ${councilLinks.length}; spellings to add ${councilAliases.length} (${councilFormsTaken} already another organisation's spelling, ${cAmbiguous.length} would name two councils${cAmbiguous.length ? `: ${cAmbiguous.slice(0, 10).map((a) => `${a.norm} (${a.slugs.join(', ')})`).join('; ')}` : ''})`);

  const isKnown = (norm) => aliasMap.has(norm) || govNames.has(norm) || excludedSet.has(norm);

  // ── 2. Meetings → mentions ─────────────────────────────────────────────────
  const MCOLS = 'minister_name, minister_dept, meeting_date, meeting_date_raw, date_note, organisation, purpose, quarter, source_publication_slug, source_publication_url';
  const meetings = arg('meetings-json')
    ? JSON.parse(fs.readFileSync(arg('meetings-json'), 'utf8')).rows
    : await readAll('ministers_meetings', MCOLS, ['minister_name', 'minister_dept', 'meeting_date', 'organisation', 'purpose', 'quarter', 'source_publication_slug', 'meeting_date_raw']);
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
    if (flag) flags[flag].push(`${m.meeting_date_raw ?? m.meeting_date} (${m.minister_name})`);
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
        meeting_date: date, meeting_date_raw: m.meeting_date_raw ?? m.meeting_date ?? null, date_flag: flag, date_note: m.date_note || null,
        purpose: m.purpose || null, quarter: m.quarter || null, source_publication_slug: m.source_publication_slug || null,
        source_publication_url: m.source_publication_url || null,
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

  if (SQL) {
    if (dupes.length) throw new Error('duplicate keys');
    writeSql(SQL, { newGovOrgs, newGovAliases, newCouncilOrgs, councilAliases, councilLinks, newExcluded, aliasRenames, aliasDrops, excludedRenames, excludedDrops, mentions });
    return;
  }
  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  if (dupes.length) throw new Error('duplicate keys');
  if (RENORMALISE) throw new Error('--renormalise rewrites stored spellings: use --sql and run the transaction');

  // Safety: ministers_meetings is deleted and re-inserted on every sync. If this runs in that
  // gap it reads far fewer meetings, and the stale-row delete below would wipe the index.
  // Refuse to write if the new mentions are fewer than 90% of those saved now.
  const { count: savedNow, error: cErr } = await db.from('lobby_meeting_mentions').select('id', { count: 'exact', head: true });
  if (cErr) throw new Error(`count lobby_meeting_mentions: ${cErr.message}`);
  if (savedNow && mentions.length < savedNow * 0.9) throw new Error(`only ${mentions.length} mentions now against ${savedNow} saved; ministers' meetings may be mid-sync. Nothing written.`);

  // ── Write ──────────────────────────────────────────────────────────────────
  console.log('\n--- Writing ---');
  const orgsToAdd = [...newGovOrgs, ...newCouncilOrgs];
  for (let i = 0; i < orgsToAdd.length; i += 500) {
    const { error } = await db.from('lobby_orgs').insert(orgsToAdd.slice(i, i + 500));
    if (error) throw new Error(`lobby_orgs insert: ${error.message}`);
  }
  for (const l of councilLinks) {
    const { error } = await db.from('lobby_orgs').update({ council_slug: l.council_slug, updated_at: new Date().toISOString() }).eq('id', l.org_id).is('council_slug', null);
    if (error) throw new Error(`lobby_orgs council link: ${error.message}`);
  }
  if (newExcluded.length) {
    const { error } = await db.from('lobby_excluded_names').upsert(newExcluded.map((e) => ({ norm_name: e.norm, reason: e.reason })), { onConflict: 'norm_name', ignoreDuplicates: true });
    if (error) throw new Error(`lobby_excluded_names insert: ${error.message}`);
  }
  const fresh = await readAll('lobby_orgs', 'id, slug', ['id']);
  const idBySlug = new Map(fresh.map((o) => [o.slug, o.id]));
  const resolveRef = (ref) => (typeof ref === 'string' && ref.startsWith('new:') ? idBySlug.get(ref.slice(4)) : ref);
  const aliasRows = [
    ...newGovAliases.flatMap((g) => g.spellings.map((s) => ({ ...s, org_id: idBySlug.get(g.slug) }))),
    ...councilAliases.map((a) => ({ alias_norm: a.alias_norm, alias_example: a.alias_example, source: 'council', org_id: resolveRef(a.ref) })),
  ];
  for (let i = 0; i < aliasRows.length; i += 500) {
    const { error } = await db.from('lobby_org_aliases').upsert(aliasRows.slice(i, i + 500), { onConflict: 'alias_norm', ignoreDuplicates: true });
    if (error) throw new Error(`lobby_org_aliases insert: ${error.message}`);
  }
  console.log(`  lobby_orgs: ${newGovOrgs.length} GOV.UK organisations and ${newCouncilOrgs.length} councils added; lobby_org_aliases: ${aliasRows.length} spellings added; excluded names added: ${newExcluded.length}`);

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
  const { data: rv, error: rErr } = await db.rpc('refresh_lobbying_views');
  if (rErr) throw new Error(`refresh_lobbying_views: ${rErr.message}`);
  console.log(`  /lobbying figures refreshed: ${JSON.stringify(rv)}`);
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });

// One guarded transaction with the same changes as --write (for a rehearsal with ROLLBACK, then a run).
function writeSql(file, x) {
  const q = (v) => (v == null ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const orgRef = (ref) => (ref == null ? 'NULL' : typeof ref === 'string' && ref.startsWith('new:') ? `(SELECT id FROM public.lobby_orgs WHERE slug = ${q(ref.slice(4))})` : String(ref));
  const L = ['\\set ON_ERROR_STOP on', 'BEGIN;', ''];
  L.push('-- spellings and excluded names under the current normalising rules');
  for (const n of x.aliasDrops) L.push(`DELETE FROM public.lobby_org_aliases WHERE alias_norm = ${q(n)};`);
  for (const [a, b] of x.aliasRenames) L.push(`UPDATE public.lobby_org_aliases SET alias_norm = ${q(b)} WHERE alias_norm = ${q(a)};`);
  for (const n of x.excludedDrops) L.push(`DELETE FROM public.lobby_excluded_names WHERE norm_name = ${q(n)};`);
  for (const [a, b] of x.excludedRenames) L.push(`UPDATE public.lobby_excluded_names SET norm_name = ${q(b)} WHERE norm_name = ${q(a)};`);
  L.push('', '-- organisations');
  for (const o of [...x.newGovOrgs, ...x.newCouncilOrgs]) {
    L.push(`INSERT INTO public.lobby_orgs (slug, name, org_type, source, reviewed, notes${o.council_slug ? ', council_slug' : ''}) VALUES (${[o.slug, o.name, o.org_type, o.source, o.reviewed, o.notes].map(q).join(', ')}${o.council_slug ? `, ${q(o.council_slug)}` : ''});`);
  }
  for (const l of x.councilLinks) L.push(`UPDATE public.lobby_orgs SET council_slug = ${q(l.council_slug)}, updated_at = now() WHERE id = ${l.org_id} AND council_slug IS NULL;`);
  L.push('', '-- spellings');
  for (const g of x.newGovAliases) for (const sp of g.spellings) L.push(`INSERT INTO public.lobby_org_aliases (alias_norm, org_id, alias_example, source) VALUES (${q(sp.alias_norm)}, ${orgRef('new:' + g.slug)}, ${q(sp.alias_example)}, 'govuk');`);
  for (const a of x.councilAliases) L.push(`INSERT INTO public.lobby_org_aliases (alias_norm, org_id, alias_example, source) VALUES (${q(a.alias_norm)}, ${orgRef(a.ref)}, ${q(a.alias_example)}, 'council');`);
  L.push('', '-- excluded names');
  for (const e of x.newExcluded) L.push(`INSERT INTO public.lobby_excluded_names (norm_name, reason) VALUES (${q(e.norm)}, ${q(e.reason)});`);
  L.push('', '-- mentions, replaced in full');
  L.push('CREATE TEMP TABLE new_mentions (LIKE public.lobby_meeting_mentions INCLUDING DEFAULTS) ON COMMIT DROP;');
  L.push('ALTER TABLE new_mentions ADD COLUMN org_slug text;');
  const C = ['meeting_key', 'position', 'minister_name', 'minister_dept', 'meeting_date', 'meeting_date_raw', 'date_flag', 'date_note', 'purpose', 'quarter', 'source_publication_slug', 'source_publication_url', 'raw_name', 'norm_name', 'org_id', 'org_slug', 'match_type'];
  for (let i = 0; i < x.mentions.length; i += 500) {
    L.push(`INSERT INTO new_mentions (${C.join(', ')}) VALUES`);
    L.push(x.mentions.slice(i, i + 500).map((m) => {
      const ref = m.org_ref; const isNew = typeof ref === 'string' && ref.startsWith('new:');
      const vals = { ...m, org_id: ref == null || isNew ? null : ref, org_slug: isNew ? ref.slice(4) : null };
      return `(${C.map((c) => q(vals[c])).join(', ')})`;
    }).join(',\n') + ';');
  }
  L.push('UPDATE new_mentions n SET org_id = o.id FROM public.lobby_orgs o WHERE n.org_slug IS NOT NULL AND o.slug = n.org_slug;');
  L.push('DELETE FROM public.lobby_meeting_mentions;');
  L.push(`INSERT INTO public.lobby_meeting_mentions (${C.filter((c) => c !== 'org_slug').join(', ')}) SELECT ${C.filter((c) => c !== 'org_slug').join(', ')} FROM new_mentions;`);
  const by = (t) => x.mentions.filter((m) => m.match_type === t).length;
  L.push('', 'DO $$', 'DECLARE n int;', 'BEGIN',
    `  SELECT count(*) INTO n FROM public.lobby_meeting_mentions;`, `  IF n <> ${x.mentions.length} THEN RAISE EXCEPTION 'expected ${x.mentions.length} mentions, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.lobby_meeting_mentions WHERE match_type = 'alias' AND org_id IS NOT NULL;`, `  IF n <> ${by('alias')} THEN RAISE EXCEPTION 'expected ${by('alias')} matched mentions with an organisation, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.lobby_meeting_mentions WHERE match_type = 'excluded';`, `  IF n <> ${by('excluded')} THEN RAISE EXCEPTION 'expected ${by('excluded')} excluded mentions, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM public.lobby_orgs WHERE council_slug IS NOT NULL;`, `  IF n <> ${x.newCouncilOrgs.length + x.councilLinks.length} THEN RAISE EXCEPTION 'expected ${x.newCouncilOrgs.length + x.councilLinks.length} organisations linked to councils, found %', n; END IF;`,
    `  SELECT count(*) INTO n FROM (SELECT council_slug FROM public.lobby_orgs WHERE council_slug IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d;`, `  IF n <> 0 THEN RAISE EXCEPTION '% councils have two organisations', n; END IF;`,
    'END $$;', '', 'COMMIT;');
  fs.writeFileSync(file, L.join('\n') + '\n');
  console.log(`\nWrote ${file}: ${x.mentions.length} mentions, ${x.newGovOrgs.length + x.newCouncilOrgs.length} organisations, ${x.councilAliases.length} council spellings, ${x.newExcluded.length} excluded names, ${x.aliasRenames.length} spellings rewritten. Not run.`);
}
