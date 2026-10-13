// Shared scoring rules for the area league table (England). Used by
// scripts/score-areas.js (the published ratings) and scripts/test-area-weights.js
// (the weight test), so both always score in exactly the same way.

'use strict';

const TOPICS = [
  ['Schools and children', ['schools_quality', 'childrens_services']],
  ['Safety', ['crime', 'roads']],
  ['Health', ['life_exp_f', 'life_exp_m', 'obesity']],
  ['Jobs and poverty', ['claimants', 'child_poverty', 'fuel_poverty']],
  ['Housing', ['temp_accommodation', 'affordability']],
  ['Environment', ['recycling', 'sewage']],
  ['Connectivity', ['gigabit', 'indoor_4g_all']],
  ['Local services', ['planning_major', 'planning_nonmajor']],
];
const MIN_TOPICS = 6;

// Percentile score 0..100 with ties sharing the average position.
function scoreMeasure(values, better) {
  const entries = [...values.entries()].filter(([, v]) => v != null && Number.isFinite(v));
  const n = entries.length;
  const out = new Map();
  if (n < 2) return out;
  const sorted = [...entries].sort((a, b) => (better === 'higher' ? a[1] - b[1] : b[1] - a[1])); // worst first
  let i = 0;
  while (i < n) {
    let j = i; while (j + 1 < n && sorted[j + 1][1] === sorted[i][1]) j++;
    const pos = (i + j) / 2; // average position of the tie
    for (let k = i; k <= j; k++) out.set(sorted[k][0], (pos / (n - 1)) * 100);
    i = j + 1;
  }
  return out;
}

// Topic scores for one area: average of that topic's measure scores the area has.
function topicScores(code, scores) {
  const out = {};
  for (const [t, ms] of TOPICS) {
    const s = ms.map((m) => scores[m].get(code)).filter((x) => x != null);
    if (s.length) out[t] = s.reduce((x, y) => x + y, 0) / s.length;
  }
  return out;
}

// Overall score from topic scores with optional weights ({ topic: weight }, default 1;
// weight 0 leaves a topic out). Returns { overall, count } where count is the number of
// topics with figures and a weight above 0.
function overallScore(topics, weights = {}) {
  let sum = 0, wsum = 0, count = 0;
  for (const [t, v] of Object.entries(topics)) {
    const w = weights[t] ?? 1;
    if (w <= 0) continue;
    sum += v * w; wsum += w; count++;
  }
  return { overall: wsum ? sum / wsum : null, count };
}

// Five bands by rank, a fifth of ranked areas each (1 = top fifth). Sorts in place.
function rankAndBand(list, key) {
  list.sort((a, b) => b[key] - a[key]);
  list.forEach((r, i) => { r.rank = i + 1; r.band = Math.min(5, Math.floor((i / list.length) * 5) + 1); });
  return list;
}

// Ranks a list of areas ({ code, name, topics }) with the given weights. Returns a Map
// code -> { code, name, overall, rank, band } of the areas with enough topics.
function rankWith(base, weights = {}, minTopics = MIN_TOPICS) {
  const list = [];
  for (const a of base) {
    const { overall, count } = overallScore(a.topics, weights);
    if (overall != null && count >= minTopics) list.push({ code: a.code, name: a.name, overall });
  }
  rankAndBand(list, 'overall');
  return new Map(list.map((r) => [r.code, r]));
}

// The 16 weight test versions: each topic left out (then one fewer topic is needed to be
// ranked), and each topic counted double.
function weightVersions() {
  const v = [];
  for (const [t] of TOPICS) v.push({ label: `${t} left out`, weights: { [t]: 0 }, min: MIN_TOPICS - 1 });
  for (const [t] of TOPICS) v.push({ label: `${t} counted double`, weights: { [t]: 2 }, min: MIN_TOPICS });
  return v;
}

// Band stability: for each area ranked normally, in how many versions its band differs.
// Returns { normal, versions, results: [{ version, alt }], changes: Map code -> count }.
function bandStability(base) {
  const normal = rankWith(base, {}, MIN_TOPICS);
  const versions = weightVersions();
  const changes = new Map([...normal.keys()].map((k) => [k, 0]));
  const results = [];
  for (const v of versions) {
    const alt = rankWith(base, v.weights, v.min);
    for (const [code, r] of normal) { const x = alt.get(code); if (x && x.band !== r.band) changes.set(code, changes.get(code) + 1); }
    results.push({ version: v, alt });
  }
  return { normal, versions, results, changes };
}

module.exports = { TOPICS, MIN_TOPICS, scoreMeasure, topicScores, overallScore, rankAndBand, rankWith, weightVersions, bandStability };
