#!/usr/bin/env node
/**
 * Backfill dept_ministers.photo_url and dept_officials.photo_url from
 * the gov.uk content API. Each row's `slug` maps to:
 *   https://www.gov.uk/api/content/government/people/<slug>
 * with image at details.image.url.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/backfill-staff-photos.js [--dry-run]
 *
 * Run sequentially with a 200ms gap between requests to avoid hammering
 * gov.uk. ~370 rows × 200ms ≈ 75 seconds.
 */

const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -c ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
  });
}

function sqlLiteral(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

async function fetchPhoto(slug) {
  try {
    const res = await fetch(`https://www.gov.uk/api/content/government/people/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.details?.image?.url || null;
  } catch {
    return null;
  }
}

async function backfill(table) {
  const rows = psql(
    `SELECT id, slug FROM ${table} WHERE (photo_url IS NULL OR photo_url='') AND slug IS NOT NULL AND slug != '' ORDER BY id;`,
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [id, slug] = line.split('|');
      return { id: parseInt(id, 10), slug };
    });

  console.log(`[${table}] ${rows.length} rows to process`);

  let updated = 0;
  let notFound = 0;
  let i = 0;
  for (const row of rows) {
    i++;
    const photo = await fetchPhoto(row.slug);
    if (!photo) {
      notFound++;
      if (i % 25 === 0) console.log(`  ${i}/${rows.length} (updated=${updated}, missing=${notFound})`);
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    if (DRY_RUN) {
      console.log(`  [dry] ${table} id=${row.id} slug=${row.slug} → ${photo}`);
    } else {
      psql(`UPDATE ${table} SET photo_url = ${sqlLiteral(photo)} WHERE id = ${row.id};`);
    }
    updated++;
    if (i % 25 === 0) console.log(`  ${i}/${rows.length} (updated=${updated}, missing=${notFound})`);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`[${table}] DONE — updated=${updated}, missing=${notFound}, total=${rows.length}`);
}

(async () => {
  if (DRY_RUN) console.log('=== DRY RUN ===');
  await backfill('dept_ministers');
  await backfill('dept_officials');
})();
