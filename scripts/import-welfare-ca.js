#!/usr/bin/env node
// Combined discovery + import for Carer's Allowance (CA) caseload by
// Westminster Parliamentary Constituency, from DWP Stat-Xplore.
//
// Same combined-discovery approach as import-welfare-pip.js /
// import-welfare-dla.js — see those files' headers for the full rationale.
// This script discovers the geography field, date field, and
// constituency-level valueset at runtime against the CA database rather
// than relying on hardcoded field IDs, then steps backwards from the
// current month to find the latest period DWP has actually published
// (CA publishes quarterly, so most months will fail — that's expected).
//
// INTEGRITY CHECK — same as every other import-welfare-*.js script
// ────────────────────────────────────────────────────────────────────
// Every returned geography item's GSS code is re-derived from its own URI
// and checked against what was expected at that position before anything
// is written. Any mismatch aborts with nothing written.
//
// SCOTLAND EXCLUSION — READ BEFORE CHANGING
// ───────────────────────────────────────────
// Carer's Allowance has been devolved to Scotland as Carer Support Payment
// (CSP), with national rollout from Autumn 2024 and case-transfer of
// existing CA claims targeted complete by Spring 2025. By the time this
// script runs, DWP/Stat-Xplore CA data for Scottish constituencies (GSS
// codes starting "S14") is stale/not meaningful for current claims and is
// NOT requested from Stat-Xplore at all here. Scottish constituencies
// instead get a status='unavailable' row with no value, explaining the
// devolution in metadata_json — same pattern as PIP and DLA.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'ca_claimants').

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
const DATABASE = 'str:database:CA_In_Payment_New';
const MEASURE = 'str:count:CA_In_Payment_New:V_F_CA_In_Payment_New'; // confirmed via earlier schema discovery table

const METRIC_KEY = 'ca_claimants';
const SOURCE_NAME = 'dwp_statxplore_ca_quarterly';

const LIVE = process.argv.includes('--live');

async function schemaGet(id) {
  const res = await fetch(`${BASE}/schema/${encodeURIComponent(id)}`, {
    headers: { APIKey: STAT_XPLORE_API_KEY },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`/schema/${id} failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return JSON.parse(text);
}

async function statXploreTable(body) {
  const res = await fetch(`${BASE}/table`, {
    method: 'POST',
    headers: { APIKey: STAT_XPLORE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`/table failed (${res.status})`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return JSON.parse(text);
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

async function discoverFields() {
  console.log(`Discovering fields under ${DATABASE}...`);
  const dbSchema = await schemaGet(DATABASE);
  const children = dbSchema.children || [];

  const flatFields = [];
  for (const child of children) {
    if (child.type === 'FIELD') {
      flatFields.push(child);
    } else if ((child.type === 'FOLDER' || child.type === 'GROUP') && child.id) {
      try {
        const sub = await schemaGet(child.id);
        (sub.children || []).forEach((c) => { if (c.type === 'FIELD') flatFields.push(c); });
      } catch { /* ignore folders/groups we can't expand */ }
    }
  }

  const geoField = flatFields.find((f) => /westminster/i.test(f.label || '') || /pcon24/i.test(f.id || ''))
    || flatFields.find((f) => /constitu|parliament/i.test(f.label || ''));
  const dateField = flatFields.find((f) => /month|date|quarter/i.test(f.label || ''));

  if (!geoField) {
    console.error('Could not find a geography field matching "constituency"/"parliamentary". Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }
  if (!dateField) {
    console.error('Could not find a date field matching "month"/"date"/"quarter". Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }

  console.log(`Geography field: ${geoField.id} — ${geoField.label}`);
  console.log(`Date field: ${dateField.id} — ${dateField.label}`);
  return { geoField, dateField };
}

async function discoverConstituencyValueset(geoFieldId) {
  console.log(`\nDiscovering constituency-level valueset under ${geoFieldId}...`);
  const fieldSchema = await schemaGet(geoFieldId);
  const valuesets = (fieldSchema.children || []).filter((c) => c.type === 'VALUESET' || c.type === 'FOLDER' || c.type === 'GROUP' || c.id);

  let best = null;
  for (const vs of valuesets) {
    try {
      const vsSchema = await schemaGet(vs.id);
      const itemCount = (vsSchema.children || []).length;
      console.log(`  ${vs.id} (${vs.label}): ${itemCount} items`);
      if (!best || itemCount > best.itemCount) {
        best = { id: vs.id, label: vs.label, itemCount, items: vsSchema.children || [] };
      }
    } catch (err) {
      console.log(`  ${vs.id}: could not expand (${err.status || err.message})`);
    }
  }

  if (!best || best.itemCount === 0) {
    console.error('No expandable valueset found under the geography field. Aborting.');
    process.exit(1);
  }

  const sampleItem = best.items[0];
  if (!sampleItem) {
    console.error('Valueset had non-zero itemCount but no items array. Aborting.');
    process.exit(1);
  }
  const lastColon = sampleItem.id.lastIndexOf(':');
  const uriPrefix = sampleItem.id.slice(0, lastColon + 1);
  console.log(`Selected valueset: ${best.id} — ${best.label} (≥${best.itemCount} items, schema-capped)`);
  console.log(`Derived URI prefix: ${uriPrefix}`);
  return { ...best, uriPrefix };
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

  const { geoField, dateField } = await discoverFields();
  const valueset = await discoverConstituencyValueset(geoField.id);

  console.log('\nFetching our own constituency GSS code list from welfare_constituency_geography...');
  const { data: geoRows, error: geoErr } = await supabase
    .from('welfare_constituency_geography')
    .select('constituency_gss_code');
  if (geoErr) { console.error('Failed to read welfare_constituency_geography:', geoErr.message); process.exit(1); }
  const allGssCodes = [...new Set(geoRows.map((r) => r.constituency_gss_code))].sort();
  const scottishCodes = allGssCodes.filter((c) => c.startsWith('S14'));
  const gssCodes = allGssCodes.filter((c) => !c.startsWith('S14'));
  console.log(`Found ${allGssCodes.length} distinct constituency GSS codes in our database.`);
  console.log(`Excluding ${scottishCodes.length} Scottish constituencies (CA devolved to Carer Support Payment) — requesting CA data for the remaining ${gssCodes.length}.`);

  console.log(`Building ${gssCodes.length} constituency URIs using prefix: ${valueset.uriPrefix}...`);

  let sampleDateItem = (await schemaGet(dateField.id)).children?.[0];
  if (!sampleDateItem) { console.error('Could not get a sample date item to derive the URI template.'); process.exit(1); }
  if (sampleDateItem.id && sampleDateItem.id.startsWith('str:valueset:')) {
    const vsSchema = await schemaGet(sampleDateItem.id);
    const vsItems = vsSchema.children || [];
    if (vsItems.length === 0) { console.error('Date valueset has no items — cannot derive URI template.'); process.exit(1); }
    sampleDateItem = vsItems[vsItems.length - 1];
    console.log(`Date URI template from valueset (latest item): ${sampleDateItem.id} (${sampleDateItem.label})`);
  }
  console.log('\nFinding latest available data period...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth(dateField.id, sampleDateItem.id);
  const periodEnd = lastDayOfMonth(year, month);

  console.log(`\nRequesting CA caseload for all ${gssCodes.length} constituencies for ${yyyymm}...`);
  const geoMap = gssCodes.map((code) => [`${valueset.uriPrefix}${code}`]);
  const data = await statXploreTable({
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[geoField.id], [dateField.id]],
    recodes: {
      [geoField.id]: { map: geoMap, total: false },
      [dateField.id]: { map: [[dateUri]], total: false },
    },
  });

  const fields = data.fields || [];
  const geoFieldResp = fields.find((f) => f.uri === geoField.id);
  const cube = data.cubes && data.cubes[MEASURE];
  if (!geoFieldResp || !cube || !Array.isArray(cube.values)) {
    console.error('Response missing expected field or cube — aborting.');
    process.exit(1);
  }

  const returnedItems = geoFieldResp.items || [];
  if (returnedItems.length !== gssCodes.length) {
    console.error(`Mismatch: requested ${gssCodes.length}, got ${returnedItems.length} back. Aborting.`);
    process.exit(1);
  }

  const mismatches = [];
  const results = [];
  for (let i = 0; i < gssCodes.length; i++) {
    const expectedCode = gssCodes[i];
    const item = returnedItems[i];
    const itemUri = item.uris ? item.uris[0] : item.uri;
    const returnedCode = itemUri ? itemUri.split(':').pop() : null;
    if (returnedCode !== expectedCode) {
      mismatches.push({ position: i, expectedCode, returnedCode });
      continue;
    }
    results.push({ gss_code: expectedCode, label: item.labels ? item.labels[0] : item.label, value: cube.values[i] && cube.values[i][0] });
  }

  if (mismatches.length > 0) {
    console.error(`\n${mismatches.length} ordering mismatch(es) — ABORTING, nothing written.`);
    console.error(JSON.stringify(mismatches.slice(0, 5), null, 2));
    process.exit(1);
  }

  console.log(`\nIntegrity check passed: all ${results.length} items matched in order.`);
  console.log('First 5 results:');
  results.slice(0, 5).forEach((r) => console.log(`  ${r.gss_code} (${r.label}): ${r.value}`));
  const total = results.reduce((s, r) => s + (typeof r.value === 'number' ? r.value : 0), 0);
  console.log(`\nSum across England & Wales constituencies (Scotland excluded — devolved): ${total.toLocaleString()}`);
  console.log('Compare this against DWP\'s published England & Wales Carer\'s Allowance caseload before trusting this further.');

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
      notes: `Carer's Allowance claimant caseload by Westminster Parliamentary Constituency, ${yyyymm}.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const metricRows = results.map((r) => ({
    constituency_gss_code: r.gss_code,
    metric_key: METRIC_KEY,
    value: r.value,
    unit: 'people',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'ok',
  }));

  const scottishRows = scottishCodes.map((code) => ({
    constituency_gss_code: code,
    metric_key: METRIC_KEY,
    value: null,
    unit: 'people',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'unavailable',
    metadata_json: {
      reason: 'devolved_to_scotland',
      note: 'Carer\'s Allowance has been devolved to Scotland as Carer Support Payment (CSP), with national rollout from Autumn 2024 and case-transfer of existing claims targeted complete by Spring 2025. DWP/Stat-Xplore CA data no longer covers this constituency.',
      scottish_equivalent: 'Carer Support Payment (CSP), administered by Social Security Scotland',
    },
  }));
  console.log(`\n${scottishRows.length} Scottish constituency rows will be written as status='unavailable' (devolved).`);

  const allRows = [...metricRows, ...scottishRows];
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_constituency_metrics')
      .upsert(batch, { onConflict: 'constituency_gss_code,metric_key,period_end' });
    if (upsertErr) { console.error('Failed to upsert metrics batch:', upsertErr.message); process.exit(1); }
    written += batch.length;
    console.log(`  Upserted ${written}/${allRows.length}`);
  }

  console.log(`\nDone. ${written} rows written for metric_key='${METRIC_KEY}', period_end=${periodEnd}.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.body) console.error('Response body:', err.body);
  process.exit(1);
});
