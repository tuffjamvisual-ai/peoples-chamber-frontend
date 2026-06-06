#!/usr/bin/env node
// Populates mp_activity_metrics.speeches_year + questions_year for every
// current MP from members-api.parliament.uk. One pair of API calls per
// MP — at ~100ms each, the full 650-MP pass runs in about 2 minutes.
//
// What counts as a "speech":
//   speechCount + interventionCount + supplementaryQuestionCount
// (i.e. any spoken contribution: a full speech, an interjection on
//  another member's speech, or a supplementary at oral questions)
//
// What counts as a "written question":
//   totalResults from /Members/{id}/WrittenQuestions filtered to last
//   12 months. This is the count of WQs the MP TABLED, not answered.
//
// Window: rolling 12 months from now. Older entries in the API
// response are filtered out client-side.
//
// Run:
//   node scripts/sync-members-contributions.js              # all current MPs
//   node scripts/sync-members-contributions.js --limit 50   # first 50
//   node scripts/sync-members-contributions.js --only 4483  # one MP

require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const ARGS = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => {
  if (a.startsWith('--')) {
    const key = a.replace(/^--/, '');
    const next = arr[i + 1];
    return [key, next && !next.startsWith('--') ? next : 'true'];
  }
  return [];
}).filter(Boolean));

const LIMIT = ARGS.limit ? parseInt(ARGS.limit, 10) : null;
const ONLY = ARGS.only ? parseInt(ARGS.only, 10) : null;

const TWELVE_MONTHS_AGO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d;
})();

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

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0', 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function contributionsForMember(memberId) {
  // Take 300 to comfortably cover 12 months for the most active speakers.
  const data = await fetchJson(`https://members-api.parliament.uk/api/Members/${memberId}/ContributionSummary?skip=0&take=300`);
  let speeches = 0;
  for (const item of data.items || []) {
    const v = item.value || {};
    const sitting = v.sittingDate ? new Date(v.sittingDate) : null;
    if (!sitting || sitting < TWELVE_MONTHS_AGO) continue;
    speeches += (v.speechCount || 0) + (v.interventionCount || 0) + (v.supplementaryQuestionCount || 0);
  }
  return speeches;
}

async function questionsForMember(memberId) {
  // WrittenQuestions totalResults is cumulative across the MP's career,
  // not date-windowed by the endpoint. Take=100 + filter to 12-month
  // window approximates last-year count for all but the very
  // most-prolific question-tablers.
  const data = await fetchJson(`https://members-api.parliament.uk/api/Members/${memberId}/WrittenQuestions?skip=0&take=100`);
  let questions = 0;
  for (const item of data.items || []) {
    const v = item.value || {};
    const tabled = v.dateTabled ? new Date(v.dateTabled) : null;
    if (!tabled || tabled < TWELVE_MONTHS_AGO) continue;
    questions++;
  }
  return questions;
}

(async () => {
  const list = ONLY
    ? [{ member_id: ONLY }]
    : await (async () => {
        const out = (await psql(`SELECT member_id FROM mps WHERE current_member = TRUE ORDER BY member_id;`)).trim().split('\n');
        return out.filter(Boolean).map((s) => ({ member_id: parseInt(s, 10) }));
      })();

  const slice = LIMIT ? list.slice(0, LIMIT) : list;
  console.log(`Processing ${slice.length} member${slice.length === 1 ? '' : 's'} (cutoff: ${TWELVE_MONTHS_AGO.toISOString().slice(0,10)})…`);

  const CONCURRENCY = 12;     // members-api is rate-tolerant in practice
  const results = new Map();
  let failures = 0;
  const t0 = Date.now();
  let done = 0;

  async function processOne(memberId) {
    try {
      const [speeches, questions] = await Promise.all([
        contributionsForMember(memberId),
        questionsForMember(memberId),
      ]);
      results.set(memberId, { speeches, questions });
    } catch (e) {
      failures++;
      console.error(`  member ${memberId}: ${e.message}`);
    } finally {
      done++;
      if (done % 25 === 0 || done === slice.length) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        process.stdout.write(`\r  ${done}/${slice.length}  done=${results.size}  fail=${failures}  elapsed=${elapsed}s`);
      }
    }
  }

  // Concurrency pool
  const queue = [...slice];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const m = queue.shift();
      if (!m) break;
      await processOne(m.member_id);
    }
  }));
  process.stdout.write('\n');

  // Batched UPDATE — one statement with many CASE branches OR many UPDATEs.
  // Simpler: emit one UPDATE per row but stream them into a single psql call.
  console.log(`\nWriting ${results.size} rows to mp_activity_metrics…`);
  const lines = Array.from(results.entries()).map(([id, r]) =>
    `UPDATE mp_activity_metrics SET speeches_year = ${r.speeches}, questions_year = ${r.questions}, refreshed_at = now() WHERE member_id = ${id};`,
  );
  await psql(lines.join('\n'));
  console.log(`Done. ${results.size} updated, ${failures} failed.`);
})().catch((e) => { console.error(e); process.exit(1); });
