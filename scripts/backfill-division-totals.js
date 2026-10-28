#!/usr/bin/env node
// Loads the official totals (AyeCount / NoCount, tellers) of every Commons division from the
// Commons Votes API search endpoint into commons_division_totals. About 100 requests of 25
// divisions each, paced gently. Safe to re-run: upserts on division_id.
//
// DRY RUN BY DEFAULT: prints what it found. Pass --write to save.
//
// Usage:
//   node scripts/backfill-division-totals.js
//   node scripts/backfill-division-totals.js --write

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const WRITE = process.argv.includes('--write');
const API = 'https://commonsvotes-api.parliament.uk/data';
const TAKE = 25;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const total = Number(await (await fetch(`${API}/divisions.json/searchTotalResults`)).text());
  if (!Number.isFinite(total) || total < 1) throw new Error('could not read the number of divisions');
  console.log(`Commons Votes API: ${total} divisions`);
  const rows = [];
  for (let skip = 0; skip < total; skip += TAKE) {
    const res = await fetch(`${API}/divisions.json/search?queryParameters.skip=${skip}&queryParameters.take=${TAKE}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} at skip ${skip}`);
    for (const d of await res.json()) {
      rows.push({
        division_id: d.DivisionId, division_number: d.Number, division_date: String(d.Date).slice(0, 10), title: d.Title || null,
        aye_count: d.AyeCount, no_count: d.NoCount,
        aye_tellers: (d.AyeTellers || []).map((m) => m.Name).filter(Boolean),
        no_tellers: (d.NoTellers || []).map((m) => m.Name).filter(Boolean),
        is_deferred: !!d.IsDeferred,
      });
    }
    await sleep(300);
  }
  const ids = new Set(rows.map((r) => r.division_id));
  console.log(`read ${rows.length} divisions (${ids.size} distinct), from ${rows[rows.length - 1]?.division_date} to ${rows[0]?.division_date}`);
  if (!WRITE) { console.log('DRY RUN complete. Nothing was written.'); return; }
  const unique = [...new Map(rows.map((r) => [r.division_id, r])).values()];
  for (let i = 0; i < unique.length; i += 500) {
    const { error } = await db.from('commons_division_totals').upsert(unique.slice(i, i + 500).map((r) => ({ ...r, synced_at: new Date().toISOString() })), { onConflict: 'division_id' });
    if (error) throw new Error(`upsert: ${error.message}`);
  }
  console.log(`saved ${unique.length} divisions. WRITE complete.`);
})().catch((e) => { console.error('FAILED: ' + e.message); process.exit(1); });
