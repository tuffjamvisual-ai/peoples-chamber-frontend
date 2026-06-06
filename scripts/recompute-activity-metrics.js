#!/usr/bin/env node
// Recomputes mp_activity_metrics for every current MP from mp_division_votes.
// Pure SQL aggregate — runs in <1s on the live table.
//
// Metrics produced:
//   divisions_voted    — distinct divisions the MP voted aye/no/both in
//   divisions_total    — total commons divisions in the current Parliament
//   attendance_pct     — % of available divisions this MP voted in
//   rebellions_total   — sum of is_rebellion flags
//   rebellion_rate_pct — rebellions / divisions_voted * 100
//
// Members API enrichment (speeches_year, questions_year) is handled by a
// separate slower pass; this script leaves those columns alone if already
// populated.
//
// Usage:
//   node scripts/recompute-activity-metrics.js
//   node scripts/recompute-activity-metrics.js --dry-run
//
// Idempotent: ON CONFLICT (member_id) DO UPDATE.

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const DRY_RUN = process.argv.includes('--dry-run');

function psql(sql) {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [DATABASE_URL, '-At', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('close', c => c === 0 ? resolve(out) : reject(new Error(err || `psql exit ${c}\n${out}`)));
    p.stdin.end(sql);
  });
}

const PARL_START = '2024-07-04';   // 2024 general election

const RECOMPUTE_SQL = `
  WITH
    parl_divisions AS (
      SELECT COUNT(DISTINCT COALESCE(division_id::text,
                                    CONCAT(division_date_only::text, '|', division_number))) AS n
      FROM mp_division_votes
      WHERE division_date_only >= '${PARL_START}'::date
    ),
    member_agg AS (
      SELECT
        member_id,
        COUNT(DISTINCT COALESCE(division_id::text,
                                CONCAT(division_date_only::text, '|', division_number))) AS divisions_voted,
        COUNT(*) FILTER (WHERE is_rebellion IS TRUE) AS rebellions_total
      FROM mp_division_votes
      WHERE division_date_only >= '${PARL_START}'::date
        AND vote_type IN ('aye', 'no', 'both')
      GROUP BY member_id
    )
  INSERT INTO mp_activity_metrics
    (member_id, divisions_voted, divisions_total, attendance_pct, rebellions_total, rebellion_rate_pct, refreshed_at)
  SELECT
    m.member_id,
    COALESCE(ma.divisions_voted, 0) AS divisions_voted,
    (SELECT n FROM parl_divisions) AS divisions_total,
    CASE WHEN (SELECT n FROM parl_divisions) > 0
         THEN ROUND(COALESCE(ma.divisions_voted, 0)::numeric * 100 / (SELECT n FROM parl_divisions), 2)
         ELSE NULL END AS attendance_pct,
    COALESCE(ma.rebellions_total, 0) AS rebellions_total,
    CASE WHEN COALESCE(ma.divisions_voted, 0) > 0
         THEN ROUND(COALESCE(ma.rebellions_total, 0)::numeric * 100 / ma.divisions_voted, 2)
         ELSE NULL END AS rebellion_rate_pct,
    now()
  FROM mps m
  LEFT JOIN member_agg ma ON ma.member_id = m.member_id
  WHERE m.current_member = TRUE
  ON CONFLICT (member_id) DO UPDATE SET
    divisions_voted = EXCLUDED.divisions_voted,
    divisions_total = EXCLUDED.divisions_total,
    attendance_pct = EXCLUDED.attendance_pct,
    rebellions_total = EXCLUDED.rebellions_total,
    rebellion_rate_pct = EXCLUDED.rebellion_rate_pct,
    refreshed_at = EXCLUDED.refreshed_at;
`;

(async () => {
  if (DRY_RUN) {
    console.log('=== DRY RUN — sample of what would be written ===');
    const preview = await psql(`
      WITH parl_divisions AS (
        SELECT COUNT(DISTINCT COALESCE(division_id::text,
                                      CONCAT(division_date_only::text, '|', division_number))) AS n
        FROM mp_division_votes
        WHERE division_date_only >= '${PARL_START}'::date
      ),
      member_agg AS (
        SELECT
          member_id,
          COUNT(DISTINCT COALESCE(division_id::text,
                                  CONCAT(division_date_only::text, '|', division_number))) AS divisions_voted,
          COUNT(*) FILTER (WHERE is_rebellion IS TRUE) AS rebellions_total
        FROM mp_division_votes
        WHERE division_date_only >= '${PARL_START}'::date
          AND vote_type IN ('aye', 'no', 'both')
        GROUP BY member_id
      )
      SELECT m.display_name, ma.divisions_voted,
        (SELECT n FROM parl_divisions) AS divisions_total,
        ROUND(ma.divisions_voted::numeric * 100 / (SELECT n FROM parl_divisions), 2) AS attendance_pct,
        ma.rebellions_total
      FROM mps m JOIN member_agg ma ON ma.member_id = m.member_id
      ORDER BY ma.divisions_voted DESC LIMIT 10;
    `);
    console.log(preview);
    return;
  }
  console.log('Recomputing mp_activity_metrics …');
  const t0 = Date.now();
  await psql(RECOMPUTE_SQL);
  console.log(`  written in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const count = (await psql(`SELECT COUNT(*) FROM mp_activity_metrics;`)).trim();
  console.log(`  total rows: ${count}`);
  const top = await psql(`
    SELECT m.display_name, divisions_voted, attendance_pct, rebellions_total
    FROM mp_activity_metrics a JOIN mps m ON m.member_id = a.member_id
    ORDER BY rebellions_total DESC NULLS LAST LIMIT 5;
  `);
  console.log('\n  Top rebels:');
  console.log(top);
})().catch((e) => { console.error(e); process.exit(1); });
