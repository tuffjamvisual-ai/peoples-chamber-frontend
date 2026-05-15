#!/usr/bin/env node
/**
 * Mirror dept_ministers + dept_officials photo_url values that point at
 * assets.publishing.service.gov.uk into Supabase storage, then rewrite
 * each row's photo_url to the Supabase public URL. Removes gov.uk from
 * the browser-facing render path.
 *
 * Usage:
 *   node scripts/sync-staff-photos-to-storage.js [--limit=N]
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *               DATABASE_URL (anon key for storage uploads; DB writes via
 *               direct psql since dept_* tables have read-only RLS).
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !ANON_KEY || !DATABASE_URL) {
  console.error('Missing env: need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL');
  process.exit(1);
}

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

const s = createClient(SUPABASE_URL, ANON_KEY);

function psql(sql) {
  return execSync(`psql "${DATABASE_URL}" -t -A -F'|' -c ${JSON.stringify(sql)}`, { encoding: 'utf8' });
}

function sqlLiteral(str) {
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function downloadAndUpload(govukUrl, basePath) {
  const res = await fetch(govukUrl, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
  else if (contentType.includes('webp')) ext = 'webp';
  const path = `${basePath}.${ext}`;
  const { error } = await s.storage.from('photos').upload(path, buffer, {
    contentType: contentType || 'image/jpeg',
    upsert: true,
  });
  if (error) return { ok: false, reason: `Upload: ${error.message}` };
  const { data: { publicUrl } } = s.storage.from('photos').getPublicUrl(path);
  return { ok: true, url: publicUrl };
}

async function mirror(table, prefix) {
  const limitClause = LIMIT ? ` LIMIT ${LIMIT}` : '';
  const rowsRaw = psql(
    `SELECT id, photo_url FROM ${table} WHERE photo_url LIKE 'https://assets.publishing.service.gov.uk/%' ORDER BY id${limitClause};`,
  );
  const rows = rowsRaw.trim().split('\n').filter(Boolean).map((line) => {
    const [id, url] = line.split('|');
    return { id: parseInt(id, 10), url };
  });

  console.log(`[${table}] ${rows.length} rows to mirror`);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = await downloadAndUpload(row.url, `${prefix}/${row.id}`);
    if (result.ok) {
      psql(`UPDATE ${table} SET photo_url = ${sqlLiteral(result.url)} WHERE id = ${row.id};`);
      ok++;
    } else {
      fail++;
      console.log(`  FAIL id=${row.id}: ${result.reason}`);
    }
    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${rows.length} (ok=${ok}, fail=${fail})`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`[${table}] DONE — ok=${ok}, fail=${fail}`);
}

(async () => {
  if (LIMIT) console.log(`=== LIMIT=${LIMIT} ===`);
  await mirror('dept_ministers', 'ministers');
  await mirror('dept_officials', 'officials');
})();
