#!/usr/bin/env node
// Sets mp_division_votes.is_rebellion per the standard rule:
//   - vote_type must be 'aye' or 'no' (abstentions and tellers excluded)
//   - the MP's party must have fielded at least MIN_PARTY_VOTERS on that
//     division (so tiny single-vote parties don't auto-rebel against
//     their lone voter)
//   - the MP's vote_type must differ from their party's majority
//
// Uses the MP's CURRENT party from mps.party. MPs who switched party
// mid-Parliament (whip-restored, defections) are evaluated against their
// current party for the whole window; their pre-defection rebellions
// against the old party get over-counted by design — better than missing
// them entirely, and the existing 'party_history' JSONB on mp_biography
// is too sparse to use for a tighter join.
//
// Run as: node scripts/backfill-rebellion-flag.js [--dry-run]

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const DRY_RUN = process.argv.includes('--dry-run');
const MIN_PARTY_VOTERS = 5;

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

(async () => {
  console.log(`Rebellion backfill — ${DRY_RUN ? 'DRY RUN' : 'WRITE'}, MIN_PARTY_VOTERS=${MIN_PARTY_VOTERS}`);

  const before = (await psql(`
    SELECT COUNT(*) FILTER (WHERE is_rebellion = TRUE) AS rebel,
           COUNT(*) AS total
    FROM mp_division_votes;
  `)).trim();
  console.log(`Before: ${before}`);

  // Compute party majority per (party, division_date_only, division_number)
  // and update is_rebellion in one statement. CTE materialises the
  // majority once, then the UPDATE joins against it.
  //
  // Excludes parties that have no whip in the rebellion sense:
  //   - Independent (no whip to defy)
  //   - Speaker / Deputy Speakers (don't vote on most matters)
  //   - The Speaker (alternate styling)
  // These show up as rebels in a naive run because the "Independent
  // majority" lurches between aye and no across divisions.
  // Two-step UPDATE: first reset all rows to FALSE, then mark the
  // genuine rebels TRUE — handles the case where a previous run set
  // some rebellion flags that should now be cleared (e.g. an MP who
  // switched party).
  const sql = `
    UPDATE mp_division_votes SET is_rebellion = FALSE WHERE is_rebellion = TRUE;
    WITH party_position AS (
      SELECT
        m.party,
        v.division_date_only,
        v.division_number,
        SUM((v.vote_type = 'aye')::int) AS aye_count,
        SUM((v.vote_type = 'no')::int)  AS no_count
      FROM mp_division_votes v
      JOIN mps m ON m.member_id = v.member_id
      WHERE v.vote_type IN ('aye','no')
        AND m.party IS NOT NULL
        AND m.party NOT IN ('Independent', 'Speaker', 'The Speaker', 'Deputy Speaker')
        AND v.division_date_only IS NOT NULL
        AND v.division_number IS NOT NULL
      GROUP BY m.party, v.division_date_only, v.division_number
      HAVING COUNT(*) >= ${MIN_PARTY_VOTERS}
    ),
    majority AS (
      SELECT party, division_date_only, division_number,
             CASE WHEN aye_count > no_count THEN 'aye'::text
                  WHEN no_count > aye_count THEN 'no'::text
                  ELSE NULL END AS direction
      FROM party_position
      WHERE aye_count <> no_count
    )
    UPDATE mp_division_votes v
    SET is_rebellion = (v.vote_type <> maj.direction)
    FROM majority maj, mps m
    WHERE m.member_id = v.member_id
      AND m.party = maj.party
      AND v.division_date_only = maj.division_date_only
      AND v.division_number   = maj.division_number
      AND v.vote_type IN ('aye','no')
      AND m.party NOT IN ('Independent', 'Speaker', 'The Speaker', 'Deputy Speaker');
  `;
  if (DRY_RUN) {
    console.log('(dry run — would execute the UPDATE above)');
    return;
  }
  const t0 = Date.now();
  await psql(sql);
  console.log(`UPDATE finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const after = (await psql(`
    SELECT COUNT(*) FILTER (WHERE is_rebellion = TRUE) AS rebel,
           COUNT(*) AS total
    FROM mp_division_votes;
  `)).trim();
  console.log(`After:  ${after}`);

  console.log('\nTop rebels (current Parliament):');
  const top = await psql(`
    SELECT m.display_name, m.party,
           COUNT(*) FILTER (WHERE v.is_rebellion = TRUE) AS rebellions,
           COUNT(*) FILTER (WHERE v.vote_type IN ('aye','no')) AS voted
    FROM mp_division_votes v
    JOIN mps m ON m.member_id = v.member_id
    WHERE v.division_date_only >= '2024-07-04'::date
    GROUP BY m.display_name, m.party
    HAVING COUNT(*) FILTER (WHERE v.is_rebellion = TRUE) > 0
    ORDER BY rebellions DESC LIMIT 10;
  `);
  console.log(top);
})().catch((e) => { console.error(e); process.exit(1); });
