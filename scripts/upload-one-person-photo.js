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
//   6. Cascade to dept_officials.photo_url (slug-matched) — staff
//      thumbnails on /departments/<slug> read from dept_officials,
//      not person_cache, so without this step the bio page renders
//      the new photo but the dept page keeps the old one
//   7. Cascade to dept_ministers.photo_url (slug-matched) — for
//      non-MP ministers like life-peer Lords ministers
//   8. Revalidate /people/<slug> + every affected /departments/<slug>

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

  const sqlEsc = versionedUrl.replace(/'/g, "''");
  const slugEsc = slugArg.replace(/'/g, "''");

  try {
    const result = runPsql(
      `UPDATE person_cache SET photo = '${sqlEsc}' WHERE slug = '${slugEsc}' RETURNING slug, name;`
    );
    if (!result) {
      console.error(`[5/8] No person_cache row updated for slug='${slugArg}'.`);
      process.exit(1);
    }
    console.log(`[5/8] person_cache row updated: ${result}`);
  } catch (e) {
    console.error('[5/8] psql update failed:', e.stderr ? e.stderr.toString() : e.message);
    process.exit(1);
  }

  // [6/8] Cascade to dept_officials. Staff thumbnails on /departments/<slug>
  // come from dept_officials.photo_url, not person_cache.photo, so missing
  // this step leaves the bio page fresh and the dept page stale (this is
  // exactly what hit the first non-MP batch on 2026-06-02 before this fix
  // landed).
  const affectedDeptSlugs = new Set();
  try {
    const result = runPsql(
      `UPDATE dept_officials SET photo_url = '${sqlEsc}' WHERE slug = '${slugEsc}' RETURNING dept_slug, slug, name;`
    );
    if (result) {
      const lines = result.split('\n').filter(Boolean);
      console.log(`[6/8] dept_officials cascade: ${lines.length} row(s) updated`);
      for (const line of lines) {
        console.log(`        ${line}`);
        const dept = line.split('\t')[0];
        if (dept) affectedDeptSlugs.add(dept);
      }
    } else {
      console.log(`[6/8] dept_officials cascade: no rows (slug not in dept_officials)`);
    }
  } catch (e) {
    console.error('[6/8] dept_officials cascade failed:', e.stderr ? e.stderr.toString() : e.message);
  }

  // [7/8] Cascade to dept_ministers — for non-MP ministers (life peers
  // serving as government ministers, e.g. Baroness Smith of Malvern).
  // Slug-matched same way.
  try {
    const result = runPsql(
      `UPDATE dept_ministers SET photo_url = '${sqlEsc}' WHERE slug = '${slugEsc}' RETURNING dept_slug, slug, name;`
    );
    if (result) {
      const lines = result.split('\n').filter(Boolean);
      console.log(`[7/8] dept_ministers cascade: ${lines.length} row(s) updated`);
      for (const line of lines) {
        console.log(`        ${line}`);
        const dept = line.split('\t')[0];
        if (dept) affectedDeptSlugs.add(dept);
      }
    } else {
      console.log(`[7/8] dept_ministers cascade: no rows (slug not in dept_ministers)`);
    }
  } catch (e) {
    console.error('[7/8] dept_ministers cascade failed:', e.stderr ? e.stderr.toString() : e.message);
  }

  // [8/8] Revalidate every affected page: the bio + every dept the
  // person appears on.
  const pathsToRevalidate = [`/people/${slugArg}`];
  for (const d of affectedDeptSlugs) pathsToRevalidate.push(`/departments/${d}`);

  if (skipRevalidate) {
    console.log('[8/8] Revalidation: skipped (--no-revalidate)');
  } else if (!CRON_SECRET) {
    console.log('[8/8] Revalidation: skipped (CRON_SECRET not in env)');
  } else {
    for (const p of pathsToRevalidate) {
      try {
        const res = await fetch(`${SITE_URL}/api/revalidate?path=${encodeURIComponent(p)}`, {
          headers: {
            'Authorization': `Bearer ${CRON_SECRET}`,
            'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          },
        });
        console.log(`[8/8] Revalidate ${p}: HTTP ${res.status} ${res.ok ? '✓' : '✗'}`);
      } catch (e) {
        console.error(`[8/8] Revalidate ${p} failed:`, e.message);
      }
    }
  }

  console.log('Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
