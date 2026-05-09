require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

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

if (!memberIdArg || (!fileArg && !urlArg)) {
  console.error('usage: node scripts/upload-one-photo.js --member-id=<id> (--file=<path> | --url=<url>) [--table=mps|dept_ministers] [--dry-run]');
  process.exit(2);
}

const memberId = parseInt(memberIdArg, 10);
if (!Number.isFinite(memberId)) {
  console.error('--member-id must be a number');
  process.exit(2);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL missing, or both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY missing in env');
  process.exit(1);
}
const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const s = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

async function readBytes() {
  if (fileArg) {
    const abs = path.resolve(fileArg);
    console.log(`Reading local file: ${abs}`);
    if (!fs.existsSync(abs)) throw new Error(`file not found: ${abs}`);
    return fs.readFileSync(abs);
  }
  console.log(`Downloading: ${urlArg}`);
  const res = await fetch(urlArg, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const buffer = await readBytes();
  const storagePath = `mps/${memberId}.jpg`;
  console.log(`Source bytes: ${buffer.length.toLocaleString()}`);
  console.log(`Target: photos/${storagePath} (upsert=true)`);
  console.log(`DB row: ${targetTable} where member_id=${memberId}`);

  if (dryRun) {
    console.log('[dry-run] skipping upload + db update');
    return;
  }

  const { error: upErr } = await s.storage
    .from('photos')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
  if (upErr) {
    console.error('Upload error:', upErr.message);
    process.exit(1);
  }

  const { data: { publicUrl } } = s.storage.from('photos').getPublicUrl(storagePath);
  // Append a unix-timestamp query string so Vercel's image optimiser sees
  // a new URL and re-fetches the bytes from Supabase Storage. Without
  // this, images.minimumCacheTTL (1 year) holds the old image at the
  // edge after we replace bytes at the same path.
  const versionedUrl = `${publicUrl}?v=${Math.floor(Date.now() / 1000)}`;
  console.log(`Public URL: ${publicUrl}`);
  console.log(`Versioned URL (will be written to DB): ${versionedUrl}`);

  const { data: updated, error: dbErr } = await s
    .from(targetTable)
    .update({ photo_url: versionedUrl })
    .eq('member_id', memberId)
    .select('member_id, name, photo_url');
  if (dbErr) {
    console.error('DB update error:', dbErr.message);
    process.exit(1);
  }
  if (!updated || updated.length === 0) {
    console.error(
      `No ${targetTable} row updated for member_id=${memberId}. ` +
      (usingServiceRole
        ? 'Row probably does not exist for that member_id.'
        : 'Likely RLS denial (anon key cannot write to this table). Set SUPABASE_SERVICE_ROLE_KEY in env and re-run.')
    );
    process.exit(1);
  }
  console.log('DB row after update:', updated[0]);
  console.log('Done.');
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
