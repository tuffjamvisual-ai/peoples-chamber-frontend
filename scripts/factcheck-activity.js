// Fact-check mp_contribution_totals.total_contributions against the live Hansard
// SpokenResultCount for every current MP. Reports discrepancies and fixes the
// stored totals. Word counts for false-zeros are recomputed too.
const { execSync, exec } = require('child_process');
const DB = execSync(`grep -E '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//; s/"$//'`).toString().trim();
const START = '2024-07-04';

function q(sql) { return execSync(`psql "${DB}" -tA -c "${sql}"`).toString().trim(); }
function curlJson(url) {
  return new Promise((res) => {
    exec(`/usr/bin/curl -s -m 30 "${url}"`, { maxBuffer: 1 << 26 }, (e, out) => {
      if (e) return res(null);
      try { res(JSON.parse(out)); } catch { res(null); }
    });
  });
}
async function liveTotal(id) {
  const j = await curlJson(`https://hansard-api.parliament.uk/search/contributions/Spoken.json?queryParameters.memberId=${id}&queryParameters.startDate=${START}&queryParameters.take=1`);
  return j ? (j.SpokenResultCount ?? null) : null;
}
async function liveWords(id) {
  let skip = 0, words = 0, total = null, fetched = 0, guard = 0;
  while (guard++ < 200) {
    const j = await curlJson(`https://hansard-api.parliament.uk/search/contributions/Spoken.json?queryParameters.memberId=${id}&queryParameters.startDate=${START}&queryParameters.take=100&queryParameters.skip=${skip}`);
    if (!j) break;
    if (total === null) total = j.SpokenResultCount || 0;
    const R = j.Results || [];
    if (!R.length) break;
    for (const r of R) words += String(r.ContributionTextFull || r.ContributionText || '').split(/\s+/).filter(Boolean).length;
    fetched += R.length; skip += R.length;
    if (fetched >= total || R.length < 100) break;
  }
  return words;
}

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

(async () => {
  const rows = q(`SELECT m.member_id, m.name, COALESCE(t.total_contributions,0) FROM mps m JOIN mp_contribution_totals t ON t.member_id=m.member_id WHERE (m.current_member IS NULL OR m.current_member=true)`)
    .split('\n').filter(Boolean).map((l) => { const [id, name, stored] = l.split('|'); return { id: +id, name, stored: +stored }; });
  console.log(`Checking ${rows.length} current MPs...`);

  const checked = await pool(rows, 10, async (r) => {
    const live = await liveTotal(r.id);
    return { ...r, live };
  });

  const diffs = checked.filter((r) => r.live != null && r.live !== r.stored)
    .map((r) => ({ ...r, delta: r.live - r.stored }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const failed = checked.filter((r) => r.live == null);

  console.log(`\n${diffs.length} MPs differ from live Hansard. ${failed.length} fetch failures.`);
  console.log('\nLargest 20 discrepancies (stored -> live):');
  for (const d of diffs.slice(0, 20)) console.log(`  ${String(d.delta > 0 ? '+' + d.delta : d.delta).padStart(6)}  ${d.name} (${d.id}): ${d.stored} -> ${d.live}`);

  // False zeros: stored 0 but live > 0 -> recompute words too.
  const falseZeros = diffs.filter((d) => d.stored === 0 && d.live > 0);
  console.log(`\n${falseZeros.length} FALSE ZEROS (stored 0, actually active): ${falseZeros.map((d) => d.name + '=' + d.live).join(', ') || 'none'}`);

  // Apply: update total for all diffs; recompute+update words for false zeros.
  let updated = 0;
  for (const d of diffs) {
    if (d.stored === 0 && d.live > 0) {
      const w = await liveWords(d.id);
      q(`UPDATE mp_contribution_totals SET total_contributions=${d.live}, word_count=${w}, updated_at=now() WHERE member_id=${d.id}`);
    } else {
      q(`UPDATE mp_contribution_totals SET total_contributions=${d.live}, updated_at=now() WHERE member_id=${d.id}`);
    }
    updated++;
  }
  console.log(`\nUpdated ${updated} rows (totals; +word counts for ${falseZeros.length} false zeros).`);
})();
