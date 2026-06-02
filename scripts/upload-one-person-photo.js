require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const sharp = require('sharp');

// Slug-keyed companion to scripts/upload-one-photo.js. Same pipeline,
// different target table (person_cache, not mps) and different storage
// prefix (photos/people/<slug>.webp, not photos/mps/<id>.webp). Used
// for senior officials / civil servants / non-MP profile pages where
// /people/<slug> is the URL and person_cache.photo holds the image.
//
// Pipeline:
//   1. Read file (local --file or remote --url)
//   2. Resize + re-encode as WebP@q82, max 800px on longest edge
//   3. Upload to photos/people/<slug>.webp via anon key
//   4. Compute versioned URL (?v=<unix>) so the Vercel image optimiser
//      re-fetches new bytes (caches 1y by default)
//   5. UPDATE person_cache SET photo = '<url>' WHERE slug = '<slug>'
//      via psql (DATABASE_URL bypasses RLS; service-role key pulls
//      empty from Vercel envs so we can't use supabase-js for writes)
//   6. Revalidate /people/<slug>

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

const slugArg = arg('slug');
const fileArg = arg('file');
const urlArg = arg('url');
const dryRun = process.argv.includes('--dry-run');
const skipRevalidate = process.argv.includes('--no-revalidate');

if (!slugArg || (!fileArg && !urlArg)) {
  console.error('usage: node scripts/upload-one-person-photo.js --slug=<slug> (--file=<path> | --url=<url>) [--dry-run] [--no-revalidate]');
  process.exit(2);
}

// Only allow lowercase-letters/digits/hyphens in the slug — same shape
// person_cache uses. Prevents shell-quoting surprises and accidental
// path traversal in the storage upload.
if (!/^[a-z0-9-]+$/.test(slugArg)) {
  console.error(`--slug must be lowercase a-z 0-9 hyphens only (got: '${slugArg}')`);
  process.exit(2);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
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
    console.log(`[1/6] Read local file: ${abs}`);
    if (!fs.existsSync(abs)) throw new Error(`file not found: ${abs}`);
    return fs.readFileSync(abs);
  }
  console.log(`[1/6] Download: ${urlArg}`);
  const res = await fetch(urlArg, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function runPsql(sql) {
  const out = execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-F', '\t', '-c', sql], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

  const meta = await sharp(sourceBuffer).metadata();
  const buffer = await sharp(sourceBuffer)
    .rotate()
    .resize({ width: RESIZE_MAX_PX, height: RESIZE_MAX_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
  const pct = (100 * (1 - buffer.length / sourceBuffer.length)).toFixed(1);
  console.log(`[2/6] Encoded WebP: ${buffer.length.toLocaleString()} bytes (${pct}% smaller, source ${meta.width}x${meta.height} → ${RESIZE_MAX_PX}px max)`);

  const storagePath = `people/${slugArg}.webp`;
  console.log(`[3/6] Target: photos/${storagePath}`);

  if (dryRun) {
    console.log('[dry-run] skipping upload + db update + revalidate');
    return;
  }

  const { error: upErr } = await s.storage
    .from('photos')
    .upload(storagePath, buffer, { contentType: 'image/webp', upsert: true });
  if (upErr) {
    console.error('      Upload error:', upErr.message);
    process.exit(1);
  }
  console.log('      Upload ✓');

  const { data: { publicUrl } } = s.storage.from('photos').getPublicUrl(storagePath);
  const versionedUrl = `${publicUrl}?v=${Math.floor(Date.now() / 1000)}`;
  console.log(`[4/6] Versioned URL: ${versionedUrl}`);

  try {
    const sqlEsc = versionedUrl.replace(/'/g, "''");
    const slugEsc = slugArg.replace(/'/g, "''");
    const result = runPsql(
      `UPDATE person_cache SET photo = '${sqlEsc}' WHERE slug = '${slugEsc}' RETURNING slug, name;`
    );
    if (!result) {
      console.error(`[5/6] No person_cache row updated for slug='${slugArg}'.`);
      process.exit(1);
    }
    console.log(`[5/6] person_cache row updated: ${result}`);
  } catch (e) {
    console.error('[5/6] psql update failed:', e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
  }

  if (skipRevalidate) {
    console.log('[6/6] Revalidation: skipped (--no-revalidate)');
  } else if (!CRON_SECRET) {
    console.log('[6/6] Revalidation: skipped (CRON_SECRET not in env)');
  } else {
    const p = `/people/${slugArg}`;
    try {
      const res = await fetch(`${SITE_URL}/api/revalidate?path=${encodeURIComponent(p)}`, {
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        },
      });
      console.log(`[6/6] Revalidate ${p}: HTTP ${res.status} ${res.ok ? '✓' : '✗'}`);
    } catch (e) {
      console.error('[6/6] Revalidate failed:', e.message);
    }
  }

  console.log('Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
