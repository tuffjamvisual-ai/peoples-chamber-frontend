// Scoring for the area league table (England).
// DRY RUN BY DEFAULT: prints the check report and writes NOTHING. Pass --write to save the
// results to public.area_ratings (migration 2026-10-13d-area-ratings.sql), only after the
// dry-run report has been approved.
//
// Scoring (approved plan; the rules live in scripts/lib/area-scoring.js):
//   1. Measure score: each area ranked against all areas on each measure, 0 (worst)
//      to 100 (best), direction handled; equal values share the same score.
//   2. Topic score: average of that topic's measure scores the area has.
//   3. Overall score: average of the topic scores (every topic counts the same).
//   4. An area needs figures in at least 6 of the 8 topics to be graded. A missing
//      measure never counts against an area.
//   5. Grade: five bands by rank, a fifth of graded areas each (1 = top fifth).
//   6. City of London and the Isles of Scilly are scored but not ranked or banded
//      (too small to compare fairly); they are listed separately.
//
// Prints the top and bottom 20, the sample areas in full, the extremes of every
// measure (to catch odd figures), and how many areas each band holds.
//
// Usage:
//   node scripts/score-areas.js > area-scores-check.txt 2>&1
//   node scripts/score-areas.js --write > area-scores-write.txt 2>&1

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { buildAreaMeasures } = require('./lib/area-measures');
const { TOPICS, MIN_TOPICS, scoreMeasure, topicScores: topicScoresFor, overallScore, rankAndBand, bandStability } = require('./lib/area-scoring');

const WRITE = process.argv.includes('--write');
const METHOD_VERSION = '2026-10-13 v2: 8 equal topics (Housing adds affordability), percentile scores, min 6 topics; services 4 parts, min 3; band stability over 16 weight test versions';
const SEPARATE_REASON = 'Too small to compare fairly with other areas, so listed separately and not ranked.';

// Services score: only services run by the councils for the area (county and district).
// Shown beside the area rating so a well-run council in a poor area is visible.
// CQC adult social care joins when the grades are available.
const SERVICES = ['schools_quality', 'childrens_services', 'planning_major', 'planning_nonmajor', 'recycling'];
const MIN_SERVICES = 3; // of the 4 parts: schools, children's services, recycling, planning
const SAMPLES = ['Cornwall', 'Leeds', 'Guildford', 'Tower Hamlets', 'Rutland', 'Barnsley', 'Sheffield'];
const r1 = (x) => (x == null ? '-' : Math.round(x * 10) / 10);


(async () => {
  const { areas, measures, SMALL_AREAS } = await buildAreaMeasures();
  const name = new Map(areas.map((a) => [a.gss_code, a.short_name || a.name]));

  const used = TOPICS.flatMap(([, ms]) => ms);
  const missingDefs = used.filter((m) => !measures[m]);
  if (missingDefs.length) throw new Error(`measures not built: ${missingDefs.join(', ')}`);
  const scores = Object.fromEntries(used.map((m) => [m, scoreMeasure(measures[m].values, measures[m].better)]));

  console.log('\n=== Extremes of every measure (5 worst, 5 best figures) ===');
  for (const m of used) {
    const e = [...measures[m].values.entries()].sort((a, b) => a[1] - b[1]);
    const fmt = (list) => list.map(([c, v]) => `${name.get(c)} ${r1(v)}`).join('; ');
    console.log(`  ${m} (${measures[m].better} is better): lowest ${fmt(e.slice(0, 5))} | highest ${fmt(e.slice(-5))}`);
  }

  const results = [];
  for (const a of areas) {
    const topicScores = topicScoresFor(a.gss_code, scores);
    const { overall, count: n } = overallScore(topicScores);
    results.push({ code: a.gss_code, name: name.get(a.gss_code), topics: topicScores, topicCount: n, overall, graded: n >= MIN_TOPICS && !SMALL_AREAS[a.gss_code], separate: !!SMALL_AREAS[a.gss_code] });
  }
  const graded = rankAndBand(results.filter((r) => r.graded), 'overall');
  // Services score (planning major and non-major averaged first, so planning counts once).
  for (const r of results) {
    const parts = [];
    for (const m of ['schools_quality', 'childrens_services', 'recycling']) { const v = scores[m].get(r.code); if (v != null) parts.push(v); }
    const pl = ['planning_major', 'planning_nonmajor'].map((m) => scores[m].get(r.code)).filter((x) => x != null);
    if (pl.length) parts.push(pl.reduce((x, y) => x + y, 0) / pl.length);
    r.servicesCount = parts.length;
    r.servicesDetail = {};
    for (const m of ['schools_quality', 'childrens_services', 'recycling']) { const v = scores[m].get(r.code); if (v != null) r.servicesDetail[m] = v; }
    if (pl.length) r.servicesDetail.planning = pl.reduce((x, y) => x + y, 0) / pl.length;
    r.services = parts.length >= MIN_SERVICES ? parts.reduce((x, y) => x + y, 0) / parts.length : null;
  }
  const svc = results.filter((r) => r.services != null && !r.separate).sort((a, b) => b.services - a.services);
  svc.forEach((r, i) => { r.svcRank = i + 1; r.svcBand = Math.min(5, Math.floor((i / svc.length) * 5) + 1); });
  const notGraded = results.filter((r) => !r.graded && !r.separate);
  const separate = results.filter((r) => r.separate);

  const line = (r) => `${String(r.rank ?? '-').padStart(3)}. ${r.name.padEnd(28)} ${r1(r.overall).toString().padStart(5)}  band ${r.band ?? '-'} | services ${r1(r.services)} (rank ${r.svcRank ?? '-'}, band ${r.svcBand ?? '-'}) | ${TOPICS.map(([t]) => `${t.split(' ')[0]} ${r1(r.topics[t])}`).join(', ')}`;
  console.log(`\n=== Graded: ${graded.length}; not graded (fewer than ${MIN_TOPICS} topics): ${notGraded.length}${notGraded.length ? ` - ${notGraded.map((r) => `${r.name} (${r.topicCount})`).join(', ')}` : ''} ===`);
  console.log(`listed separately (not ranked): ${separate.map((r) => `${r.name} (area score ${r1(r.overall)}, services ${r1(r.services)})`).join(', ')}`);
  const bands = {}; for (const r of graded) bands[r.band] = (bands[r.band] || 0) + 1;
  console.log(`areas per band: ${JSON.stringify(bands)}`);
  for (let b = 1; b <= 5; b++) { const s = graded.filter((r) => r.band === b).map((r) => r.overall); console.log(`  band ${b}: score ${r1(Math.min(...s))} to ${r1(Math.max(...s))}`); }

  console.log('\n=== Top 20 ===');
  for (const r of graded.slice(0, 20)) console.log(line(r));
  console.log('\n=== Bottom 20 ===');
  for (const r of graded.slice(-20)) console.log(line(r));

  console.log(`\n=== Services score: ${svc.length} areas scored (at least ${MIN_SERVICES} of 4 parts) ===`);
  console.log('  top 15:'); for (const r of svc.slice(0, 15)) console.log(`    ${r.svcRank}. ${r.name} ${r1(r.services)} (area rank ${r.rank})`);
  console.log('  bottom 15:'); for (const r of svc.slice(-15)) console.log(`    ${r.svcRank}. ${r.name} ${r1(r.services)} (area rank ${r.rank})`);
  const big = svc.filter((r) => r.band && Math.abs(r.svcBand - r.band) >= 3).sort((a, b) => a.svcRank - b.svcRank);
  console.log(`  areas whose services band and area band differ by 3 or more (${big.length}):`);
  for (const r of big.slice(0, 25)) console.log(`    ${r.name}: services band ${r.svcBand} (rank ${r.svcRank}), area band ${r.band} (rank ${r.rank})`);
  {
    const pairs = svc.filter((r) => r.overall != null).map((r) => [r.services, r.overall]);
    const mx = pairs.reduce((a, p) => a + p[0], 0) / pairs.length, my = pairs.reduce((a, p) => a + p[1], 0) / pairs.length;
    const c = pairs.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / Math.sqrt(pairs.reduce((a, p) => a + (p[0] - mx) ** 2, 0) * pairs.reduce((a, p) => a + (p[1] - my) ** 2, 0));
    console.log(`  correlation of services score with area score: ${r1(c * 100) / 100}`);
  }

  console.log('\n=== Sample areas ===');
  for (const s of SAMPLES) {
    const a = areas.find((x) => x.short_name === s || x.name.startsWith(s));
    const r = a && results.find((x) => x.code === a.gss_code);
    if (!r) { console.log(`  ${s}: not found`); continue; }
    console.log(line(r));
    for (const [t, ms] of TOPICS) console.log(`        ${t}: ${ms.map((m) => `${m} ${r1(measures[m].values.get(r.code))} (score ${r1(scores[m].get(r.code))})`).join('; ')}`);
  }

  // How much does each topic move the overall? (correlation of topic score with overall)
  console.log('\n=== How closely each topic follows the overall score (correlation, 1 = identical) ===');
  for (const [t] of TOPICS) {
    const pairs = graded.filter((r) => r.topics[t] != null).map((r) => [r.topics[t], r.overall]);
    const mx = pairs.reduce((s, p) => s + p[0], 0) / pairs.length, my = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
    const cov = pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    const sx = Math.sqrt(pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0)), sy = Math.sqrt(pairs.reduce((s, p) => s + (p[1] - my) ** 2, 0));
    console.log(`  ${t}: ${r1((cov / (sx * sy)) * 100) / 100}`);
  }
  // Band stability (the weight test), from the same scoring rules. Its normal ranking must
  // match the published one exactly, or nothing is saved.
  const stab = bandStability(results.filter((r) => !r.separate).map((r) => ({ code: r.code, name: r.name, topics: r.topics })));
  const mismatch = graded.filter((r) => { const n = stab.normal.get(r.code); return !n || n.rank !== r.rank || n.band !== r.band; });
  if (mismatch.length || stab.normal.size !== graded.length) throw new Error(`weight test ranking does not match the published ranking (${mismatch.length} areas differ)`);
  const half = stab.versions.length / 2;
  const nearCount = [...stab.changes.values()].filter((n) => n >= half).length;
  console.log(`\n=== Band stability: ${stab.versions.length} weight test versions; near a band boundary (band changes in ${half} or more): ${nearCount}; never changes: ${[...stab.changes.values()].filter((n) => n === 0).length} ===`);

  // Rows for public.area_ratings (one per area).
  const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
  const rows = results.map((r) => ({
    area_gss_code: r.code,
    area_name: r.name,
    area_score: round1(r.overall),
    area_rank: r.rank ?? null,
    area_band: r.band ?? null,
    areas_ranked: graded.length,
    topics_used: r.topicCount,
    topic_scores: Object.fromEntries(Object.entries(r.topics).map(([t, v]) => [t, round1(v)])),
    measures: Object.fromEntries(used.filter((m) => measures[m].values.has(r.code)).map((m) => [m, {
      label: measures[m].label, period: measures[m].period ?? null, better: measures[m].better,
      value: measures[m].values.get(r.code), score: round1(scores[m].get(r.code)),
    }])),
    services_score: round1(r.services),
    services_rank: r.svcRank ?? null,
    services_band: r.svcBand ?? null,
    services_ranked: svc.length,
    services_parts: r.servicesCount,
    services_detail: Object.fromEntries(Object.entries(r.servicesDetail).map(([k, v]) => [k, round1(v)])),
    band_changes: r.rank ? stab.changes.get(r.code) : null,
    band_versions: r.rank ? stab.versions.length : null,
    near_band_boundary: r.rank ? stab.changes.get(r.code) >= half : null,
    excluded_reason: r.separate ? SEPARATE_REASON : (!r.graded ? `Figures for only ${r.topicCount} of 8 topics (at least ${MIN_TOPICS} needed to rank).` : null),
    method_version: METHOD_VERSION,
  }));
  console.log(`\n=== Rows for area_ratings: ${rows.length} (ranked on area ${rows.filter((x) => x.area_rank).length}; ranked on services ${rows.filter((x) => x.services_rank).length}; listed separately ${separate.length}) ===`);
  if (!WRITE) { console.log('\nDRY RUN complete. Nothing was written.'); return; }

  console.log('\n--- Writing ---');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const runStart = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 500) {
    const now = new Date().toISOString();
    const { error } = await db.from('area_ratings').upsert(rows.slice(i, i + 500).map((x) => ({ ...x, scored_at: now, synced_at: now })), { onConflict: 'area_gss_code' });
    if (error) throw new Error(`area_ratings upsert: ${error.message}`);
  }
  const { error: d, count } = await db.from('area_ratings').delete({ count: 'exact' }).lt('synced_at', runStart);
  if (d) throw new Error(`area_ratings stale delete: ${d.message}`);
  console.log(`  area_ratings: ${rows.length} saved; ${count || 0} areas no longer present removed`);
  // Rebuild the site's cached council league data now rather than within 6 hours.
  await require('./lib/refresh-site').refreshCouncilPages();
  console.log('\nWRITE complete.');
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
