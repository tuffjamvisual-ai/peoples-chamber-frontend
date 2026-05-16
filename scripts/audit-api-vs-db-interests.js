#!/usr/bin/env node
/**
 * Audits Parliament Members-API "RegisteredInterests" vs our
 * `mp_registered_interests` table for every current MP.
 *
 * The HTML register at publications.parliament.uk blocks scrapers
 * (HTTP 403), so the only authoritative machine-readable cross-check
 * is the API itself. This script flags any MP whose API row-count
 * differs from our DB row-count -- those are the only true "the sync
 * is losing data" cases.
 *
 * Usage: DATABASE_URL=... node scripts/audit-api-vs-db-interests.js
 */

const { execSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const THROTTLE_MS = 120;
const UA = 'PeoplesChamber-RegisterAudit/1.0';

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  }).trim();
}

async function fetchInterests(memberId) {
  const url = `https://members-api.parliament.uk/api/Members/${memberId}/RegisteredInterests`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return { ok: false, status: r.status };
  const j = await r.json();
  return { ok: true, value: j.value || [] };
}

function summariseApi(value) {
  // Schema stores ONE row per top-level interest, with childInterests
  // packed into the row's child_interests jsonb. So we count top-level
  // only -- counting children too overstates the gap.
  let total = 0;
  const byCat = {};
  for (const cat of value) {
    const n = (cat.interests || []).length;
    byCat[cat.name] = n;
    total += n;
  }
  return { total, byCat };
}

async function main() {
  console.log('Pulling MP list + DB interest counts...');

  // Per-MP DB counts in one round-trip
  const dbRows = psql(`
    SELECT m.member_id, m.display_name,
           COALESCE(i.n, 0) AS db_n,
           COALESCE(i.cats, '') AS cats
    FROM mps m
    LEFT JOIN (
      SELECT member_id,
             COUNT(*) AS n,
             string_agg(DISTINCT category_name, '||' ORDER BY category_name) AS cats
      FROM mp_registered_interests
      GROUP BY member_id
    ) i ON i.member_id = m.member_id
    ORDER BY m.member_id;
  `).split('\n').filter(Boolean);

  console.log(`${dbRows.length} MPs to check.`);

  const stats = { equal: 0, apiMore: 0, apiLess: 0, fetchFail: 0 };
  const discrepancies = [];
  const apiErrors = [];

  let i = 0;
  for (const line of dbRows) {
    const [mid, name, dbN, dbCats] = line.split('|');
    const memberId = parseInt(mid, 10);
    const dbCount = parseInt(dbN, 10) || 0;

    i += 1;
    if (i % 50 === 0) process.stderr.write(`  ${i}/${dbRows.length}...\n`);

    const res = await fetchInterests(memberId);
    if (!res.ok) {
      stats.fetchFail += 1;
      apiErrors.push({ memberId, name, status: res.status });
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
      continue;
    }

    const { total: apiCount, byCat } = summariseApi(res.value);

    if (apiCount === dbCount) {
      stats.equal += 1;
    } else if (apiCount > dbCount) {
      stats.apiMore += 1;
      discrepancies.push({
        memberId, name, apiCount, dbCount,
        delta: apiCount - dbCount,
        kind: 'API has MORE — sync dropped entries',
        byCat,
        dbCats: dbCats ? dbCats.split('||') : [],
      });
    } else {
      stats.apiLess += 1;
      discrepancies.push({
        memberId, name, apiCount, dbCount,
        delta: dbCount - apiCount,
        kind: 'DB has MORE — orphan rows (entry deleted upstream?)',
        byCat,
        dbCats: dbCats ? dbCats.split('||') : [],
      });
    }

    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  console.log('\n═════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═════════════════════════════════════════════════════');
  console.log(`MPs checked          : ${dbRows.length}`);
  console.log(`API count == DB     : ${stats.equal}`);
  console.log(`API > DB (sync gap) : ${stats.apiMore}`);
  console.log(`API < DB (orphans)  : ${stats.apiLess}`);
  console.log(`API fetch failed    : ${stats.fetchFail}`);

  if (apiErrors.length) {
    console.log('\nAPI errors (first 10):');
    apiErrors.slice(0, 10).forEach((e) => console.log(`  ${e.memberId} ${e.name} -> HTTP ${e.status}`));
  }

  if (discrepancies.length === 0) {
    console.log('\nNo discrepancies. Sync is in lockstep with the API.');
    return;
  }

  // Worst offenders first
  discrepancies.sort((a, b) => b.delta - a.delta);

  console.log(`\nTOP ${Math.min(30, discrepancies.length)} DISCREPANCIES (by absolute row delta):`);
  for (const d of discrepancies.slice(0, 30)) {
    console.log(`\n  ${d.name} (${d.memberId})`);
    console.log(`    API total: ${d.apiCount}   DB total: ${d.dbCount}   delta: ${d.delta}`);
    console.log(`    ${d.kind}`);
    console.log(`    API by category:`);
    for (const [cat, n] of Object.entries(d.byCat)) {
      console.log(`      ${n.toString().padStart(3)}  ${cat}`);
    }
    console.log(`    DB categories present: ${d.dbCats.join(' | ') || '(none)'}`);
  }
}

main().catch((e) => { console.error('fatal:', e?.message || e); process.exit(1); });
