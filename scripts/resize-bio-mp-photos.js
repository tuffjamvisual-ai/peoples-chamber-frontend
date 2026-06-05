#!/usr/bin/env node
/**
 * Bulk-resize photos for every MP that has a biography written.
 *
 * For each MP in `mp_biography`:
 *   1. Download current photo bytes from Supabase Storage (path: mps/<id>.jpg)
 *   2. Resize to max 800px on longest edge, re-encode as WebP @ q82
 *   3. Upload to mps/<id>.webp (separate file, original .jpg left in bucket)
 *   4. UPDATE mps.photo_url to point at the new .webp URL with cache-bust
 *
 * Runs serially (one MP at a time) to stay polite to Supabase. ~3 seconds
 * per photo × 92 MPs ≈ 5 minutes.
 *
 * Usage: DATABASE_URL=... node scripts/resize-bio-mp-photos.js
 *        DATABASE_URL=... DRY_RUN=true node scripts/resize-bio-mp-photos.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const sharp = require('sharp');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN      = process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  process.exit(1);
}
if (!DATABASE_URL && !DRY_RUN) {
  console.error('DATABASE_URL required for live run. Set DRY_RUN=true to preview.');
  process.exit(1);
}

const RESIZE_MAX_PX = 800;
const WEBP_QUALITY  = 82;
const THROTTLE_MS   = 250;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
  }).trim();
}

function psqlExec(sql) {
  execSync(`psql "${DATABASE_URL}" -v ON_ERROR_STOP=1`, {
    encoding: 'utf8',
    input: sql,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
}

async function fetchBytes(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber-PhotoResize/1.0' } });
  if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no uploads, no DB writes)' : 'LIVE'}\n`);

  // Pull the 92 MPs with bios + Supabase-hosted photos
  const rows = psql(`
    SELECT m.member_id, m.display_name, m.photo_url
    FROM mp_biography b
    JOIN mps m USING(member_id)
    WHERE b.political_bio IS NOT NULL
      AND length(b.political_bio) > 100
      AND m.photo_url LIKE '${SUPABASE_URL}/storage/%'
    ORDER BY m.member_id;
  `).split('\n').filter(Boolean);

  console.log(`${rows.length} MPs queued.\n`);

  let okCount = 0;
  let failCount = 0;
  let totalSourceBytes = 0;
  let totalEncodedBytes = 0;
  const failures = [];

  for (let i = 0; i < rows.length; i++) {
    const [idStr, name, photoUrl] = rows[i].split('|');
    const memberId = parseInt(idStr, 10);

    try {
      // Strip the cache-bust query string for the raw fetch
      const rawUrl = photoUrl.split('?')[0];

      const sourceBuffer = await fetchBytes(rawUrl);
      totalSourceBytes += sourceBuffer.length;

      const encoded = await sharp(sourceBuffer)
        .rotate()
        .resize({
          width:  RESIZE_MAX_PX,
          height: RESIZE_MAX_PX,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();
      totalEncodedBytes += encoded.length;

      const pct = (100 * (1 - encoded.length / sourceBuffer.length)).toFixed(1);
      const tag = `[${(i + 1).toString().padStart(2)}/${rows.length}] ${name} (${memberId})`;
      const sizeNote = `${(sourceBuffer.length / 1024).toFixed(0)}KB -> ${(encoded.length / 1024).toFixed(0)}KB (${pct}% smaller)`;

      if (DRY_RUN) {
        console.log(`${tag}  ${sizeNote}  [dry-run]`);
      } else {
        const storagePath = `mps/${memberId}.webp`;
        const { error: upErr } = await supabase.storage
          .from('photos')
          .upload(storagePath, encoded, { contentType: 'image/webp', upsert: true });
        if (upErr) throw new Error(`upload: ${upErr.message}`);

        const ts = Math.floor(Date.now() / 1000);
        const newUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${storagePath}?v=${ts}`;
        psqlExec(
          `UPDATE mps SET photo_url = '${newUrl}' WHERE member_id = ${memberId};`
        );
        console.log(`${tag}  ${sizeNote}  → ${storagePath}`);
      }

      okCount++;
    } catch (err) {
      failCount++;
      const msg = err?.message || String(err);
      failures.push({ memberId, name, msg });
      console.error(`  ✗ ${name} (${memberId}): ${msg}`);
    }

    if (i < rows.length - 1) await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  console.log('\n═════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═════════════════════════════════════════════════════');
  console.log(`Processed:        ${rows.length}`);
  console.log(`Succeeded:        ${okCount}`);
  console.log(`Failed:           ${failCount}`);
  console.log(`Source total:     ${(totalSourceBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Encoded total:    ${(totalEncodedBytes / 1024 / 1024).toFixed(1)} MB`);
  const saved = totalSourceBytes - totalEncodedBytes;
  const pct = totalSourceBytes > 0 ? (100 * saved / totalSourceBytes).toFixed(1) : 0;
  console.log(`Bytes saved:      ${(saved / 1024 / 1024).toFixed(1)} MB (${pct}%)`);

  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  ${f.memberId}  ${f.name}  ${f.msg}`));
  }

  if (!DRY_RUN && okCount > 0) {
    console.log('\nRevalidating /mps...');
    try {
      const r = await fetch('https://www.thepeopleschamber.uk/api/revalidate?path=/mps', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      console.log(`  /mps HTTP ${r.status}`);
    } catch (e) {
      console.warn(`  revalidate failed: ${e.message}`);
    }
  }
}

main().catch((e) => { console.error('fatal:', e?.message || e); process.exit(1); });
