require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const sharp = require('sharp');

// Pipeline (one command, end-to-end):
//   1. Read file (local --file or remote --url)
//   2. Resize + re-encode as WebP@q82, max 800px on longest edge
//   3. Upload to photos/mps/<id>.webp via anon key (bucket allows anon upsert)
//   4. Compute versioned URL with ?v=<unix-timestamp> cache buster so the
//      Vercel image optimiser re-fetches the new bytes
//   5. Update mps.photo_url via direct psql (DATABASE_URL bypasses RLS;
//      SUPABASE_SERVICE_ROLE_KEY in Vercel is Sensitive and pulls empty
//      so we can't rely on supabase-js for the write path)
//   6. Cascade to dept_ministers.photo_url via member_id join
//   7. Cascade to person_cache.photo via dept_ministers.slug join (the
//      only path that links person_cache to an MP since person_cache
//      has no member_id column)
//   8. Revalidate /mps/<id> at the live site so the new photo renders
//   9. Report what landed where

const RESIZE_MAX_PX = 800;
const WEBP_QUALITY  = 82;

function arg(name) {
  const eq = `--${name}=`;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith(eq)) return argv[i].slice(eq.length);
    if (argv[i] === `--${name}`) return argv[i + 1];
  }
  return null;
}

const memberIdArg = arg('member-id');
const fileArg = arg('file');
const urlArg = arg('url');
const targetTable = arg('table') || 'mps';
const dryRun = process.argv.includes('--dry-run');
const skipRevalidate = process.argv.includes('--no-revalidate');

if (!memberIdArg || (!fileArg && !urlArg)) {
  console.error('usage: node scripts/upload-one-photo.js --member-id=<id> (--file=<path> | --url=<url>) [--table=mps|dept_ministers] [--dry-run] [--no-revalidate]');
  process.exit(2);
}

const memberId = parseInt(memberIdArg, 10);
if (!Number.isFinite(memberId)) {
  console.error('--member-id must be a number');
  process.exit(2);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
// CRON_SECRET is set in Vercel but typically not in .env.local — accept it
// via --secret=<...> CLI arg as a fallback so revalidation works locally
// without needing the env var on disk. (Putting it in .env.local is also
// fine; the CLI arg takes precedence.)
const CRON_SECRET = arg('secret') ||
  process.env.CRON_SECRET ||
  process.env.REVALIDATE_SECRET ||
  null;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thepeopleschamber.uk';

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in env');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL missing — needed for psql writes (bypasses RLS)');
  process.exit(1);
}

const s = createClient(SUPABASE_URL, ANON_KEY, { realtime: { transport: ws } });

async function readBytes() {
  if (fileArg) {
    const abs = path.resolve(fileArg);
    console.log(`[1/9] Read local file: ${abs}`);
    if (!fs.existsSync(abs)) throw new Error(`file not found: ${abs}`);
    return fs.readFileSync(abs);
  }
  console.log(`[1/9] Download: ${urlArg}`);
  const res = await fetch(urlArg, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function runPsql(sql) {
  const out = execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-F', '\t', '-c', sql], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // psql -At still prints command tags ("UPDATE 0", "INSERT 0 N", etc.) on
  // stdout alongside RETURNING rows. Strip them so the caller can use line
  // count to detect whether real rows came back.
  return out
    .toString()
    .split('\n')
    .filter((line) => line && !/^(UPDATE|INSERT|DELETE|SELECT|MERGE|MOVE|FETCH|COPY)\s+\d+/.test(line))
    .join('\n')
    .trim();
}

async function main() {
  const sourceBuffer = await readBytes();
  console.log(`      Source bytes: ${sourceBuffer.length.toLocaleString()}`);

  // [2/9] Resize + re-encode
  const meta = await sharp(sourceBuffer).metadata();
  const buffer = await sharp(sourceBuffer)
    .rotate() // auto-apply EXIF orientation
    .resize({ width: RESIZE_MAX_PX, height: RESIZE_MAX_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
  const pct = (100 * (1 - buffer.length / sourceBuffer.length)).toFixed(1);
  console.log(`[2/9] Encoded WebP: ${buffer.length.toLocaleString()} bytes (${pct}% smaller, source ${meta.width}x${meta.height} → ${RESIZE_MAX_PX}px max)`);

  const storagePath = `${targetTable === 'dept_ministers' ? 'people' : 'mps'}/${memberId}.webp`;
  console.log(`[3/9] Target: photos/${storagePath}`);

  if (dryRun) {
    console.log('[dry-run] skipping upload + db update + revalidate');
    return;
  }

  // [3/9] Upload via anon key (bucket allows anon upsert)
  const { error: upErr } = await s.storage
    .from('photos')
    .upload(storagePath, buffer, { contentType: 'image/webp', upsert: true });
  if (upErr) {
    console.error('      Upload error:', upErr.message);
    process.exit(1);
  }
  console.log('      Upload ✓');

  const { data: { publicUrl } } = s.storage.from('photos').getPublicUrl(storagePath);
  // [4/9] Cache-buster: Vercel images.minimumCacheTTL is 1 year, so without
  // ?v= the edge serves the old bytes after we replace them at the same path.
  const versionedUrl = `${publicUrl}?v=${Math.floor(Date.now() / 1000)}`;
  console.log(`[4/9] Versioned URL: ${versionedUrl}`);

  // [5/9] mps.photo_url via psql (anon can't write, DATABASE_URL bypasses RLS)
  try {
    const sqlEsc = versionedUrl.replace(/'/g, "''");
    const result = runPsql(
      `UPDATE ${targetTable} SET photo_url = '${sqlEsc}' WHERE member_id = ${memberId} RETURNING member_id, name;`
    );
    if (!result) {
      console.error(`[5/9] No ${targetTable} row updated for member_id=${memberId}.`);
      process.exit(1);
    }
    console.log(`[5/9] ${targetTable} row updated: ${result}`);
  } catch (e) {
    console.error('[5/9] psql update failed:', e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
  }

  // [6/9] Cascade to dept_ministers via member_id (clean join, no slug-regex)
  if (targetTable === 'mps') {
    try {
      const result = runPsql(
        `UPDATE dept_ministers SET photo_url = (SELECT photo_url FROM mps WHERE member_id = ${memberId}) WHERE member_id = ${memberId} RETURNING dept_slug, slug, name;`
      );
      if (result) {
        const lines = result.split('\n').filter(Boolean);
        console.log(`[6/9] dept_ministers cascade: ${lines.length} row(s) updated`);
        for (const line of lines) console.log(`        ${line}`);
      } else {
        console.log(`[6/9] dept_ministers cascade: no rows (MP not currently a minister)`);
      }
    } catch (e) {
      console.error('[6/9] dept_ministers cascade failed:', e.stderr ? e.stderr.toString() : e.message);
    }

    // [7/9] Cascade to person_cache via dept_ministers.slug (the only link
    // since person_cache has no member_id column)
    try {
      const result = runPsql(
        `UPDATE person_cache pc SET photo = dm.photo_url
         FROM dept_ministers dm
         WHERE dm.member_id = ${memberId} AND pc.slug = dm.slug
         RETURNING pc.slug, pc.name;`
      );
      if (result) {
        const lines = result.split('\n').filter(Boolean);
        console.log(`[7/9] person_cache cascade: ${lines.length} row(s) updated`);
        for (const line of lines) console.log(`        ${line}`);
      } else {
        console.log(`[7/9] person_cache cascade: no rows (no matching slug in person_cache)`);
      }
    } catch (e) {
      console.error('[7/9] person_cache cascade failed:', e.stderr ? e.stderr.toString() : e.message);
    }
  } else {
    console.log('[6/9] dept_ministers cascade: skipped (target was dept_ministers, not mps)');
    console.log('[7/9] person_cache cascade: skipped');
  }

  // [8/9] Revalidate /mps/<id> at the live site
  if (skipRevalidate) {
    console.log('[8/9] Revalidation: skipped (--no-revalidate)');
  } else if (!CRON_SECRET) {
    console.log('[8/9] Revalidation: skipped (CRON_SECRET not in env)');
  } else {
    const path = targetTable === 'mps' ? `/mps/${memberId}` : null;
    if (!path) {
      console.log('[8/9] Revalidation: no path defined for target table');
    } else {
      try {
        const res = await fetch(`${SITE_URL}/api/revalidate?path=${encodeURIComponent(path)}`, {
          headers: {
            'Authorization': `Bearer ${CRON_SECRET}`,
            'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          },
        });
        console.log(`[8/9] Revalidate ${path}: HTTP ${res.status} ${res.ok ? '✓' : '✗'}`);
      } catch (e) {
        console.error('[8/9] Revalidate failed:', e.message);
      }
    }
  }

  console.log('[9/9] Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
