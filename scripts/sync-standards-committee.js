#!/usr/bin/env node
// Pulls Committee on Standards published reports from committees-api.parliament.uk
// (which is open JSON, unlike www.parliament.uk which sits behind Cloudflare).
// Each "Nth Report - <MP Name>" entry is one finding against an MP.
//
// What this writes vs leaves null:
//   member_id        — kept when already set (never re-pointed, 3 Nov 2026); otherwise current MPs by name (mps
//                      table), anyone else via the Members API (Commons, then the Lords by name history), used only
//                      when exactly one member had the name and served in the Commons before the report date
//                      (else NULL, logged)
//   mp_name_at_time  — exact name from the Report title
//   case_ref         — synthesised from committeeId + publicationId
//   closed_date      — publicationStartDate (the finding date)
//   source           — 'standards_committee'
//   summary          — Report description string from the API
//   url              — the report's HTML page (API field additionalContentUrl, publications.parliament.uk) when
//                      present, else https://committees.parliament.uk/publications/<id>/
//   (summary is only set when empty: a reviewed summary is never overwritten, 3 Nov 2026)
//   outcome / rule_breached / penalty — never written by this sync; filled by reviewed migrations
//     (e.g. scripts/migrations/2026-11-03a-standards-findings-fill.sql, read from the report PDFs). Left NULL on new rows.
//
// Idempotent: ON CONFLICT (case_ref) DO UPDATE.
//
// Usage:
//   node scripts/sync-standards-committee.js              # preview
//   node scripts/sync-standards-committee.js --apply      # write

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const APPLY = process.argv.includes('--apply');
const COMMITTEE_ID = 290;
const PAGE_SIZE = 300;          // 223 total publications today; one page covers them all

function psql(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => {
      if (c !== 0) return reject(new Error(err || `psql exit ${c}\n${out}`));
      if (err) console.error('psql warnings:', err.split('\n').slice(0,3).join(' | '));
      resolve(out);
    });
    p.stdin.end(sql);
  });
}

function psqlQ(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-At', '-F', '\t', '-c', sql], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => c === 0 ? resolve(out) : reject(new Error(err)));
  });
}

// "Nth Report - <Name>" / "Nth Report – <Name>" — extract MP name.
// Reject generic titles (Register of Interests, standards landscape, etc.)
const REPORT_RE = /^(\d+(?:st|nd|rd|th)?|First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth)\s+[Rr]eport\s*[-–]\s*(.+?)$/;
const GENERIC_NAMES = /^(register of interests|the house of commons standards landscape|members'?\s*staff|influencing code|standards|code of conduct|all[- ]?party parliamentary groups|rules for|precautionary exclusion|risk[- ]based|recall of mps act|house of commons commission|complaints procedure|appeals process|review of|inquiry into|alternatives to|members'? conduct)/i;

// "3rd Report - Interim Report: Kevin Hollinrake" (publication 55293, Oct 2026): the name follows the colon.
const INTERIM_RE = /^Interim Report\s*:\s*(.+)$/i;

function extractMpName(description) {
  if (!description) return null;
  const m = REPORT_RE.exec(description.trim());
  if (!m) return null;
  let candidate = m[2].trim();
  const interim = INTERIM_RE.exec(candidate);
  if (interim) candidate = interim[1].trim();
  // Generic-name detection: known prefixes OR contains a colon (titles like
  // 'Topic: response to X') OR longer than what a name can realistically be.
  if (GENERIC_NAMES.test(candidate)) return null;
  if (candidate.includes(':')) return null;
  if (candidate.length > 40) return null;
  // Strip honorifics and party abbreviations
  return candidate
    .replace(/^(Rt Hon|Sir|Dame|Dr|Ms|Mrs|Mr)\s+/, '')
    .replace(/\s+(MP|QC|KC|CBE|OBE|MBE)\s*$/, '')
    .trim();
}

// The report's readable HTML page (publications.parliament.uk) when the API gives one, else the publication page.
function reportUrl(r) {
  const html = (r.additionalContentUrl || '').trim();
  return /^https:\/\/publications\.parliament\.uk\//.test(html) ? html : `https://committees.parliament.uk/publications/${r.id}/`;
}

async function resolveCurrent(name) {
  // Current MPs only: display_name or name exact, then ILIKE when exactly one current MP matches.
  const safe = name.replace(/'/g, "''");
  const sql = `
    SELECT member_id FROM mps
      WHERE current_member = true AND (display_name = '${safe}' OR name = '${safe}')
      LIMIT 1`;
  let r = (await psqlQ(sql)).trim();
  if (r) return parseInt(r, 10);
  const sqlFuzzy = `
    SELECT member_id FROM mps
      WHERE current_member = true AND (display_name ILIKE '%${safe}%' OR name ILIKE '%${safe}%')
      LIMIT 2`;
  r = (await psqlQ(sqlFuzzy)).trim();
  const ids = r.split('\n').filter(Boolean);
  if (ids.length === 1) return parseInt(ids[0], 10);
  return null;
}

// Former MPs (owner's brief, 3 Nov 2026), as in app/api/sync-standards-committee/route.ts: a name that matches no
// current MP is looked up in the Members API, Commons first (current and former members). The id is used only when
// exactly one Commons member has that name and their Commons service began on or before the report date.
// When the Commons search finds nobody with the name (owner's brief, 3 Nov 2026), the Lords are searched by surname,
// since a peer's search name is their title ("Lord Lilley"): the id is used only when exactly one of them held that
// exact name (name history) and their Commons service began on or before the report date. Membership and name
// history come from /api/Members/History?ids= (the per member /Members/{id}/History path answers 404).
const MEMBERS_SEARCH = 'https://members-api.parliament.uk/api/Members/Search';
const MEMBERS_HISTORY = 'https://members-api.parliament.uk/api/Members/History';
const MEMBERS_TAKE = 20;
const HONORIFIC = /^(?:(?:Rt Hon|The Rt Hon|Sir|Dame|Dr|Ms|Mrs|Miss|Mr|Lord|Baroness)\s+)+/i;
const POSTNOMINAL = /(?:\s+(?:MP|QC|KC|CBE|OBE|MBE|PC))+\s*$/i;
const plainName = (n) => n.replace(HONORIFIC, '').replace(POSTNOMINAL, '').replace(/\s+/g, ' ').trim().toLowerCase();
const API_HEADERS = { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' };

async function getJson(u) {
  const r = await fetch(u, { headers: API_HEADERS });
  return r.ok ? r.json() : null;
}

// History for several members at once: [{ value: { id, houseMembershipHistory, nameHistory } }], or null on failure.
async function histories(ids) {
  if (!ids.length) return [];
  return getJson(`${MEMBERS_HISTORY}?${ids.map((i) => `ids=${i}`).join('&')}`);
}
const commonsStarts = (h) => ((h && h.value && h.value.houseMembershipHistory) || [])
  .filter((m) => m.house === 1 && m.membershipStartDate).map((m) => m.membershipStartDate.slice(0, 10));
const servedBefore = (starts, reportDate) => starts.some((d) => !reportDate || d <= reportDate);

async function resolveFromLords(name, reportDate) {
  const surname = plainName(name).split(' ').pop();
  if (!surname) return { id: null, why: 'no Commons member with this name' };
  const found = await getJson(`${MEMBERS_SEARCH}?Name=${encodeURIComponent(surname)}&House=2&take=${MEMBERS_TAKE}`);
  if (!found) return { id: null, why: 'Members API search failed (Lords)' };
  if ((found.totalResults || 0) > MEMBERS_TAKE) return { id: null, why: `${found.totalResults} Lords search results` };
  const ids = (found.items || []).map((i) => i.value && i.value.id).filter(Boolean);
  if (!ids.length) return { id: null, why: 'no Commons or Lords member with this name' };
  const hist = await histories(ids);
  if (!hist) return { id: null, why: 'Members API history failed (Lords)' };
  const same = hist.filter((h) => ((h.value && h.value.nameHistory) || []).some((n) => plainName(n.nameDisplayAs || '') === plainName(name)));
  if (same.length !== 1) return { id: null, why: same.length ? `${same.length} Lords members once held the name` : 'no Commons or Lords member with this name' };
  const starts = commonsStarts(same[0]);
  return servedBefore(starts, reportDate)
    ? { id: same[0].value.id }
    : { id: null, why: starts.length ? 'Commons service began after the report' : 'peer with no Commons service' };
}

async function resolveFormer(name, reportDate) {
  const found = await getJson(`${MEMBERS_SEARCH}?Name=${encodeURIComponent(name)}&House=1&take=${MEMBERS_TAKE}`);
  if (!found) return { id: null, why: 'Members API search failed' };
  if ((found.totalResults || 0) > MEMBERS_TAKE) return { id: null, why: `${found.totalResults} search results` };
  const same = (found.items || []).filter((i) => i.value?.id && plainName(i.value.nameDisplayAs || '') === plainName(name));
  if (same.length === 0) return resolveFromLords(name, reportDate);
  if (same.length !== 1) return { id: null, why: `${same.length} Commons members share the name` };
  const v = same[0].value;
  let starts = [];
  if (v.latestHouseMembership?.house === 1 && v.latestHouseMembership.membershipStartDate) starts = [v.latestHouseMembership.membershipStartDate.slice(0, 10)];
  else {
    const h = await histories([v.id]);
    starts = commonsStarts((h || [])[0]);
  }
  return servedBefore(starts, reportDate) ? { id: v.id } : { id: null, why: starts.length ? 'Commons service began after the report' : 'no Commons service found' };
}

async function resolveMember(name, reportDate) {
  const current = await resolveCurrent(name);
  if (current) return { id: current };
  return resolveFormer(name, reportDate);
}

function dq(tag, v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `$${tag}$${String(v).replaceAll('$','')}$${tag}$`;
}

(async () => {
  console.log(`Fetching Committee ${COMMITTEE_ID} publications…`);
  const res = await fetch(
    `https://committees-api.parliament.uk/api/Publications?committeeId=${COMMITTEE_ID}&take=${PAGE_SIZE}`,
    { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } },
  );
  if (!res.ok) { console.error(`HTTP ${res.status}`); process.exit(1); }
  const json = await res.json();
  const items = json.items || [];
  console.log(`  ${items.length.toLocaleString()} publications`);

  const reports = items.filter((it) => it.type?.name === 'Report');
  console.log(`  ${reports.length.toLocaleString()} Reports`);

  const findings = [];
  const skipped = [];
  for (const r of reports) {
    const description = r.description || '';
    const mpName = extractMpName(description);
    if (!mpName) { skipped.push(description); continue; }
    findings.push({
      publication_id: r.id,
      mp_name: mpName,
      date: (r.publicationStartDate || '').slice(0, 10) || null,
      description,
      url: reportUrl(r),
    });
  }
  console.log(`  ${findings.length.toLocaleString()} look like case findings`);
  console.log(`  ${skipped.length.toLocaleString()} skipped as generic (Register of Interests / standards landscape / etc.)`);

  // Resolve members
  // A row that already has a member_id keeps it (3 Nov 2026): only rows still null are looked up, so the sync never
  // re-points an id set by review and makes few Members API calls.
  console.log(`Resolving member_ids…`);
  const refs = findings.map((f) => `'pcs-cmt-${f.publication_id}'`).join(',');
  const storedIds = new Map();
  if (refs) {
    // One tagged line (psql here prints aligned output): STORED_IDS:pcs-cmt-1=123,pcs-cmt-2=456
    const out = await psql(`SELECT 'STORED_IDS:' || coalesce(string_agg(case_ref || '=' || member_id, ','), '') AS ids FROM mp_conduct_findings WHERE case_ref IN (${refs}) AND member_id IS NOT NULL;`);
    const m = out.match(/STORED_IDS:([^\s]*)/);
    if (!m) throw new Error('could not read the stored member ids');
    for (const pair of m[1].split(',').filter(Boolean)) {
      const [ref, id] = pair.split('=');
      if (Number.isInteger(Number(id))) storedIds.set(ref, Number(id));
    }
  }
  let resolved = 0, unresolved = 0;
  for (const f of findings) {
    const kept = storedIds.get(`pcs-cmt-${f.publication_id}`);
    const m = kept ? { id: kept } : await resolveMember(f.mp_name, f.date);
    f.member_id = m.id;
    if (f.member_id) resolved++;
    else { unresolved++; console.log(`  ? member_id left null for ${f.mp_name} (pcs-cmt-${f.publication_id}): ${m.why}`); }
  }
  console.log(`  resolved: ${resolved}, unresolved: ${unresolved}`);

  // Print preview
  console.log(`\nFindings preview:`);
  for (const f of findings.slice(0, 15)) {
    const mark = f.member_id ? '✓' : '?';
    console.log(`  ${mark} ${f.date}  ${f.mp_name}${f.member_id ? ` (${f.member_id})` : ''}  '${f.description.slice(0, 80)}'`);
  }
  if (findings.length > 15) console.log(`  …and ${findings.length - 15} more`);

  if (!APPLY) {
    console.log(`\n(preview — pass --apply to write)`);
    return;
  }

  const sqls = findings.map((f) => {
    const ref = `pcs-cmt-${f.publication_id}`;
    return `
      INSERT INTO mp_conduct_findings
        (member_id, mp_name_at_time, case_ref, closed_date, source, summary, url, source_published, scraped_at)
      VALUES
        (${f.member_id ?? 'NULL'}, ${dq('n', f.mp_name)}, ${dq('r', ref)},
         ${dq('d', f.date)}::date, 'standards_committee', ${dq('s', f.description)},
         ${dq('u', f.url)}, ${dq('d', f.date)}::date, now())
      ON CONFLICT (case_ref) WHERE case_ref IS NOT NULL DO UPDATE SET
        member_id = COALESCE(mp_conduct_findings.member_id, EXCLUDED.member_id),
        mp_name_at_time = EXCLUDED.mp_name_at_time,
        closed_date = EXCLUDED.closed_date,
        -- A reviewed summary is never overwritten (3 Nov 2026); outcome, rule_breached and penalty are not written here.
        summary = COALESCE(NULLIF(btrim(mp_conduct_findings.summary), ''), EXCLUDED.summary),
        url = EXCLUDED.url,
        source_published = EXCLUDED.source_published,
        scraped_at = now();`;
  });
  await psql(sqls.join('\n'));
  console.log(`\nWrote ${findings.length} rows to mp_conduct_findings.`);
})().catch((e) => { console.error(e); process.exit(1); });
