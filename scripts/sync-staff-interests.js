#!/usr/bin/env node
// MPs' staff interests sync from the terminal: the same run as the weekly route /api/sync-staff-interests, from the
// same code (lib/staff-interests.js, owner's brief, 3 Nov 2026). Source: the House of Commons register of interests
// of MPs' staff, from Parliament's interests API (Open Parliament Licence v3.0). No staff names are read or stored.
//
//   node scripts/sync-staff-interests.js            preview: what would change, nothing written
//   node scripts/sync-staff-interests.js --apply    write the changes, save the register id, queue the changed MPs'
//                                                    pages for /api/refresh-nightly-pages (scripts/mp-refresh-queue.js)
//   --force                                          run even when this register was synced already
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { runStaffInterestsSync } = require('../lib/staff-interests');
const { queueMpRefresh } = require('./mp-refresh-queue');

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const UA = 'opengovt-StaffRegisterSync/1.0 (+https://opengovt.uk)';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY not set');
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}
const fetchText = async (url) => (await get(url)).text();
const fetchBytes = async (url) => new Uint8Array(await (await get(url)).arrayBuffer());

(async () => {
  const run = await runStaffInterestsSync({ supabase: db, fetchText, fetchBytes, dry: !APPLY, force: FORCE, log: (m) => console.log(m) });
  console.log(JSON.stringify(run.result, null, 2));
  if (!APPLY) { console.log('\n(preview: pass --apply to write)'); return; }
  console.log(await queueMpRefresh(db, [...run.changedMps]));
})().catch((e) => {
  console.error(`sync-staff-interests failed${e.stage ? ` at ${e.stage}` : ''}: ${e.message}`);
  process.exit(1);
});
