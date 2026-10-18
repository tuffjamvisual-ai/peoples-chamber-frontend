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
//   --parties=file.csv    published_name, party_id, party_name, parties_slug
//   --date=2026-05-07     default election date (default 2026-05-07)
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
//   2. every elected candidate has more votes than every unelected candidate
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

// "SURNAME, Forename commonly known as SURNAME, Known" -> "Known Surname"; "Sam ASHTON" -> "Sam Ashton".
// Words published in capitals are put in title case (Mc, Mac only when the original shows it, O',
// hyphens kept); words already in mixed case are left as published.
function titleWord(w) {
  const pre = w.match(/^(Mac|Mc|De|Le|Van|Von|Di|Da|La)([A-Z'’-]{2,})$/); // "MacKIE" -> "MacKie"
  if (pre) return pre[1] + titleWord(pre[2]).replace(/^./, (c) => c.toUpperCase());
  if (w !== w.toUpperCase() || !/[A-Z]/.test(w)) return w;
  return w.toLowerCase().replace(/(^|[-'’])([a-z])/g, (m, p, c) => p + c.toUpperCase()).replace(/^Mc([a-z])/, (m, c) => `Mc${c.toUpperCase()}`);
}
function displayName(published) {
  let n = published.replace(/\s+/g, ' ').trim();
  const known = n.split(/ commonly known as /i);
  n = known[known.length - 1];
  const m = n.match(/^([^,]+),\s*(.+)$/);
  if (m) n = `${m[2]} ${m[1]}`;
  return n.split(' ').map(titleWord).join(' ');
}

function checkWard(w, expectedSeats) {
  const errs = [];
  const el = w.cands.filter((c) => c.elected), un = w.cands.filter((c) => !c.elected);
  if (el.length !== w.seats) errs.push(`check 1: ${el.length} elected, ${w.seats} seats`);
  if (el.length && un.length && Math.min(...el.map((c) => c.votes)) <= Math.max(...un.map((c) => c.votes))) errs.push('check 2: an elected candidate does not have more votes than every unelected candidate');
  if (w.turnout != null && !(w.turnout >= 10 && w.turnout <= 80)) errs.push(`check 3: turnout ${w.turnout}% outside 10% to 80%`);
  if (w.cands.some((c) => !Number.isInteger(c.votes) || c.votes < 0)) errs.push('votes missing or not a whole number');
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
      wards.get(key).cands.push({ published: r.candidate, party: r.party || null, votes: Number(r.votes), elected: r.elected === 'yes' });
    }
  }

  const refused = [];
  const skipped = [];
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
      for (const e of checkWard(w)) problems.push(`${w.ward}: ${e}`);
      for (const k of w.cands) if (k.party && !partyMap.has(k.party)) missingParties.add(k.party);
    }
    if (problems.length) { refused.push(...problems.map((p) => `${name} | ${p}`)); continue; }
    const list = [...wards.values()];
    const elect = list.filter((w) => w.electorate && w.turnout != null);
    const totalElectorate = elect.reduce((s, w) => s + w.electorate, 0);
    plan.push({
      name, date, gss: c.gss_code, source_note: c.source_note || `${cname} council results pages, collected for ${date}`, wards: list,
      seats: list.reduce((s, w) => s + w.seats, 0),
      turnout: totalElectorate ? Math.round((elect.reduce((s, w) => s + w.electorate * w.turnout, 0) / totalElectorate) * 100) / 100 : null,
    });
  }

  console.log(`CSV files: ${CSVS.join(', ')}`);
  console.log(`council elections (council and polling date) in the CSVs: ${councils.size}; ready to load: ${plan.length}; refused: ${refused.length ? new Set(refused.map((r) => r.split(" | ")[0].split(":")[0])).size : 0}; by-election only, left out: ${skipped.length}`);
  for (const p of plan) console.log(`  ${p.name} (${p.gss}): ${p.wards.length} wards, ${p.seats} seats, ${p.wards.reduce((s, w) => s + w.cands.length, 0)} candidates, turnout ${p.turnout ?? 'n/a'}%`);
  if (skipped.length) { console.log(`\nleft out, by-election only (pass --include-byelections to load) (${skipped.length}):`); for (const r of skipped) console.log(`  ${r}`); }
  if (refused.length) { console.log(`\nrefused (${refused.length}):`); for (const r of refused) console.log(`  ${r}`); }
  if (missingParties.size) { console.log(`\nparty names not in ${PARTIES} (${missingParties.size}):`); for (const p of [...missingParties].sort()) console.log(`  ${p}`); }
  console.log('\nsample display names:');
  for (const p of plan.slice(0, 5)) for (const k of p.wards[0].cands.slice(0, 2)) console.log(`  "${k.published}" -> "${displayName(k.published)}"`);

  const { data: existing, error: ee } = await db.from('council_elections').select('council_gss_code, election_date');
  if (ee) fail(`council_elections: ${ee.message} (has migration 2026-10-17m been run?)`);
  const loaded = new Set((existing || []).map((e) => `${e.council_gss_code}|${e.election_date}`));
  const already = plan.filter((p) => loaded.has(`${p.gss}|${p.date}`));
  if (already.length) console.log(`\nalready loaded, will be skipped: ${already.map((p) => p.name).join(', ')}`);

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
      const total = w.cands.reduce((s, k) => s + k.votes, 0);
      const { error: ce } = await db.from('council_election_candidates').insert(w.cands.map((k) => ({
        ward_id: wr.id, candidate_published: k.published, candidate_display: displayName(k.published),
        party_published: k.party, party_id: k.party ? partyMap.get(k.party).party_id : 'no-description', votes: k.votes,
        share_pct: total ? Math.round((k.votes / total) * 10000) / 100 : 0, elected: k.elected,
      })));
      if (ce) fail(`council_election_candidates ${p.name} ${w.ward}: ${ce.message} (council_elections row ${e.id} is in place; delete it to retry)`);
      nC += w.cands.length;
    }
  }
  console.log(`  party_names: ${partyRows.length} upserted; council_elections: ${nE}; wards: ${nW}; candidates: ${nC}`);
  console.log('\nWRITE complete.');
})().catch((e) => fail(e.message));
