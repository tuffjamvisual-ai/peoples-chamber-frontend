#!/usr/bin/env node
// Combined discovery + import for PIP (Personal Independence Payment)
// caseload by Westminster Parliamentary Constituency, from DWP Stat-Xplore.
//
// WHY THIS ONE DOESN'T HARDCODE URIs THE WAY import-welfare-uc.js DID
// ─────────────────────────────────────────────────────────────────────
// For Universal Credit, the exact field/valueset/date URIs were found
// through several separate manual schema-discovery round trips first, then
// hardcoded into the import script once known. To avoid repeating that
// multi-step process by hand for every remaining benefit, this script does
// its own discovery at runtime:
//   1. Calls /schema on the database to find the geography field (matches
//      "constituency" or "parliamentary" in its label) and the date field
//      (matches "month" or "date" in its label) — rather than assuming
//      their field names follow the UC_Monthly naming convention.
//   2. Calls /schema on the geography field to find its child valuesets,
//      then calls /schema on EACH of those to find the one with the most
//      items — that's the individual-constituency level, as opposed to the
//      country/region/GB aggregate levels (which have far fewer items).
//      This avoids assuming the valueset is named
//      "V_C_MASTERGEOG21_PARLC24_TO_REGION" the way it was for UC.
//   3. Derives the date value URI *template* from one real item already
//      returned by the schema (strips its trailing YYYYMM segment), then
//      steps backwards from the current month using that template — rather
//      than assuming the literal "C_UC_DATE"-style segment name.
// If any of these discovery steps don't find what they expect, the script
// prints what it DID find and exits — it does not guess or fall back to a
// hardcoded assumption silently.
//
// INTEGRITY CHECK — same as import-welfare-uc.js
// ────────────────────────────────────────────────
// Every returned geography item's GSS code is re-derived from its own URI
// and checked against what was expected at that position before anything
// is written. Any mismatch aborts with nothing written.
//
// SCOTLAND EXCLUSION — READ BEFORE CHANGING
// ───────────────────────────────────────────
// PIP was fully transferred to Scotland's devolved Adult Disability Payment
// (ADP) by the end of June 2025 (confirmed via DWP's own current PIP
// statistics, which now explicitly describe their GB figures as "England
// and Wales... for simplicity", and via Social Security Scotland's case-
// transfer completion notices). DWP/Stat-Xplore PIP data for Scottish
// constituencies (GSS codes starting "S14") is therefore stale/not
// meaningful for current claims and is NOT requested from Stat-Xplore at
// all here. Scottish constituencies instead get a status='unavailable' row
// with no value, explaining the devolution in metadata_json, so the eventual
// constituency page can say "this benefit doesn't apply here" rather than
// showing a misleading number or nothing at all.
//
// Run without --live to preview. Pass --live to write to
// welfare_constituency_metrics (metric_key = 'pip_claimants').

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
const DATABASE = 'str:database:PIP_Monthly_new';
const MEASURE = 'str:count:PIP_Monthly_new:V_F_PIP_MONTHLY'; // confirmed via earlier schema discovery table

const METRIC_KEY = 'pip_claimants';
const SOURCE_NAME = 'dwp_statxplore_pip_monthly';

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

  // Fields can be nested under category folders or groups within the database
  // schema; flatten one level if children are themselves folders/groups.
  // PIP uses GROUP type for the geography container — not FOLDER as UC does.
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

  const geoField = flatFields.find((f) => /constitu|parliament/i.test(f.label || ''));
  const dateField = flatFields.find((f) => /month|date/i.test(f.label || ''));

  if (!geoField) {
    console.error('Could not find a geography field matching "constituency"/"parliamentary". Fields found:');
    flatFields.forEach((f) => console.error(`  ${f.id} — ${f.label}`));
    process.exit(1);
  }
  if (!dateField) {
    console.error('Could not find a date field matching "month"/"date". Fields found:');
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
  const valuesets = (fieldSchema.children || []).filter((c) => c.type === 'VALUESET' || c.type === 'FOLDER' || c.id);

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

  // The Stat-Xplore schema endpoint caps child lists at 100 items regardless
  // of the real valueset size — a valueset returning exactly 100 is not
  // "only 100 constituencies", it means we hit the pagination cap. We don't
  // need every item from the schema here: we derive the URI prefix from one
  // sample item and build per-GSS-code URIs ourselves (same approach as the
  // hardcoded PCON24_VALUE_PREFIX in import-welfare-uc.js, but discovered
  // at runtime rather than hardcoded).
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
  // Derive the URI template from one real item, strip its trailing :YYYYMM.
  const lastColon = sampleItemUri.lastIndexOf(':');
  const prefix = sampleItemUri.slice(0, lastColon + 1);

  for (let back = 0; back <= 12; back++) {
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
  throw new Error('Could not find an available month in the last 12 months.');
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
  console.log(`Excluding ${scottishCodes.length} Scottish constituencies (PIP devolved to Adult Disability Payment) — requesting PIP data for the remaining ${gssCodes.length}.`);

  // All GSS codes are constructed from the discovered prefix — no need to
  // check itemsByCode (which only holds the capped 100 schema samples).
  console.log(`Building ${gssCodes.length} constituency URIs using prefix: ${valueset.uriPrefix}...`);

  let sampleDateItem = (await schemaGet(dateField.id)).children?.[0];
  if (!sampleDateItem) { console.error('Could not get a sample date item to derive the URI template.'); process.exit(1); }
  // PIP's date field children are valueset nodes (str:valueset:...) rather
  // than direct value items as in UC. Drill into the valueset to get a real
  // str:value:... URI for the template; take the last item (most recent month).
  if (sampleDateItem.id && sampleDateItem.id.startsWith('str:valueset:')) {
    const vsSchema = await schemaGet(sampleDateItem.id);
    const vsItems = vsSchema.children || [];
    if (vsItems.length === 0) { console.error('Date valueset has no items — cannot derive URI template.'); process.exit(1); }
    sampleDateItem = vsItems[vsItems.length - 1];
    console.log(`Date URI template from valueset (latest item): ${sampleDateItem.id} (${sampleDateItem.label})`);
  }
  console.log('\nFinding latest available data month...');
  const { yyyymm, year, month, dateUri } = await findLatestAvailableMonth(dateField.id, sampleDateItem.id);
  const periodEnd = lastDayOfMonth(year, month);

  console.log(`\nRequesting PIP caseload for all ${gssCodes.length} constituencies for ${yyyymm}...`);
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
  console.log('Compare this against DWP\'s published England & Wales PIP caseload (~3.9m as of January 2026) before trusting this further.');

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
      notes: `PIP claimant caseload by Westminster Parliamentary Constituency, ${yyyymm}.`,
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

  // Scottish constituencies: no value, explicit 'unavailable' status, and
  // the devolution explanation in metadata_json rather than silence.
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
      note: 'PIP was fully transferred to Scotland\'s devolved Adult Disability Payment (ADP) by the end of June 2025. DWP/Stat-Xplore PIP data no longer covers this constituency.',
      scottish_equivalent: 'Adult Disability Payment (ADP), administered by Social Security Scotland',
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
