#!/usr/bin/env node
// Imports council election results from the reviewed batch CSVs (one row per candidate) into
// council_elections, council_election_wards, council_election_candidates and party_names
// (migration 2026-10-17m-council-election-results.sql).
//
// DRY RUN BY DEFAULT: prints the report and writes nothing. Pass --write to save, only after the
// complete file has been reviewed and the dry-run report approved. The tables are new, so the
// first load needs no backup; a council whose election is already loaded is refused, not replaced.
//
// Inputs:
//   --csv=a.csv,b.csv     batch CSVs with the columns: council, ward_code, ward_code_source (gss or
//                         democracy-club: Democracy Club's division code where ONS has not issued a
//                         GSS code yet, e.g. NFK:hingham), ward, seats,
//                         candidate, party, votes, elected (yes/no), electorate, turnout_pct,
//                         ballots_rejected, source_url, election_date (the actual polling date;
//                         blank means --date)
//   --councils=file.json  {"<council as in the CSV>": {"gss_code": "E09000005",
//                         "wards_by_date": {"2026-05-07": 29, "2026-06-18": 1}, "source_note": "..."}};
//                         wards_by_date holds the Democracy Club ward count for each polling date
//                         source_note is shown to readers ("Source: ..."); source_note_by_date, e.g.
//                         {"2026-06-18": "..."}, overrides it for one polling date;
//                         "display_names": {"<candidate as in the CSV>": "<display name>"} sets one candidate's
//                         display name by hand (owner's decision), in place of the rule below;
//                         "turnout_pct": 35.24 sets the council-wide turnout from the council's own published figure
//   --parties=file.csv    published_name, party_id, party_name, parties_slug
//   --date=2026-05-07     default election date (default 2026-05-07)
//                         "stv": true marks single transferable vote councils (Scotland, Northern Ireland):
//                         votes are first preferences and check 2 is skipped
//                         "confirmed_ties": {"<date>|<ward>": {"elected": ["<candidate as in the CSV>"], "source": "..."}}
//                         a ward where the lowest elected candidate has the same votes as the highest
//                         unelected one (decided by lot by the returning officer). It passes check 2 only
//                         when listed here, with the winners from the declaration of result or the council's
//                         councillor list and that source; "elected" must name exactly the tied candidates
//                         marked elected in the CSV. An unlisted tie is refused, to be held back for John.
//   --names-out=file.tsv  also write every candidate's published and display name, for review
//   --sql=file.sql --sql-tag=20261019b  write the load as one guarded psql transaction instead (nothing written here):
//                         refuses already-loaded elections, backs up the party_names rows it upserts
//                         (party_names_backup_<tag>), checks exact row counts before COMMIT
//   --include-byelections load councils whose only contest was a by-election ("byelection": true in the
//                         councils file). Left out by default: the council page's "Last election" summary
//                         would otherwise show one by-election as the council's last election.
//
// Each council and polling date is one council_elections row, so a ward whose 7 May poll was
// postponed (a candidate died) and held later is loaded as a one-ward election on its own date.
//
// Guard: every ward is checked again here, and a ward that fails is refused (it is listed, and
// with --write nothing is loaded for that council and date):
//   1. number elected = seats
//   2. every elected candidate has more votes than every unelected candidate (not for STV councils or
//      uncontested wards; an uncontested ward has no votes, all its candidates elected, candidates = seats).
//      A tie at the cut-off passes only when it is in the council's confirmed_ties (see --councils)
//   3. turnout between 10% and 80%
//   4. wards per council and date = the Democracy Club count
//   5. every polling date for the council (7 May and any postponed poll) is in the CSVs, so a council's
//      vote shares are only ever worked out from every ward's result
// Every party name must be in the party names file; a missing one stops the run. A blank description
// loads with party_published null and party_id 'no-description' (shown as "No description").
// Standard party names are the names on the Electoral Commission register.
//
// Usage:
//   node scripts/import-council-election-results.js --csv=... --councils=... --parties=... > council-results-dryrun.txt 2>&1
//   node scripts/import-council-election-results.js --csv=... --councils=... --parties=... --write > council-results-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const WRITE = process.argv.includes('--write');
const CSVS = arg('csv').split(',').filter(Boolean);
const COUNCILS = arg('councils');
const PARTIES = arg('parties');
const DATE = arg('date') || '2026-05-07';
const NAMES_OUT = arg('names-out');
const SQL_OUT = arg('sql');
const SQL_TAG = arg('sql-tag');
const BYELECTIONS = process.argv.includes('--include-byelections');

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((c) => c !== '')) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== '')) rows.push(row);
  const head = rows[0].map((h) => h.trim().replace(/^﻿/, ''));
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}

// Candidate display names, "Forenames Surname". Published names come as "SURNAME Forenames" (ballot paper
// order, surname in capitals, often without a comma), "SURNAME, Forenames" or "Forenames Surname". Which
// form a comma-less name is in is decided per ward: a ward is surname-first when some name starts with a surname
// in capitals and none is plainly "Forenames Surname" (forms are mixed within some councils, e.g. by counting area).
// A preferred name ("commonly known as X", "(Known as X)", "[X]") is used in place of the legal one; a
// one-word preferred name replaces the forenames only. Words published in capitals are put in title case
// (Mc, Mac only when the original shows it, O', hyphens kept); words already in mixed case are left as published.
const PARTICLES = new Set(['de', 'da', 'di', 'du', 'del', 'der', 'den', 'van', 'von', 'la', 'le', 'bin', 'binti', 'al', 'el', 'ibn', 'ap']);
function titleWord(w, keepInitials) {
  if (keepInitials && /^\p{Lu}{1,2}$/u.test(w) && !PARTICLES.has(w.toLowerCase())) return w;   // "AJ Matsiko", "MD Shahin Ahmed"
  const pre = w.match(/^(Mac|Mc|Ma|De|Le|Van|Von|Di|Da|La)(\p{Lu}[\p{Lu}'’-]+)$/u);
  if (pre) return pre[1] + titleWord(pre[2]).replace(/^./, (c) => c.toUpperCase());
  if (/^\p{Ll}/u.test(w) && !PARTICLES.has(w)) return w[0].toUpperCase() + w.slice(1);   // "martin" on the page
  if (w !== w.toUpperCase() || !/\p{Lu}/u.test(w)) return w;
  return w.toLowerCase().replace(/(^|[-'’(])(\p{Ll})/gu, (m, p, c) => p + c.toUpperCase()).replace(/^Mc(\p{Ll})/u, (m, c) => `Mc${c.toUpperCase()}`);
}
const capsWord = (w) => { const b = w.replace(/^(Mac|Mc)/, ''); return /\p{Lu}.*\p{Lu}/u.test(b) && !/\p{Ll}/u.test(b); };
const hasLower = (w) => /\p{Ll}/u.test(w);
const tidy = (s) => s.replace(/`/g, '’').replace(/\s+/g, ' ').trim();
function split(published) {
  let n = tidy(published).replace(/(\S)\(/g, '$1 (').replace(/\s*-\s*/g, '-').replace(/[’]+(?=\s|$)/g, '');
  let alias = null, m;
  n = n.replace(/\s*\(also known as[^)]*\)/gi, '');
  if ((m = n.match(/^(.*?)\s*[([]?\s*\b(?:commonly )?known as\s+([^()[\]]+?)\s*[)\]]?$/i))) { n = m[1]; alias = m[2]; }
  else if ((m = n.match(/^(.*?)\s*\[([^()[\]]+)\]\s*(.*)$/)) || (m = n.match(/^(.+?)\s*\(([^()\d]+)\)()$/))) { n = `${m[1]} ${m[3]}`.trim(); alias = m[2]; }
  n = n.replace(/\s*\((?:also )?known as[^)]*\)/gi, '').replace(/\s*[([]\s*$/, '').trim();
  if (alias) {
    alias = alias.replace(/[)\]]$/, '').trim();
    // A preferred name cut short on the page ("commonly known as SPRINGTHORPE", "... as BROOKES-"): keep the legal name.
    const bare = alias.replace(/[,\-]+$/, '');
    if (/[,\-]$/.test(alias) || (!bare.includes(' ') && n.toUpperCase().split(/[ ,]+/).includes(bare.toUpperCase()) && !hasLower(bare))) alias = null;
  }
  return { name: n, alias };
}
const surnameFirst = (n) => { const w = n.split(' '); const i = /^\p{Lu}$/u.test(w[0]) ? 1 : 0; return w.length > i + 1 && capsWord(w[i]) && !/^\p{Lu}{1,2}$/u.test(w[i]) && w.slice(i + 1).some(hasLower); };
function wardIsSurnameFirst(names) {
  const ns = names.map((p) => split(p).name).filter((n) => !n.includes(','));
  // surname-first unless some name is plainly "Forenames Surname" (no word in capitals)
  const forenameFirst = (n) => n.includes(' ') && !n.split(' ').some(capsWord);
  return ns.some(surnameFirst) && !ns.some(forenameFirst);
}
// -> [forenames, surname]
function parts(n, sf) {
  const c = n.match(/^([^,]+),\s*(.+)$/);
  if (c) return [c[2].replace(/,/g, ' ').replace(/\s+/g, ' ').trim(), c[1]];
  const w = n.split(' ');
  if (w.length === 1) return ['', n];
  if (sf) {
    if (!hasLower(n)) return [w.slice(1).join(' '), w[0]];   // all capitals: surname is the first word
    // the surname is the leading words in capitals, with a lone initial among them ("M SKARIA Johny")
    let k = 0; while (k < w.length - 1 && (capsWord(w[k]) || (/^\p{Lu}$/u.test(w[k]) && capsWord(w[k + 1] || '')))) k++;
    if (k) return [w.slice(k).join(' '), w.slice(0, k).join(' ')];
  }
  return [w.slice(0, -1).join(' '), w[w.length - 1]];
}
function displayName(published, sf) {
  const { name, alias } = split(published);
  let [fore, sur] = parts(name, sf);
  if (alias) {
    if (!alias.includes(' ') && !alias.includes(',')) fore = alias;
    else {
      const first = alias.split(/[ ,]/)[0].toUpperCase();
      [fore, sur] = parts(alias, (sf && surnameFirst(alias)) || (surnameFirst(alias) && first === sur.toUpperCase()));
    }
  }
  return [fore, sur].filter(Boolean).join(' ').split(' ').map((x) => titleWord(x, !sf)).join(' ');
}

// A ward is uncontested (candidates elected unopposed, no poll) when no candidate has votes: then every
// candidate must be elected and there must be exactly as many candidates as seats. Otherwise every
// candidate needs a whole number of votes. Single transferable vote councils ("stv": true in the councils
// file; votes are first preferences) skip check 2.
function checkWard(w, expectedSeats, stv, tie) {
  const errs = [];
  const el = w.cands.filter((c) => c.elected), un = w.cands.filter((c) => !c.elected);
  const unopposed = w.cands.every((c) => c.votes == null);
  if (el.length !== w.seats) errs.push(`check 1: ${el.length} elected, ${w.seats} seats`);
  if (unopposed) {
    if (w.cands.length !== w.seats || un.length) errs.push(`no votes, but ${w.cands.length} candidates for ${w.seats} seats: not an uncontested ward`);
  } else {
    const low = el.length ? Math.min(...el.map((c) => c.votes)) : null, high = un.length ? Math.max(...un.map((c) => c.votes)) : null;
    if (!stv && el.length && un.length && low < high) errs.push('check 2: an elected candidate does not have more votes than every unelected candidate');
    else if (!stv && el.length && un.length && low === high) {
      const tied = el.filter((c) => c.votes === low).map((c) => c.published).sort();
      const ok = tie && tie.source && Array.isArray(tie.elected) && JSON.stringify([...tie.elected].sort()) === JSON.stringify(tied);
      if (!ok) errs.push(`check 2: tie at the cut-off on ${low} votes, winner (${tied.join(', ')}) not confirmed in confirmed_ties`);
    }
    if (w.cands.some((c) => !Number.isInteger(c.votes) || c.votes < 0)) errs.push('votes missing or not a whole number');
  }
  if (w.turnout != null && !(w.turnout >= 10 && w.turnout <= 80)) errs.push(`check 3: turnout ${w.turnout}% outside 10% to 80%`);
  if (expectedSeats != null && expectedSeats !== w.seats) errs.push(`seats ${w.seats} differ from the expected ${expectedSeats}`);
  return errs;
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  if (!CSVS.length || !COUNCILS || !PARTIES) fail('give --csv, --councils and --parties');
  for (const f of [...CSVS, COUNCILS, PARTIES]) if (!fs.existsSync(f)) fail(`${f} not found`);
  const councilMap = JSON.parse(fs.readFileSync(COUNCILS, 'utf8'));
  const partyRows = parseCsv(fs.readFileSync(PARTIES, 'utf8'));
  const partyMap = new Map(partyRows.map((p) => [p.published_name, p]));

  // Group rows into councils and wards.
  const councils = new Map();
  for (const f of CSVS) {
    for (const r of parseCsv(fs.readFileSync(f, 'utf8'))) {
      const date = r.election_date || DATE;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`${f}: bad election_date "${date}"`);
      const ck = `${r.council}|${date}`;
      if (!councils.has(ck)) councils.set(ck, new Map());
      const wards = councils.get(ck);
      const key = r.ward_code || r.ward;
      if (!wards.has(key)) {
        wards.set(key, {
          ward: r.ward, code: r.ward_code, codeSource: r.ward_code_source, seats: Number(r.seats), electorate: r.electorate ? Number(r.electorate) : null,
          turnout: r.turnout_pct ? Number(r.turnout_pct) : null, rejected: r.ballots_rejected ? Number(r.ballots_rejected) : null,
          source: r.source_url, cands: [],
        });
      }
      wards.get(key).cands.push({ published: r.candidate, party: r.party || null, votes: r.votes === '' || r.votes == null ? null : Number(r.votes), elected: r.elected === 'yes' });
    }
  }

  for (const wards of councils.values()) for (const w of wards.values()) w.surnameFirst = wardIsSurnameFirst(w.cands.map((k) => k.published));

  const refused = [];
  const skipped = [];
  const confirmedTies = [];
  const missingParties = new Set();
  const plan = [];
  const datesInCsv = new Map();
  for (const ck of councils.keys()) {
    const [cname, date] = ck.split('|');
    if (!datesInCsv.has(cname)) datesInCsv.set(cname, new Set());
    datesInCsv.get(cname).add(date);
  }
  for (const [ck, wards] of councils) {
    const [cname, date] = ck.split('|');
    const name = `${cname} ${date}`;
    const c = councilMap[cname];
    if (c && c.byelection && !BYELECTIONS) { skipped.push(`${name}: by-election only`); continue; }
    const missingDates = Object.keys((c && c.wards_by_date) || {}).filter((d) => !datesInCsv.get(cname).has(d));
    if (missingDates.length) { refused.push(`${name} | check 5: no results in the CSVs for its poll on ${missingDates.join(', ')}`); continue; }
    if (!c || !/^[EWSN]\d{8}$/.test(c.gss_code || '')) { refused.push(`${name}: no council GSS code in ${COUNCILS}`); continue; }
    const problems = [];
    const expected = (c.wards_by_date || {})[date];
    if (expected == null) problems.push(`check 4: no Democracy Club ward count for ${date}`);
    else if (wards.size !== expected) problems.push(`check 4: ${wards.size} wards in the CSV, Democracy Club lists ${expected}`);
    for (const w of wards.values()) {
      if (w.codeSource === 'gss' ? !/^[EWSN]\d{8}$/.test(w.code) : !(w.codeSource === 'democracy-club' && /^[A-Z]{2,4}:[a-z0-9-]+$/.test(w.code || ''))) {
        problems.push(`${w.ward}: no valid ward code ("${w.code}", source "${w.codeSource}")`);
      }
      if (!w.source) problems.push(`${w.ward}: no source URL`);
      const tie = (c.confirmed_ties || {})[`${date}|${w.ward}`];
      if (tie) confirmedTies.push(`${name} | ${w.ward}: ${tie.elected.join(', ')} elected; source: ${tie.source}`);
      for (const e of checkWard(w, null, !!c.stv, tie)) problems.push(`${w.ward}: ${e}`);
      for (const k of w.cands) if (k.party && !partyMap.has(k.party)) missingParties.add(k.party);
    }
    if (problems.length) { refused.push(...problems.map((p) => `${name} | ${p}`)); continue; }
    const list = [...wards.values()];
    const elect = list.filter((w) => w.electorate && w.turnout != null);
    const totalElectorate = elect.reduce((s, w) => s + w.electorate, 0);
    plan.push({
      name, date, gss: c.gss_code, displayOverrides: c.display_names || {}, source_note: (c.source_note_by_date || {})[date] || c.source_note || `${cname}'s published results`, wards: list,
      seats: list.reduce((s, w) => s + w.seats, 0),
      // council-wide turnout: the council's own figure when given ("turnout_pct" in the councils file); otherwise worked
      // out only when every ward has its electorate and turnout (a partial figure would mislead)
      turnout: c.turnout_pct != null ? c.turnout_pct : totalElectorate && elect.length === list.length ? Math.round((elect.reduce((s, w) => s + w.electorate * w.turnout, 0) / totalElectorate) * 100) / 100 : null,
    });
  }

  console.log(`CSV files: ${CSVS.join(', ')}`);
  console.log(`council elections (council and polling date) in the CSVs: ${councils.size}; ready to load: ${plan.length}; refused: ${refused.length ? new Set(refused.map((r) => r.split(" | ")[0].split(":")[0])).size : 0}; by-election only, left out: ${skipped.length}`);
  for (const p of plan) console.log(`  ${p.name} (${p.gss}): ${p.wards.length} wards, ${p.seats} seats, ${p.wards.reduce((s, w) => s + w.cands.length, 0)} candidates, turnout ${p.turnout ?? 'n/a'}%`);
  if (skipped.length) { console.log(`\nleft out, by-election only (pass --include-byelections to load) (${skipped.length}):`); for (const r of skipped) console.log(`  ${r}`); }
  if (confirmedTies.length) { console.log(`\nties at the cut-off, winner confirmed (${confirmedTies.length}):`); for (const r of confirmedTies) console.log(`  ${r}`); }
  if (refused.length) { console.log(`\nrefused (${refused.length}):`); for (const r of refused) console.log(`  ${r}`); }
  if (missingParties.size) { console.log(`\nparty names not in ${PARTIES} (${missingParties.size}):`); for (const p of [...missingParties].sort()) console.log(`  ${p}`); }
  console.log('\nsample display names:');
  for (const p of plan.slice(0, 5)) for (const k of p.wards[0].cands.slice(0, 2)) console.log(`  "${k.published}" -> "${displayName(k.published, p.wards[0].surnameFirst)}"`);
  if (NAMES_OUT) {
    const lines = ['council\tward\tsurname_first_ward\tcandidate_published\tcandidate_display'];
    for (const p of plan) for (const w of p.wards) for (const k of w.cands) lines.push([p.name, w.ward, w.surnameFirst ? 'yes' : 'no', k.published, (p.displayOverrides[k.published] || displayName(k.published, w.surnameFirst))].join('\t'));
    fs.writeFileSync(NAMES_OUT, lines.join('\n') + '\n');
    console.log(`display names for every candidate written to ${NAMES_OUT}`);
  }

  const { data: existing, error: ee } = await db.from('council_elections').select('council_gss_code, election_date');
  if (ee) fail(`council_elections: ${ee.message} (has migration 2026-10-17m been run?)`);
  const loaded = new Set((existing || []).map((e) => `${e.council_gss_code}|${e.election_date}`));
  const already = plan.filter((p) => loaded.has(`${p.gss}|${p.date}`));
  if (already.length) console.log(`\nalready loaded, will be skipped: ${already.map((p) => p.name).join(', ')}`);

  if (SQL_OUT) {
    // Guarded load as one psql transaction (rehearse with ROLLBACK in place of COMMIT, then run):
    // refuses if any of these elections is already loaded, backs up the party_names rows it upserts, inserts, and
    // checks the exact number of elections, wards and candidates before COMMIT.
    if (missingParties.size) fail('party names missing from the party names file; no SQL written');
    if (already.length) fail(`already loaded: ${already.map((p) => p.name).join(', ')}; no SQL written`);
    if (!/^[a-z0-9_]+$/.test(SQL_TAG)) fail('give --sql-tag=<backup table suffix>, e.g. 20261019b');
    const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replace(/'/g, "''")}'`);
    const used = [...new Set(plan.flatMap((p) => p.wards.flatMap((w) => w.cands.map((k) => k.party)).filter(Boolean)))].sort();
    const nW = plan.reduce((s, p) => s + p.wards.length, 0), nC = plan.reduce((s, p) => s + p.wards.reduce((t, w) => t + w.cands.length, 0), 0);
    const keys = plan.map((p) => `(${q(p.gss)}, ${q(p.date)}::date)`).join(', ');
    const L = [`-- Guarded load: ${plan.map((p) => p.name).join(', ')}`, `-- written by scripts/import-council-election-results.js --sql from ${CSVS.join(', ')}`,
      `-- ${plan.length} elections, ${nW} wards, ${nC} candidates; party_names rows used: ${used.length} (old rows kept in public.party_names_backup_${SQL_TAG})`,
      '\\set ON_ERROR_STOP on', 'BEGIN;', '',
      `DO $$ DECLARE n int; BEGIN SELECT count(*) INTO n FROM public.council_elections WHERE (council_gss_code, election_date) IN (${keys});`,
      `  IF n <> 0 THEN RAISE EXCEPTION 'already loaded: % of these elections', n; END IF; END $$;`, '',
      `CREATE TABLE public.party_names_backup_${SQL_TAG} AS SELECT *, now() AS saved_at FROM public.party_names WHERE published_name IN (${used.map(q).join(', ')});`,
      `ALTER TABLE public.party_names_backup_${SQL_TAG} ENABLE ROW LEVEL SECURITY;`, `REVOKE ALL ON public.party_names_backup_${SQL_TAG} FROM anon, authenticated;`,
      `INSERT INTO public.party_names (published_name, party_id, party_name, parties_slug) VALUES`,
      used.map((n) => { const r = partyMap.get(n); return `  (${q(n)}, ${q(r.party_id)}, ${q(r.party_name)}, ${q(r.parties_slug || null)})`; }).join(',\n'),
      `ON CONFLICT (published_name) DO UPDATE SET party_id = EXCLUDED.party_id, party_name = EXCLUDED.party_name, parties_slug = EXCLUDED.parties_slug;`, ''];
    for (const p of plan) {
      L.push(`INSERT INTO public.council_elections (council_gss_code, election_date, wards_contested, seats_contested, turnout_pct, source_note) VALUES (${[p.gss, p.date, p.wards.length, p.seats, p.turnout, p.source_note].map(q).join(', ')}) RETURNING id AS eid \\gset`);
      for (const w of p.wards) {
        L.push(`INSERT INTO public.council_election_wards (election_id, ward_code, ward_code_source, ward_name, seats, electorate, turnout_pct, ballots_rejected, source_url) VALUES (:eid, ${[w.code, w.codeSource, w.ward, w.seats, w.electorate, w.turnout, w.rejected, w.source].map(q).join(', ')}) RETURNING id AS wid \\gset`);
        const total = w.cands.reduce((t, k) => t + (k.votes || 0), 0);
        L.push('INSERT INTO public.council_election_candidates (ward_id, candidate_published, candidate_display, party_published, party_id, votes, share_pct, elected) VALUES');
        L.push(w.cands.map((k) => `  (:wid, ${[k.published, (p.displayOverrides[k.published] || displayName(k.published, w.surnameFirst)), k.party, k.party ? partyMap.get(k.party).party_id : 'no-description', k.votes,
          k.votes == null ? null : total ? Math.round((k.votes / total) * 10000) / 100 : 0, k.elected].map(q).join(', ')})`).join(',\n') + ';');
      }
      L.push('');
    }
    L.push(`DO $$ DECLARE e int; w int; c int; BEGIN`,
      `  SELECT count(*) INTO e FROM public.council_elections WHERE (council_gss_code, election_date) IN (${keys});`,
      `  SELECT count(*) INTO w FROM public.council_election_wards x JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (${keys});`,
      `  SELECT count(*) INTO c FROM public.council_election_candidates k JOIN public.council_election_wards x ON x.id = k.ward_id JOIN public.council_elections y ON y.id = x.election_id WHERE (y.council_gss_code, y.election_date) IN (${keys});`,
      `  IF e <> ${plan.length} OR w <> ${nW} OR c <> ${nC} THEN RAISE EXCEPTION 'expected ${plan.length} elections, ${nW} wards, ${nC} candidates; found %, %, %', e, w, c; END IF; END $$;`,
      `SELECT y.council_gss_code, y.election_date, y.wards_contested, y.seats_contested, count(k.*) AS candidates FROM public.council_elections y JOIN public.council_election_wards x ON x.election_id = y.id JOIN public.council_election_candidates k ON k.ward_id = x.id WHERE (y.council_gss_code, y.election_date) IN (${keys}) GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;`,
      '', 'COMMIT;');
    fs.writeFileSync(SQL_OUT, L.join('\n') + '\n');
    console.log(`\nSQL load written to ${SQL_OUT}: ${plan.length} elections, ${nW} wards, ${nC} candidates. Nothing was written to the database.`);
    return;
  }
  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }
  if (missingParties.size) fail('party names missing from the party names file; nothing written');

  console.log('\n--- Writing ---');
  const { error: pe } = await db.from('party_names').upsert(partyRows.map((p) => ({
    published_name: p.published_name, party_id: p.party_id, party_name: p.party_name, parties_slug: p.parties_slug || null,
  })), { onConflict: 'published_name' });
  if (pe) fail(`party_names: ${pe.message}`);
  let nE = 0, nW = 0, nC = 0;
  for (const p of plan) {
    if (loaded.has(`${p.gss}|${p.date}`)) continue;
    const { data: e, error } = await db.from('council_elections').insert({
      council_gss_code: p.gss, election_date: p.date, wards_contested: p.wards.length, seats_contested: p.seats, turnout_pct: p.turnout, source_note: p.source_note,
    }).select('id').single();
    if (error) fail(`council_elections ${p.name}: ${error.message}`);
    nE++;
    for (const w of p.wards) {
      const { data: wr, error: we } = await db.from('council_election_wards').insert({
        election_id: e.id, ward_code: w.code, ward_code_source: w.codeSource, ward_name: w.ward, seats: w.seats, electorate: w.electorate,
        turnout_pct: w.turnout, ballots_rejected: w.rejected, source_url: w.source,
      }).select('id').single();
      if (we) fail(`council_election_wards ${p.name} ${w.ward}: ${we.message} (council_elections row ${e.id} is in place; delete it to retry)`);
      nW++;
      const total = w.cands.reduce((s, k) => s + (k.votes || 0), 0);
      const { error: ce } = await db.from('council_election_candidates').insert(w.cands.map((k) => ({
        ward_id: wr.id, candidate_published: k.published, candidate_display: (p.displayOverrides[k.published] || displayName(k.published, w.surnameFirst)),
        party_published: k.party, party_id: k.party ? partyMap.get(k.party).party_id : 'no-description', votes: k.votes,
        share_pct: k.votes == null ? null : total ? Math.round((k.votes / total) * 10000) / 100 : 0, elected: k.elected,
      })));
      if (ce) fail(`council_election_candidates ${p.name} ${w.ward}: ${ce.message} (council_elections row ${e.id} is in place; delete it to retry)`);
      nC += w.cands.length;
    }
  }
  console.log(`  party_names: ${partyRows.length} upserted; council_elections: ${nE}; wards: ${nW}; candidates: ${nC}`);
  console.log('\nWRITE complete.');
})().catch((e) => fail(e.message));
