#!/usr/bin/env node
/**
 * Revert dept_ministers.photo_url and dept_officials.photo_url to NULL
 * for rows whose `name` resolves to a current MP via the same name
 * normalisation the runtime route uses. This restores the prior visible
 * behaviour: MPs show their `mps.photo_url` (Parliament thumbnail)
 * through the route's `m.photo_url || mp?.photo_url || ''` fallback,
 * while peers and civil-service officials keep the gov.uk image I
 * backfilled (since they have no MP match).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/revert-mp-matched-staff-photos.js [--dry-run]
 */

const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -c ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
  });
}

// Match the exact normalize() in app/api/govuk-dept/route.ts so reverts
// align with the runtime lookup.
const normalize = (s) => {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/^(the rt hon|rt hon|sir|dame|dr|mr|mrs|ms|miss|lord|baroness|baron)\s+/i, '')
    .replace(/\s+(mp|mbe|obe|kbe|dbe|cbe|kcb|gcb|dso|mc|qc|kc|bt)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

function loadMpIndex() {
  const rows = psql(
    "SELECT member_id, name, display_name FROM mps WHERE current_member = true;",
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  const map = new Map();
  for (const line of rows) {
    const [member_id, name, display_name] = line.split('|');
    for (const key of [normalize(display_name), normalize(name)]) {
      if (key && !map.has(key)) map.set(key, member_id);
    }
  }
  return map;
}

function revert(table, mpIndex) {
  const rows = psql(
    `SELECT id, name FROM ${table} WHERE photo_url IS NOT NULL AND photo_url <> '' ORDER BY id;`,
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, name] = line.split('|');
      return { id: parseInt(id, 10), name };
    });

  let toRevert = 0;
  let kept = 0;
  const sample = [];
  for (const row of rows) {
    const key = normalize(row.name);
    if (key && mpIndex.has(key)) {
      toRevert++;
      if (sample.length < 5) sample.push({ ...row, member_id: mpIndex.get(key) });
      if (!DRY_RUN) {
        psql(`UPDATE ${table} SET photo_url = NULL WHERE id = ${row.id};`);
      }
    } else {
      kept++;
    }
  }
  console.log(`[${table}] total_with_photo=${rows.length}, reverted=${toRevert}, kept=${kept}`);
  if (sample.length) {
    console.log('  sample reverts:');
    for (const s of sample) console.log(`    id=${s.id}  name="${s.name}"  → mp member_id=${s.member_id}`);
  }
}

const mpIndex = loadMpIndex();
console.log(`Loaded ${mpIndex.size} MP name keys`);
if (DRY_RUN) console.log('=== DRY RUN ===');
revert('dept_ministers', mpIndex);
revert('dept_officials', mpIndex);
