#!/usr/bin/env node
// Companies House profiles for the organisation pages created on 3 Nov 2026 (organisation_company_pages; owner's
// option B brief). For every company number on those pages that has no row in companies_house yet: one request for
// its profile (/company/{number}) through the shared client (scripts/lib/companies-house.js: 429 backoff, key never
// logged), at no more than 100 requests a minute, inserted into companies_house. Insert only: an existing row is
// never overwritten (ON CONFLICT DO NOTHING on company_number). Re-running carries on, as numbers already stored are
// skipped. Not found (404) and failed numbers are written to "Claude outputs/companies-house-profiles-<date>.json".
//
//   node scripts/fetch-companies-house-profiles.js [--limit N] [--dry-run]
require('dotenv').config({ path: '.env.local', quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { makeClient, sleep } = require('./lib/companies-house');

const DRY = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const GAP_MS = 600; // 100 requests a minute at most

const fetchCH = makeClient(process.env.COMPANIES_HOUSE_API_KEY);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function readAll(table, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).order(cols.split(',')[0].trim()).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

(async () => {
  const pages = await readAll('organisation_company_pages', 'company_number');
  const held = new Set((await readAll('companies_house', 'company_number')).map((r) => String(r.company_number).toUpperCase()));
  const todo = pages.map((p) => p.company_number).filter((n) => !held.has(n)).slice(0, LIMIT);
  console.log(`pages ${pages.length}; already held ${pages.length - pages.filter((p) => !held.has(p.company_number)).length}; to fetch ${todo.length}${DRY ? ' (dry run: nothing written)' : ''}`);
  const report = { started: new Date().toISOString(), fetched: [], not_found: [], failed: [] };
  const outFile = `Claude outputs/companies-house-profiles-${report.started.slice(0, 10)}.json`;
  let batch = [];
  const flush = async () => {
    if (!batch.length || DRY) { batch = []; return; }
    const { error } = await db.from('companies_house').upsert(batch, { onConflict: 'company_number', ignoreDuplicates: true });
    if (error) throw new Error(`companies_house insert: ${error.message}`);
    batch = [];
  };
  let last = 0;
  for (let i = 0; i < todo.length; i++) {
    const n = todo[i];
    const gap = GAP_MS - (Date.now() - last);
    if (gap > 0) await sleep(gap);
    last = Date.now();
    try {
      const p = await fetchCH(`/company/${encodeURIComponent(n)}`);
      if (!p) { report.not_found.push(n); }
      else {
        report.fetched.push(n);
        batch.push({
          company_number: p.company_number || n,
          company_name: p.company_name || null,
          status: p.company_status || null,
          company_type: p.type || null,
          incorporated_date: p.date_of_creation || null,
          registered_address: p.registered_office_address || null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      if (/401/.test(e.message)) throw e; // a rejected key stops the run
      report.failed.push({ company_number: n, error: e.message });
    }
    if (batch.length >= 50) await flush();
    if ((i + 1) % 100 === 0) {
      console.log(`${new Date().toISOString()} ${i + 1}/${todo.length}: fetched ${report.fetched.length}, not found ${report.not_found.length}, failed ${report.failed.length}`);
      fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
    }
  }
  await flush();
  report.finished = new Date().toISOString();
  fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
  console.log(`done: fetched ${report.fetched.length}, not found ${report.not_found.length}, failed ${report.failed.length} (${outFile})`);
})().catch((e) => { console.error(`fetch-companies-house-profiles failed: ${e.message}`); process.exit(1); });
