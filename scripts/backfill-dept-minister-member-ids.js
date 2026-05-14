// Match dept_ministers.name → mps.member_id and (when DRY_RUN=false) write the
// missing member_id back into dept_ministers.
//
// DRY RUN by default: prints per-row predictions, totals, and a sample of
// each result bucket (matched / no-match / ambiguous). Re-run with
// DRY_RUN=false to apply the UPDATEs via psql.
//
// Backs up the previous (member_id, name, dept_slug) of every row it touches
// to scripts/backups/dept_ministers_pre_backfill_<stamp>.json.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN !== 'false';

if (!SUPABASE_URL || !ANON_KEY) { console.error('env missing'); process.exit(1); }
if (!DRY_RUN && !DATABASE_URL) { console.error('DATABASE_URL required for write'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Normalise minister/MP names so we can compare strings. Strips honorifics,
// titles, suffixes, punctuation, then lowercases + squashes whitespace.
function normalize(raw) {
  if (!raw) return '';
  let s = String(raw);
  s = s.replace(/[​‌‍⁠]/g, ''); // zero-width chars
  s = s.replace(/\s+/g, ' ').trim();
  // Strip honorific prefixes (greedy — handles multiples like "The Rt Hon Sir ...")
  const prefixes = [
    /^the\s+rt\s+hon\s+/i,
    /^the\s+right\s+honourable\s+/i,
    /^rt\s+hon\s+/i,
    /^right\s+honourable\s+/i,
    /^sir\s+/i,
    /^dame\s+/i,
    /^lord\s+/i,
    /^lady\s+/i,
    /^baroness\s+/i,
    /^baron\s+/i,
    /^viscount\s+/i,
    /^earl\s+/i,
    /^duke\s+/i,
    /^mr\s+/i,
    /^mrs\s+/i,
    /^miss\s+/i,
    /^ms\s+/i,
    /^dr\s+/i,
    /^prof(?:essor)?\s+/i,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of prefixes) {
      if (re.test(s)) { s = s.replace(re, ''); changed = true; }
    }
  }
  // Replace all dash variants (hyphen, en-dash, em-dash, minus) with space.
  s = s.replace(/[\-‐‑‒–—−]/g, ' ');
  // Strip post-nominal honours and "MP" from the end. Multiple honours can
  // be stacked (e.g. "KCB KC MP") so loop until nothing matches.
  const SUFFIXES = /\s+(?:M\.?P\.?|Q\.?C\.?|K\.?C\.?|D\.?B\.?E\.?|C\.?B\.?E\.?|M\.?B\.?E\.?|O\.?B\.?E\.?|G\.?B\.?E\.?|K\.?C\.?B\.?|K\.?C\.?M\.?G\.?|K\.?C\.?V\.?O\.?|K\.?B\.?E\.?|D\.?S\.?O\.?|M\.?C\.?|G\.?C\.?|D\.?S\.?C\.?|P\.?C\.?|J\.?P\.?)$/i;
  let prev;
  do { prev = s; s = s.replace(SUFFIXES, ''); } while (s !== prev);
  // "Lastname, Firstname" → "Firstname Lastname"
  if (s.includes(',')) {
    const [last, ...rest] = s.split(',').map((p) => p.trim());
    if (rest.length) s = `${rest.join(' ')} ${last}`;
  }
  // Drop everything except letters and spaces (handles diacritics by NFKD)
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.toLowerCase().replace(/[^a-z\s\-']/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

// Indicator that a minister entry is a Lord/Lady/Baroness etc. — they
// have no Commons member_id so they should never match.
function looksLikePeer(raw) {
  if (!raw) return false;
  return /\b(?:lord|lady|baroness|baron|viscount|earl|duke)\b/i.test(raw);
}

const sqlEsc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

(async () => {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE (will update dept_ministers)'}`);

  // 1. Pull the rows we want to fix (member_id NULL).
  const { data: ministers, error: mErr } = await supabase
    .from('dept_ministers')
    .select('id, dept_slug, name, role, salary_band, member_id')
    .is('member_id', null);
  if (mErr) { console.error(mErr); process.exit(1); }
  console.log(`\ndept_ministers needing member_id: ${ministers.length}`);

  // 2. Pull current MPs and build a normalized-name → member_id lookup.
  const { data: mps, error: mpErr } = await supabase
    .from('mps')
    .select('member_id, name, display_name, list_as')
    .eq('current_member', true);
  if (mpErr) { console.error(mpErr); process.exit(1); }
  console.log(`current MPs in lookup: ${mps.length}`);

  const lookup = new Map(); // normalized -> Set<member_id>
  const addKey = (key, memberId) => {
    if (!key) return;
    if (!lookup.has(key)) lookup.set(key, new Set());
    lookup.get(key).add(memberId);
  };
  for (const mp of mps) {
    addKey(normalize(mp.name), mp.member_id);
    addKey(normalize(mp.display_name), mp.member_id);
    addKey(normalize(mp.list_as), mp.member_id);
  }

  // 3. Match each minister.
  const matched = [];   // single, confident
  const ambiguous = []; // multiple member_ids for the same normalized name
  const noMatch = [];   // nothing in lookup
  const peers = [];     // looks like Lord/Baroness — skip on purpose

  for (const m of ministers) {
    if (looksLikePeer(m.name)) { peers.push(m); continue; }
    const key = normalize(m.name);
    const hits = lookup.get(key);
    if (!hits || hits.size === 0) { noMatch.push({ minister: m, key }); continue; }
    if (hits.size === 1) {
      matched.push({ minister: m, memberId: [...hits][0], key });
    } else {
      ambiguous.push({ minister: m, candidates: [...hits], key });
    }
  }

  console.log(`\nResults`);
  console.log(`  matched   : ${matched.length}`);
  console.log(`  ambiguous : ${ambiguous.length}`);
  console.log(`  no match  : ${noMatch.length}`);
  console.log(`  peers (skip — not in Commons): ${peers.length}`);

  console.log(`\n--- Sample of matched (first 10) ---`);
  for (const r of matched.slice(0, 10)) {
    const mp = mps.find((x) => x.member_id === r.memberId);
    console.log(`  "${r.minister.name}"  →  member_id ${r.memberId} (${mp?.display_name || mp?.name})`);
  }
  if (ambiguous.length) {
    console.log(`\n--- Ambiguous (need disambiguation) ---`);
    for (const r of ambiguous) {
      const candNames = r.candidates.map((id) => {
        const mp = mps.find((x) => x.member_id === id);
        return `${id} (${mp?.display_name || mp?.name})`;
      }).join(', ');
      console.log(`  "${r.minister.name}"  →  ${candNames}`);
    }
  }
  if (noMatch.length) {
    console.log(`\n--- Unmatched (no current MP with this name) ---`);
    for (const r of noMatch.slice(0, 20)) {
      console.log(`  "${r.minister.name}"  (normalized: "${r.key}")`);
    }
    if (noMatch.length > 20) console.log(`  ... and ${noMatch.length - 20} more`);
  }
  if (peers.length) {
    console.log(`\n--- Skipped peers (Lords/Ladies — not in mps) ---`);
    for (const r of peers.slice(0, 10)) console.log(`  "${r.name}"`);
    if (peers.length > 10) console.log(`  ... and ${peers.length - 10} more`);
  }

  if (DRY_RUN) {
    console.log(`\nDry run complete. ${matched.length} rows would be updated.`);
    console.log(`To apply: DRY_RUN=false node scripts/backfill-dept-minister-member-ids.js`);
    return;
  }

  // 4. Back up + write.
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `dept_ministers_pre_backfill_${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(ministers, null, 2));
  console.log(`\nBacked up ${ministers.length} previous rows to ${backupFile}`);

  let ok = 0;
  for (const r of matched) {
    const sql = `UPDATE dept_ministers SET member_id = ${r.memberId} WHERE id = ${r.minister.id};`;
    try {
      execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'pipe' });
      ok++;
    } catch (e) {
      console.error(`  failed id=${r.minister.id} (${r.minister.name}):`, e.stderr ? e.stderr.toString() : e.message);
    }
  }
  console.log(`\nDone. ${ok}/${matched.length} rows updated. Ambiguous and unmatched rows left untouched.`);
})();
