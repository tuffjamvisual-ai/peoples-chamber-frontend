#!/usr/bin/env node
// Backfill bill.description with longTitle from Parliament Bills API
// Matches by bill.parliament_id (NOT bill.id — the two are different keyspaces)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const THROTTLE_MS = 150;
const BATCH_FLUSH = 100;
const PROGRESS_EVERY = 25;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Source .env.local first:');
  console.error('  export $(grep -E "^DATABASE_URL=" .env.local | xargs)');
  process.exit(1);
}

function psql(sql) {
  const flat = sql.replace(/\s+/g, ' ').trim();
  return execSync(`psql "${DATABASE_URL}" -t -A -F'\t' -c ${JSON.stringify(flat)}`, {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function psqlFile(filepath) {
  return execSync(`psql "${DATABASE_URL}" -f ${JSON.stringify(filepath)}`, {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

async function fetchLongTitle(parliamentId) {
  const url = `https://bills-api.parliament.uk/api/v1/Bills/${parliamentId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const lt = (data.longTitle || '').trim();
  return lt || null;
}

async function flushBatch(updates, batchFile) {
  if (updates.length === 0) return 0;
  const sql = updates
    .map((u) => `UPDATE bill SET description = '${sqlEscape(u.longTitle)}' WHERE id = ${u.id};`)
    .join('\n');
  fs.writeFileSync(batchFile, sql);
  psqlFile(batchFile);
  return updates.length;
}

async function main() {
  console.log('=== BACKFILL BILL DESCRIPTIONS (longTitle from Parliament API) ===\n');

  const raw = psql(`
    SELECT id, parliament_id, title
    FROM bill
    WHERE parliament_id IS NOT NULL
      AND (
        description IS NULL
        OR LOWER(TRIM(description)) = 'no description available'
        OR description = title
      )
    ORDER BY id;
  `);

  const bills = raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, parliament_id, title] = line.split('\t');
      return { id: parseInt(id, 10), parliament_id: parseInt(parliament_id, 10), title };
    });

  console.log(`Found ${bills.length} bills needing descriptions\n`);
  if (bills.length === 0) return;

  const batchFile = path.join(__dirname, '.backfill-bill-descriptions.batch.sql');
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  let pending = [];

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    try {
      const longTitle = await fetchLongTitle(bill.parliament_id);
      if (!longTitle) {
        skipped++;
      } else {
        pending.push({ id: bill.id, longTitle });
      }
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.log(`  [${i + 1}/${bills.length}] parl_id=${bill.parliament_id} FAIL: ${err.message}`);
      }
    }

    if (pending.length >= BATCH_FLUSH) {
      const n = await flushBatch(pending, batchFile);
      updated += n;
      pending = [];
    }

    if ((i + 1) % PROGRESS_EVERY === 0) {
      console.log(`  [${i + 1}/${bills.length}] updated=${updated} failed=${failed} skipped=${skipped}`);
    }

    await sleep(THROTTLE_MS);
  }

  const n = await flushBatch(pending, batchFile);
  updated += n;

  try { fs.unlinkSync(batchFile); } catch {}

  console.log('\n=== BACKFILL COMPLETE ===');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}  (Parliament API returned no longTitle)`);
  console.log(`  Total:   ${bills.length}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
