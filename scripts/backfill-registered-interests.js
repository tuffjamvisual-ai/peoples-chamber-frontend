#!/usr/bin/env node
/**
 * One-off backfill: re-syncs every current MP's registered interests
 * from the Parliament Members API into mp_registered_interests.
 *
 * Mirrors the logic of app/api/sync-registered-interests/route.ts but
 * writes via psql (DATABASE_URL) instead of supabase-js, so it doesn't
 * need the service role key.
 *
 * Use to seed the table or close a sync gap. After this, the daily
 * cron handles ongoing maintenance (once SUPABASE_SERVICE_ROLE_KEY is
 * set in Vercel env so the route can run).
 *
 * Usage: DATABASE_URL=... node scripts/backfill-registered-interests.js
 */

const { execFileSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

const THROTTLE_MS = 130;
const UA = 'PeoplesChamber-RegisterBackfill/1.0';
const PARLIAMENT_API = 'https://members-api.parliament.uk/api/Members';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function psql(sql) {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-F', '|'], {
    encoding: 'utf8',
    input: sql,
  }).trim();
}

function psqlJson(sql) {
  return execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-q'], {
    encoding: 'utf8',
    input: sql,
  });
}

async function fetchInterests(memberId) {
  const res = await fetch(`${PARLIAMENT_API}/${memberId}/RegisteredInterests`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Members API ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.value) ? json.value : [];
}

function flattenRows(memberId, categories) {
  const rows = [];
  for (const cat of categories) {
    for (const it of cat.interests || []) {
      if (it.deletedWhen) continue;
      rows.push({
        member_id: memberId,
        category_id: cat.id,
        category_name: cat.name,
        category_sort_order: cat.sortOrder ?? null,
        interest_id: it.id,
        interest_text: it.interest ?? '',
        created_when: it.createdWhen ?? null,
        last_amended_when: it.lastAmendedWhen ?? null,
        is_correction: Boolean(it.isCorrection),
        child_interests: (it.childInterests || []).map((c) => ({
          id: c.id,
          interest: c.interest,
          createdWhen: c.createdWhen ?? null,
          lastAmendedWhen: c.lastAmendedWhen ?? null,
          deletedWhen: c.deletedWhen ?? null,
          isCorrection: Boolean(c.isCorrection),
          childInterests: c.childInterests || [],
        })),
      });
    }
  }
  return rows;
}

// psql-safe literal encoding: base64 the JSON, decode + cast to jsonb / text on the server.
function buildUpsertSql(rows) {
  if (rows.length === 0) return null;
  const values = rows.map((r) => {
    const textB64 = Buffer.from(r.interest_text || '', 'utf8').toString('base64');
    const childB64 = Buffer.from(JSON.stringify(r.child_interests || []), 'utf8').toString('base64');
    return `(
      ${r.member_id},
      ${r.category_id},
      convert_from(decode('${Buffer.from(r.category_name, 'utf8').toString('base64')}', 'base64'), 'UTF8'),
      ${r.category_sort_order === null ? 'NULL' : r.category_sort_order},
      ${r.interest_id},
      convert_from(decode('${textB64}', 'base64'), 'UTF8'),
      ${r.created_when ? `'${r.created_when.replace(/'/g, "''")}'::timestamp` : 'NULL'},
      ${r.last_amended_when ? `'${r.last_amended_when.replace(/'/g, "''")}'::timestamp` : 'NULL'},
      ${r.is_correction},
      convert_from(decode('${childB64}', 'base64'), 'UTF8')::jsonb
    )`;
  }).join(',\n');

  return `
    INSERT INTO mp_registered_interests (
      member_id, category_id, category_name, category_sort_order,
      interest_id, interest_text, created_when, last_amended_when,
      is_correction, child_interests
    ) VALUES
    ${values}
    ON CONFLICT (member_id, interest_id) DO UPDATE SET
      category_id         = EXCLUDED.category_id,
      category_name       = EXCLUDED.category_name,
      category_sort_order = EXCLUDED.category_sort_order,
      interest_text       = EXCLUDED.interest_text,
      created_when        = EXCLUDED.created_when,
      last_amended_when   = EXCLUDED.last_amended_when,
      is_correction       = EXCLUDED.is_correction,
      child_interests     = EXCLUDED.child_interests;
  `;
}

function buildOrphanDeleteSql(memberId, liveIds) {
  if (liveIds.length === 0) {
    return `DELETE FROM mp_registered_interests WHERE member_id = ${memberId};`;
  }
  return `DELETE FROM mp_registered_interests WHERE member_id = ${memberId} AND interest_id NOT IN (${liveIds.join(',')});`;
}

async function main() {
  console.log('Pulling MP list...');
  const lines = psql(`SELECT member_id FROM mps ORDER BY member_id;`).split('\n').filter(Boolean);
  console.log(`${lines.length} MPs to backfill.\n`);

  let ok = 0, fail = 0, upserted = 0, deleted = 0;
  const failures = [];
  let i = 0;

  for (const line of lines) {
    const memberId = parseInt(line, 10);
    i += 1;
    if (i % 50 === 0) process.stderr.write(`  ${i}/${lines.length}...\n`);

    try {
      const categories = await fetchInterests(memberId);
      const rows = flattenRows(memberId, categories);
      const liveIds = rows.map((r) => r.interest_id);

      const upsertSql = buildUpsertSql(rows);
      const deleteSql = buildOrphanDeleteSql(memberId, liveIds);

      // Single transaction per MP
      const tx = ['BEGIN;'];
      if (upsertSql) tx.push(upsertSql);
      tx.push(deleteSql);
      tx.push('COMMIT;');
      psqlJson(tx.join('\n'));

      upserted += rows.length;
      ok += 1;
    } catch (err) {
      fail += 1;
      if (failures.length < 20) failures.push({ memberId, detail: err?.message || String(err) });
    }

    await sleep(THROTTLE_MS);
  }

  console.log('\n═════════════════════════════════════════════════════');
  console.log('BACKFILL SUMMARY');
  console.log('═════════════════════════════════════════════════════');
  console.log(`MPs processed   : ${lines.length}`);
  console.log(`Succeeded       : ${ok}`);
  console.log(`Failed          : ${fail}`);
  console.log(`Rows upserted   : ${upserted}`);

  if (failures.length) {
    console.log('\nFailures (first 20):');
    for (const f of failures) console.log(`  ${f.memberId}  ${f.detail}`);
  }

  // Final per-table tally
  const total = psql(`SELECT COUNT(*) FROM mp_registered_interests;`);
  const distinct = psql(`SELECT COUNT(DISTINCT member_id) FROM mp_registered_interests;`);
  const latest = psql(`SELECT MAX(last_amended_when)::date FROM mp_registered_interests;`);
  console.log(`\nDB now: ${total} total rows across ${distinct} MPs. Most recent amendment: ${latest}.`);
}

main().catch((e) => { console.error('fatal:', e?.message || e); process.exit(1); });
