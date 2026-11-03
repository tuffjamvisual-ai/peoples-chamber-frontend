#!/usr/bin/env node
// APPG sync from the terminal: the same run as the weekly route /api/sync-appgs, from the same code
// (lib/appg-dataset.js, owner's brief, 3 Nov 2026). Source: mySociety's "APPG Groups and Memberships" dataset,
// https://pages.mysociety.org/appg-membership/datasets/appg_groups_and_memberships/latest (CC BY 4.0).
//
//   node scripts/sync-appgs.js            preview: what would change, nothing written
//   node scripts/sync-appgs.js --apply    write the changes, save the dataset version, queue the changed MPs' pages
//                                          for /api/refresh-nightly-pages (scripts/mp-refresh-queue.js)
//   --force                                run even when this dataset version was synced already
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { runAppgSync } = require('../lib/appg-dataset');
const { queueMpRefresh } = require('./mp-refresh-queue');

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY not set');
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

(async () => {
  const run = await runAppgSync({ supabase: db, fetchText, dry: !APPLY, force: FORCE, log: (m) => console.log(m) });
  console.log(JSON.stringify(run.result, null, 2));
  if (!APPLY) { console.log('\n(preview: pass --apply to write)'); return; }
  console.log(await queueMpRefresh(db, [...run.changedMps]));
})().catch((e) => {
  console.error(`sync-appgs failed${e.stage ? ` at ${e.stage}` : ''}: ${e.message}`);
  process.exit(1);
});
