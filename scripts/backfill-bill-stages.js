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
 *   DATABASE_URL=... node scripts/backfill-bill-stages.js [--dry-run] [--only-missing] [--only-truncated] [--limit=N]
 *
 *   --dry-run         log only, no UPDATEs
 *   --only-missing    skip bills that already have stages populated
 *   --only-truncated  only bills whose stored stages are cut short (fewer
 *                     items than the stored totalResults) — the bills hit by
 *                     the old single-page fetch
 *   --limit=N         cap how many bills to process (useful for testing)
 *
 * Stages are fetched IN FULL: the Bills API pages at 20 stages by default
 * and this script previously stored only that first page. Same paging as
 * lib/bill-stages.ts (mirror any change there). current_stage and
 * stage_date are now updated too, derived the same way as
 * app/api/sync-bill-stages/route.ts.
 *
 * Pacing: ~150 ms between fetches → ~10 min for 4,000 bills.
 */

const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_MISSING = process.argv.includes('--only-missing');
const ONLY_TRUNCATED = process.argv.includes('--only-truncated');
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

const PAGE_SIZE = 100;
async function fetchStages(parliamentId) {
  const items = [];
  let totalResults = 0;
  let first = null;
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}/Stages?Take=${PAGE_SIZE}&Skip=${page * PAGE_SIZE}`,
      { signal: AbortSignal.timeout(30000) },
    );
    if (!res.ok) throw new Error(`Bills API ${res.status}`);
    const json = await res.json();
    if (!first) first = json;
    const pageItems = Array.isArray(json && json.items) ? json.items : [];
    totalResults = typeof (json && json.totalResults) === 'number' ? json.totalResults : items.length + pageItems.length;
    items.push(...pageItems);
    if (pageItems.length === 0 || items.length >= totalResults) break;
  }
  if (items.length < totalResults) {
    throw new Error(`Bills API returned ${items.length} of ${totalResults} stages`);
  }
  return { ...(first || {}), items, totalResults, itemsPerPage: items.length };
}

function deriveCurrentStage(items) {
  const today = new Date().toISOString().slice(0, 10);
  const dated = items
    .map((s) => ({ s, date: s && s.stageSittings && s.stageSittings[0] && s.stageSittings[0].date }))
    .filter((x) => typeof x.date === 'string' && x.date.slice(0, 10) <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = dated[0];
  return {
    current_stage: latest ? latest.s.description || null : null,
    stage_date: latest ? latest.date.slice(0, 10) : null,
  };
}

async function run() {
  const where = ONLY_TRUNCATED
    ? "AND stages IS NOT NULL AND jsonb_array_length(COALESCE(stages->'items', '[]'::jsonb)) < COALESCE((stages->>'totalResults')::int, 0)"
    : ONLY_MISSING ? 'AND stages IS NULL' : '';
  const lines = psqlT(
    `SELECT id, parliament_id FROM bill WHERE parliament_id IS NOT NULL ${where} ORDER BY parliament_id;`,
  ).trim().split('\n').filter(Boolean);

  const rows = lines.map((line) => {
    const [id, parliament_id] = line.split('|');
    return { id: parseInt(id, 10), parliament_id: parseInt(parliament_id, 10) };
  }).slice(0, LIMIT);

  console.log(`Processing ${rows.length} bills${DRY_RUN ? ' (dry-run)' : ''}${ONLY_MISSING ? ' (only-missing)' : ''}${ONLY_TRUNCATED ? ' (only-truncated)' : ''}`);

  let ok = 0, fail = 0, i = 0;
  for (const row of rows) {
    i++;
    try {
      const stages = await fetchStages(row.parliament_id);
      const { current_stage, stage_date } = deriveCurrentStage(stages.items);
      if (DRY_RUN) {
        console.log(`  [dry] id=${row.id} pid=${row.parliament_id} stages=${stages.items.length}/${stages.totalResults} current_stage="${current_stage}" ${stage_date || ''}`);
      } else {
        psql(
          `UPDATE bill SET stages = ${jsonLiteral(stages)}, stages_synced_at = NOW(), ` +
          `current_stage = ${current_stage === null ? 'NULL' : sqlLiteral(current_stage)}, ` +
          `stage_date = ${stage_date === null ? 'NULL' : sqlLiteral(stage_date)} WHERE id = ${row.id};`,
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
