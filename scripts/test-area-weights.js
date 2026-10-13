// READ-ONLY weight test for the area league table (England). Writes NOTHING.
//
// Re-scores every area 17 ways and reports how much the bands move, so you can see
// whether a few topics swing the results before anything is published:
//   - the normal way (every topic counts the same)
//   - each of the eight topics left out, one at a time (then 5 of the remaining 7
//     topics are needed to be ranked, in place of 6 of 8)
//   - each of the eight topics counted double
// Uses the same scoring rules as the published ratings (scripts/lib/area-scoring.js).
// City of London and the Isles of Scilly are left out, as in the published ratings.
//
// For each version: how many areas change band, how many move two or more bands, how
// closely the ranking matches the normal one (rank correlation, 1 = identical), and the
// biggest movers. Then the areas whose band changes in the most versions (borderline).
//
// Usage:
//   node scripts/test-area-weights.js > area-weights-test.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { buildAreaMeasures } = require('./lib/area-measures');
const { TOPICS, scoreMeasure, topicScores, bandStability } = require('./lib/area-scoring');

const r2 = (x) => Math.round(x * 100) / 100;

// Spearman rank correlation on the areas ranked in both versions (re-ranked within that set).
function rankCorrelation(a, b) {
  const common = [...a.keys()].filter((k) => b.has(k));
  const ra = new Map([...common].sort((x, y) => a.get(x).rank - a.get(y).rank).map((k, i) => [k, i + 1]));
  const rb = new Map([...common].sort((x, y) => b.get(x).rank - b.get(y).rank).map((k, i) => [k, i + 1]));
  const n = common.length;
  const d2 = common.reduce((s, k) => s + (ra.get(k) - rb.get(k)) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

(async () => {
  const { areas, measures, SMALL_AREAS } = await buildAreaMeasures();
  const used = TOPICS.flatMap(([, ms]) => ms);
  const missing = used.filter((m) => !measures[m]);
  if (missing.length) throw new Error(`measures not built: ${missing.join(', ')}`);
  const scores = Object.fromEntries(used.map((m) => [m, scoreMeasure(measures[m].values, measures[m].better)]));
  const base = areas.filter((a) => !SMALL_AREAS[a.gss_code]).map((a) => ({ code: a.gss_code, name: a.short_name || a.name, topics: topicScores(a.gss_code, scores) }));

  const { normal, versions, results, changes: counts } = bandStability(base);
  console.log(`Normal ranking: ${normal.size} areas ranked.`);
  const changes = new Map([...counts].filter(([, n]) => n > 0)); // areas whose band changes at least once

  console.log('\n=== Each version compared with the normal ranking ===');
  for (const { version: v, alt } of results) {
    let moved = 0, moved2 = 0;
    const movers = [];
    for (const [code, r] of normal) {
      const x = alt.get(code);
      if (!x) continue;
      const db = Math.abs(x.band - r.band);
      if (db >= 1) moved++;
      if (db >= 2) moved2++;
      movers.push({ name: r.name, from: r.rank, to: x.rank, fromBand: r.band, toBand: x.band });
    }
    const dropped = [...normal.keys()].filter((k) => !alt.has(k)).map((k) => normal.get(k).name);
    movers.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
    console.log(`\n${v.label}:`);
    console.log(`  areas changing band: ${moved} of ${normal.size} (${Math.round((moved / normal.size) * 100)}%); moving two or more bands: ${moved2}; rank correlation with normal: ${r2(rankCorrelation(normal, alt))}`);
    if (dropped.length) console.log(`  no longer ranked (too few topics): ${dropped.join(', ')}`);
    console.log(`  biggest movers: ${movers.slice(0, 5).map((m) => `${m.name} ${m.from} -> ${m.to} (band ${m.fromBand} -> ${m.toBand})`).join('; ')}`);
  }

  console.log(`\n=== Borderline areas: band changes in the most of the ${versions.length} versions ===`);
  const border = [...changes.entries()].sort((a, b) => b[1] - a[1]);
  for (const [code, n] of border.slice(0, 25)) { const r = normal.get(code); console.log(`  ${r.name}: band ${r.band} (rank ${r.rank}, score ${r2(r.overall)}), changes band in ${n} of ${versions.length}`); }
  const steady = [...normal.keys()].filter((k) => !changes.has(k)).length;
  console.log(`\nAreas whose band never changes in any version: ${steady} of ${normal.size} (${Math.round((steady / normal.size) * 100)}%)`);
  console.log(`Areas whose band changes in half the versions or more: ${border.filter(([, n]) => n >= versions.length / 2).length}`);
  console.log('\nDone. Nothing was written.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
