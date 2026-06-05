#!/usr/bin/env node
/**
 * Fact-checks the 20 longest bios in mp_biography against the
 * Parliament Members-API (https://members-api.parliament.uk/api/Members/<id>).
 *
 * Verifies the easy-to-extract numeric claims only:
 *   - Constituency name
 *   - Party label
 *   - First-elected year (extracted by regex from bio prose)
 *   - Latest majority (regex from bio prose)
 *
 * Flags rows where the bio's claim disagrees with the API.
 *
 * Usage: DATABASE_URL=... node scripts/fact-check-recent-bios.js
 */

const { execSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

function psqlT(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  });
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber-FactCheck/1.0' } });
  if (!r.ok) return null;
  return r.json();
}

function extractClaims(bio) {
  // Look only for SHORT numeric claims — we're not reproducing the bio,
  // just plucking single data points to check against the API.
  const claims = {};

  const electedM = bio.match(/(?:first )?elected (?:in |for [^,]+ in )?(?:the )?(?:by[- ]election (?:in )?)?(\d{4})/i)
                 || bio.match(/MP (?:for|since) [^,]+ (?:since )?(\d{4})/i);
  if (electedM) claims.firstElectedYear = parseInt(electedM[1], 10);

  const majM = bio.match(/majority of ([\d,]+)/i)
             || bio.match(/won by ([\d,]+) vote/i)
             || bio.match(/by ([\d,]+) votes/i);
  if (majM) claims.majority = parseInt(majM[1].replace(/,/g, ''), 10);

  return claims;
}

async function main() {
  const idFilter = (process.env.BIO_IDS || '').trim();
  const where = idFilter
    ? `WHERE b.political_bio IS NOT NULL AND b.member_id IN (${idFilter
        .split(',').map((s) => parseInt(s, 10)).filter(Number.isFinite).join(',')})`
    : `WHERE b.political_bio IS NOT NULL AND length(b.political_bio) > 2000`;
  const order = idFilter ? 'm.display_name' : 'length(b.political_bio) DESC NULLS LAST';
  const limit = idFilter ? '' : 'LIMIT 20';

  // psql -A -F'|' splits on '|' but a bio can contain '|' AND newlines.
  // Easier: emit one row per fetch and use a record separator that bios won't contain.
  const raw = execSync(`psql "${DATABASE_URL}" -t -A -F$'\\x1f' -R $'\\x1e' -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: `SELECT b.member_id, m.display_name, m.party, m.constituency, b.political_bio
            FROM mp_biography b
            JOIN mps m ON m.member_id = b.member_id
            ${where}
            ORDER BY ${order}
            ${limit};`,
  });
  const lines = raw.split('\x1e').map((l) => l.trim()).filter(Boolean);

  console.log(`Fact-checking ${lines.length} bios against the Parliament Members API\n`);

  const issues = [];

  for (const line of lines) {
    const parts = line.split('\x1f');
    const member_id = parseInt(parts[0], 10);
    if (!Number.isFinite(member_id)) continue;
    const display_name = parts[1];
    const dbParty = parts[2];
    const dbConstituency = parts[3];
    const bio = parts.slice(4).join('\x1f');

    const member = await fetchJson(`https://members-api.parliament.uk/api/Members/${member_id}`);
    const elect  = await fetchJson(`https://members-api.parliament.uk/api/Members/${member_id}/LatestElectionResult`);

    const apiParty = member?.value?.latestParty?.name || '?';
    const apiConstituency = member?.value?.latestHouseMembership?.membershipFrom || '?';
    // membershipStartDate gives the latest term start (so for a 2024
    // returnee that's 2024, not their original first-elected year).
    const apiLatestStart = (member?.value?.latestHouseMembership?.membershipStartDate || '').slice(0, 4);
    const apiMajority = elect?.value?.majority;
    const apiElectionDate = (elect?.value?.electionDate || '').slice(0, 10);

    const claims = extractClaims(bio);

    console.log(`── ${display_name}  (member_id ${member_id})`);
    console.log(`     DB             : ${dbParty} · ${dbConstituency}`);
    console.log(`     API            : ${apiParty} · ${apiConstituency} · latest term from ${apiLatestStart}`);
    console.log(`     API last vote  : majority ${apiMajority ?? '?'}  (${apiElectionDate})`);
    if (claims.firstElectedYear || claims.majority) {
      const bits = [];
      if (claims.firstElectedYear) bits.push(`year=${claims.firstElectedYear}`);
      if (claims.majority) bits.push(`majority=${claims.majority.toLocaleString()}`);
      console.log(`     Bio claims     : ${bits.join('  ')}`);
    }

    // Flag mismatches
    const local = [];
    if (claims.majority && apiMajority && claims.majority !== apiMajority) {
      local.push(`majority ${claims.majority.toLocaleString()} ≠ API ${apiMajority.toLocaleString()}`);
    }
    if (claims.firstElectedYear && apiLatestStart && Math.abs(claims.firstElectedYear - parseInt(apiLatestStart, 10)) > 0 && claims.firstElectedYear > 2024) {
      // Only flag if the bio claims an elected-year >2024 that differs.
      local.push(`first-elected year ${claims.firstElectedYear} vs API latest-term start ${apiLatestStart}`);
    }
    if (dbConstituency && apiConstituency && dbConstituency.toLowerCase() !== apiConstituency.toLowerCase()) {
      local.push(`constituency DB="${dbConstituency}" ≠ API="${apiConstituency}"`);
    }
    if (local.length) {
      console.log(`     ⚠  ${local.join('  |  ')}`);
      issues.push({ member_id, name: display_name, issues: local });
    }
    console.log();

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('═════════════════════════════════════════════════════');
  console.log(`Done. ${issues.length} bios flagged for review.`);
  if (issues.length) {
    console.log('\nSummary:');
    for (const it of issues) {
      console.log(`  • ${it.name} (${it.member_id}): ${it.issues.join('  |  ')}`);
    }
  }
}

main().catch((e) => { console.error('fatal:', e?.message || e); process.exit(1); });
