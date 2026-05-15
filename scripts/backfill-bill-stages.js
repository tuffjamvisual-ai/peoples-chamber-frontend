#!/usr/bin/env node
/**
 * Backfill bill.stages from Parliament's Bills API. For every row in
 * `bill` that has a parliament_id, fetch
 *   https://bills-api.parliament.uk/api/v1/Bills/<id>/Stages
 * and store the JSON in bill.stages, with bill.stages_synced_at = now().
 *
 * Schema prerequisite (one-time):
 *   ALTER TABLE bill ADD COLUMN IF NOT EXISTS stages jsonb;
 *   ALTER TABLE bill ADD COLUMN IF NOT EXISTS stages_synced_at timestamptz;
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backfill-bill-stages.js [--dry-run] [--only-missing] [--limit=N]
 *
 *   --dry-run        log only, no UPDATEs
 *   --only-missing   skip bills that already have stages populated
 *   --limit=N        cap how many bills to process (useful for testing)
 *
 * Pacing: ~150 ms between fetches → ~10 min for 4,000 bills.
 */

const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_MISSING = process.argv.includes('--only-missing');
const limitFlag = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitFlag ? parseInt(limitFlag.split('=')[1], 10) : Infinity;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  });
}
function psqlT(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  });
}
function sqlLiteral(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function jsonLiteral(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

async function fetchStages(parliamentId) {
  const res = await fetch(
    `https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}/Stages`,
  );
  if (!res.ok) throw new Error(`Bills API ${res.status}`);
  return res.json();
}

async function run() {
  const where = ONLY_MISSING ? 'AND stages IS NULL' : '';
  const lines = psqlT(
    `SELECT id, parliament_id FROM bill WHERE parliament_id IS NOT NULL ${where} ORDER BY parliament_id;`,
  ).trim().split('\n').filter(Boolean);

  const rows = lines.map((line) => {
    const [id, parliament_id] = line.split('|');
    return { id: parseInt(id, 10), parliament_id: parseInt(parliament_id, 10) };
  }).slice(0, LIMIT);

  console.log(`Processing ${rows.length} bills${DRY_RUN ? ' (dry-run)' : ''}${ONLY_MISSING ? ' (only-missing)' : ''}`);

  let ok = 0, fail = 0, i = 0;
  for (const row of rows) {
    i++;
    try {
      const stages = await fetchStages(row.parliament_id);
      if (DRY_RUN) {
        console.log(`  [dry] id=${row.id} pid=${row.parliament_id} stages=${Array.isArray(stages?.items) ? stages.items.length : '?'} items`);
      } else {
        psql(
          `UPDATE bill SET stages = ${jsonLiteral(stages)}, stages_synced_at = NOW() WHERE id = ${row.id};`,
        );
      }
      ok++;
    } catch (err) {
      fail++;
      if (fail <= 10) console.log(`  ✗ id=${row.id} pid=${row.parliament_id} — ${err.message}`);
    }
    if (i % 50 === 0) console.log(`  ${i}/${rows.length} (ok=${ok}, fail=${fail})`);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Done — ok=${ok}, fail=${fail}, total=${rows.length}`);
}

run();
