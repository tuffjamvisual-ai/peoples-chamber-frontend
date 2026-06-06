#!/usr/bin/env node
// Pulls Committee on Standards published reports from committees-api.parliament.uk
// (which is open JSON, unlike www.parliament.uk which sits behind Cloudflare).
// Each "Nth Report - <MP Name>" entry is one finding against an MP.
//
// What this writes vs leaves null:
//   member_id        — resolved by name fuzzy-match against current + former MPs
//   mp_name_at_time  — exact name from the Report title
//   case_ref         — synthesised from committeeId + publicationId
//   closed_date      — publicationStartDate (the finding date)
//   source           — 'standards_committee'
//   summary          — Report description string from the API
//   url              — https://committees.parliament.uk/publications/<id>/
//   outcome / rule_breached / penalty — left NULL. Detail lives inside the
//     PDF/HTML report; Cloudflare blocks automated fetches of those pages.
//     Future enrichment pass can populate these via manual data entry or
//     when the upstream API exposes them.
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
      resolve();
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

function extractMpName(description) {
  if (!description) return null;
  const m = REPORT_RE.exec(description.trim());
  if (!m) return null;
  let candidate = m[2].trim();
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

async function resolveMember(name) {
  // Strict-then-fuzzy: try display_name exact, then name exact, then ILIKE.
  // Returns the first match's member_id (caller handles ambiguity by skipping).
  const safe = name.replace(/'/g, "''");
  const sql = `
    SELECT member_id FROM mps
      WHERE display_name = '${safe}' OR name = '${safe}'
      ORDER BY current_member DESC NULLS LAST LIMIT 1`;
  let r = (await psqlQ(sql)).trim();
  if (r) return parseInt(r, 10);
  const sqlFuzzy = `
    SELECT member_id FROM mps
      WHERE display_name ILIKE '%${safe}%' OR name ILIKE '%${safe}%'
      ORDER BY current_member DESC NULLS LAST LIMIT 2`;
  r = (await psqlQ(sqlFuzzy)).trim();
  const ids = r.split('\n').filter(Boolean);
  if (ids.length === 1) return parseInt(ids[0], 10);
  return null;
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
      url: `https://committees.parliament.uk/publications/${r.id}/`,
    });
  }
  console.log(`  ${findings.length.toLocaleString()} look like case findings`);
  console.log(`  ${skipped.length.toLocaleString()} skipped as generic (Register of Interests / standards landscape / etc.)`);

  // Resolve members
  console.log(`Resolving member_ids…`);
  let resolved = 0, unresolved = 0;
  for (const f of findings) {
    f.member_id = await resolveMember(f.mp_name);
    if (f.member_id) resolved++; else unresolved++;
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
        member_id = EXCLUDED.member_id,
        mp_name_at_time = EXCLUDED.mp_name_at_time,
        closed_date = EXCLUDED.closed_date,
        summary = EXCLUDED.summary,
        url = EXCLUDED.url,
        source_published = EXCLUDED.source_published,
        scraped_at = now();`;
  });
  await psql(sqls.join('\n'));
  console.log(`\nWrote ${findings.length} rows to mp_conduct_findings.`);
})().catch((e) => { console.error(e); process.exit(1); });
