#!/usr/bin/env node
// Import Housing Benefit caseload by LOCAL AUTHORITY, from DWP Stat-Xplore,
// mirroring import-welfare-hb.js's constituency-level approach but using
// the LA tier's confirmed query shape instead of the constituency one.
//
// WHY THIS QUERY SHAPE DIFFERS FROM THE CONSTITUENCY SCRIPTS
// ────────────────────────────────────────────────────────────
// The constituency scripts build one URI per already-known GSS code and
// recode the geography dimension to that exact list. At LA level there is
// no pre-existing canonical GSS code list to recode against (see the
// header comments in import-welfare-la-population.js for why — the LA
// valueset is a nested 2021-boundary-vintage valueset, not a flat field).
// Research (research-la-full-enumeration.js, confirmed live against hb_new)
// found that setting the LA VALUESET id itself as the dimension — with NO
// recode at all — makes Stat-Xplore return one row per item in that
// valueset directly, bypassing the /schema endpoint's 100-item preview cap
// entirely. This script uses that same confirmed approach for every
// benefit database: discover the "Local Authority" labelled valueset
// nested under COA_CODE at runtime (research-la-valuesets-remaining-
// databases.js confirmed this same nesting + naming pattern exists in all
// six benefit databases), then query it directly with no recode.
//
// The response's ~352 items are GB local authorities (296 England + 22
// Wales + 32 Scotland = 350) plus 2 non-geographic placeholder codes
// ("Abroad" and "Unknown") that Stat-Xplore itself returns as part of the
// valueset — these are dropped before anything is written.
//
// NO SCOTLAND EXCLUSION HERE
// ────────────────────────────
// Same as the constituency-level script: Housing Benefit remains fully
// reserved to DWP in Scotland (being wound down UK-wide via Universal
// Credit migration, but that's a GB-wide process, not devolution). All
// returned local authorities (after dropping the 2 placeholders) are
// written.
//
// INTEGRITY CHECK
// ────────────────
// Every returned item's GSS code is re-derived from its own URI. Any item
// whose code doesn't match the GB LA code shape (one of E/W/S followed by
// 8 digits) is treated as unexpected and reported, not silently written.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'hb_claimants').

'use strict';
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Supabase env vars not set (.env.local)'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAT_XPLORE_API_KEY = process.env.STAT_XPLORE_API_KEY;
if (!STAT_XPLORE_API_KEY) { console.error('STAT_XPLORE_API_KEY not set (.env.local)'); process.exit(1); }

const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';
const DATABASE = 'str:database:hb_new';
const COA_FIELD = 'str:field:hb_new:V_F_HB_NEW:COA_CODE';
const DATE_FIELD = 'str:field:hb_new:F_HB_NEW_DATE:NEW_DATE_NAME';
const MEASURE = 'str:count:hb_new:V_F_HB_NEW';

const METRIC_KEY = 'hb_claimants';
const SOURCE_NAME = 'dwp_statxplore_hb_monthly_la';

const NON_GEOGRAPHIC_CODES = new Set(['XXZZZZZZZ', 'ZZXXXXXXX']);
const GB_LA_CODE_SHAPE = /^[EWS]\d{8}$/;

const LIVE = process.argv.includes('--live');

async function schemaGet(id) {
  const res = await fetch(`${BASE}/schema/${encodeURIComponent(id)}`, { headers: { APIKey: STAT_XPLORE_API_KEY } });
  const text = await res.text();
  if (!res.ok) { const err = new Error(`/schema/${id} failed (${res.status})`); err.status = res.status; err.body = text; throw err; }
  return JSON.parse(text);
}

async function statXploreTable(body) {
  const res = await fetch(`${BASE}/table`, {
    method: 'POST',
    headers: { APIKey: STAT_XPLORE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { const err = new Error(`/table failed (${res.status})`); err.status = res.status; err.body = text; throw err; }
  return JSON.parse(text);
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

async function discoverLaValueset(coaFieldId) {
  console.log(`Discovering the "Local Authority" valueset under ${coaFieldId}...`);
  const schema = await schemaGet(coaFieldId);
  const children = schema.children || [];
  let candidates = children.filter((c) => c.type === 'VALUESET' && /local authority/i.test(c.label || ''));
  if (candidates.length === 0) {
    for (const child of children) {
      if (child.type === 'FOLDER' || child.type === 'GROUP') {
        try {
          const sub = await schemaGet(child.id);
          const subVs = (sub.children || []).filter((c) => c.type === 'VALUESET' && /local authority/i.test(c.label || ''));
          candidates = candidates.concat(subVs);
        } catch { /* ignore */ }
      } else if (child.type === 'VALUESET' && /local authority/i.test(child.label || '')) {
        candidates.push(child);
      }
    }
  }
  if (candidates.length === 0) {
    console.error('No "Local Authority" labelled valueset found. Children of COA_CODE:');
    children.forEach((c) => console.error(`  ${c.id} [${c.type}] — ${c.label}`));
    process.exit(1);
  }
  console.log(`  Found: ${candidates[0].id} — ${candidates[0].label}`);
  return candidates[0].id;
}

async function findLatestAvailableMonth(dateFieldId, sampleItemUri) {
  const lastColon = sampleItemUri.lastIndexOf(':');
  const prefix = sampleItemUri.slice(0, lastColon + 1);
  for (let back = 0; back <= 15; back++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - back);
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dateUri = `${prefix}${yyyymm}`;
    try {
      const data = await statXploreTable({
        database: DATABASE,
        measures: [MEASURE],
        dimensions: [[dateFieldId]],
        recodes: { [dateFieldId]: { map: [[dateUri]], total: false } },
      });
      if (data.cubes && data.cubes[MEASURE]) {
        console.log(`Latest available month: ${yyyymm} (${back} month(s) back)`);
        return { yyyymm, year: d.getFullYear(), month: d.getMonth() + 1, dateUri };
      }
    } catch (err) {
      console.log(`  ${yyyymm}: not available (${err.status || err.message})`);
    }
  }
  throw new Error('Could not find an available month in the last 15 months.');
}

async function main() {
  console.log(LIVE ? '--- LIVE RUN (will write to database) ---' : '--- DRY RUN (pass --live to write) ---');

  const laValueset = await discoverLaValueset(COA_FIELD);

  let sampleDateItem = (await schemaGet(DATE_FIELD)).children?.[0];
  if (!sampleDateItem) { console.error('Could not get a sample date item to derive the URI template.'); process.exit(1); }
  if (sampleDateItem.id && sampleDateItem.id.startsWith('str:valueset:')) {
    const vsSchema = await schemaGet(sampleDateItem.id);
    const vsItems = vsSchema.children || [];
    if (vsItems.length === 0) { console.error('Date valueset has no items — cannot derive URI template.'); process.exit(1); }
    sampleDateItem = vsItems[vsItems.length - 1];
    console.log(`Date URI template from valueset (latest item): ${sampleDateItem.id} (${sampleDateItem.label})`);
  }
  console.log('\nFinding latest available data month...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth(DATE_FIELD, sampleDateItem.id);
  const periodEnd = lastDayOfMonth(year, month);

  console.log(`\nQuerying all local authorities for ${yyyymm} (valueset-as-dimension, no recode)...`);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[laValueset], [DATE_FIELD]],
    recodes: { [DATE_FIELD]: { map: [[dateUri]], total: false } },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === laValueset) || fields[0];
  const cube = data.cubes && data.cubes[MEASURE];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error('Response missing expected field or cube — aborting.');
    process.exit(1);
  }

  const items = geoFieldResp.items || [];
  console.log(`Items returned: ${items.length}`);

  const results = [];
  const unexpected = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const uri = item.uris ? item.uris[0] : item.uri;
    const code = uri ? uri.split(':').pop() : null;
    const label = item.labels ? item.labels[0] : item.label;
    const value = cube.values[i] && cube.values[i][0];
    if (!code || NON_GEOGRAPHIC_CODES.has(code)) continue;
    if (!GB_LA_CODE_SHAPE.test(code)) { unexpected.push({ code, label }); continue; }
    results.push({ code, label, value });
  }

  if (unexpected.length > 0) {
    console.error(`\n${unexpected.length} item(s) with an unexpected code shape — ABORTING, nothing written.`);
    console.error(JSON.stringify(unexpected.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nValid local authorities after dropping placeholders: ${results.length} (expected 350).`);
  if (results.length !== 350) {
    console.error(`WARNING: expected exactly 350, got ${results.length}. Review before trusting this further.`);
  }

  console.log('First 5 results:');
  results.slice(0, 5).forEach((r) => console.log(`  ${r.code} (${r.label}): ${r.value}`));
  const total = results.reduce((s, r) => s + (typeof r.value === 'number' ? r.value : 0), 0);
  console.log(`\nSum across all local authorities: ${total.toLocaleString()}`);

  const westminster = results.find((r) => r.code === 'E09000033');
  if (westminster) {
    console.log(`\nWestminster (E09000033): ${westminster.value} (TPA's own site shows 9,282 for this LA — compare).`);
  }

  if (!LIVE) {
    console.log('\nDry run complete. Pass --live to write these results to the database.');
    return;
  }

  console.log('\nWriting welfare_source_releases row...');
  const { data: releaseRow, error: releaseErr } = await supabase
    .from('welfare_source_releases')
    .insert({
      source_name: SOURCE_NAME,
      dataset_id: DATABASE,
      source_url: 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1/table',
      release_date: periodEnd,
      reference_period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
      reference_period_end: periodEnd,
      retrieved_at: new Date().toISOString(),
      notes: `Housing Benefit claimant caseload by local authority, ${yyyymm}.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const metricRows = results.map((r) => ({
    council_gss_code: r.code,
    council_name: r.label,
    metric_key: METRIC_KEY,
    value: r.value,
    unit: 'people',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
  }));

  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < metricRows.length; i += BATCH_SIZE) {
    const batch = metricRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${metricRows.length}`);
  }

  console.log(`\nDone. ${written} rows written for metric_key='${METRIC_KEY}', period_end=${periodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
