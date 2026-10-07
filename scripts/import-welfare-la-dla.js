#!/usr/bin/env node
// Import DLA (Disability Living Allowance) caseload by LOCAL AUTHORITY,
// from DWP Stat-Xplore. Same confirmed LA query shape as
// import-welfare-la-hb.js (valueset-as-dimension, no recode) — see that
// script's header for the full rationale.
//
// SCOTLAND EXCLUSION — READ BEFORE CHANGING
// ───────────────────────────────────────────
// Same devolution fact as import-welfare-dla.js (constituency level): DLA
// has been devolved to Scotland — Child Disability Payment (CDP) has
// fully replaced DLA for children, and Scottish Adult DLA (SADLA) is
// replacing it for adults (case transfer targeted complete by end of
// 2025). Scottish local authorities (GSS codes starting "S12") are
// returned by the LA-level query along with everyone else (this query
// shape has no recode option — see import-welfare-la-pip.js's header for
// why), so this script explicitly DISCARDS their returned value and
// writes a status='unavailable' row instead.
//
// Run without --live to preview. Pass --live to write to
// welfare_local_authority_metrics (metric_key = 'dla_claimants').

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
const DATABASE = 'str:database:DLA_In_Payment_New';
const COA_FIELD = 'str:field:DLA_In_Payment_New:V_F_DLA_In_Payment_New:COA_CODE';
const DATE_FIELD = 'str:field:DLA_In_Payment_New:F_DLA_QTR_New:DATE_NAME';
const MEASURE = 'str:count:DLA_In_Payment_New:V_F_DLA_In_Payment_New';

const METRIC_KEY = 'dla_claimants';
const SOURCE_NAME = 'dwp_statxplore_dla_quarterly_la';

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
  console.log('\nFinding latest available data period...');
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

  const nonScottish = [];
  const scottish = [];
  const unexpected = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const uri = item.uris ? item.uris[0] : item.uri;
    const code = uri ? uri.split(':').pop() : null;
    const label = item.labels ? item.labels[0] : item.label;
    const value = cube.values[i] && cube.values[i][0];
    if (!code || NON_GEOGRAPHIC_CODES.has(code)) continue;
    if (!GB_LA_CODE_SHAPE.test(code)) { unexpected.push({ code, label }); continue; }
    if (code.startsWith('S12')) { scottish.push({ code, label }); continue; }
    nonScottish.push({ code, label, value });
  }

  if (unexpected.length > 0) {
    console.error(`\n${unexpected.length} item(s) with an unexpected code shape — ABORTING, nothing written.`);
    console.error(JSON.stringify(unexpected.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`\nNon-Scottish local authorities: ${nonScottish.length} (expected 318 — 296 England + 22 Wales).`);
  console.log(`Scottish local authorities (excluded — DLA devolved to CDP/SADLA): ${scottish.length} (expected 32).`);
  if (nonScottish.length !== 318 || scottish.length !== 32) {
    console.error(`WARNING: expected 318 non-Scottish + 32 Scottish, got ${nonScottish.length} + ${scottish.length}. Review before trusting this further.`);
  }

  console.log('First 5 results:');
  nonScottish.slice(0, 5).forEach((r) => console.log(`  ${r.code} (${r.label}): ${r.value}`));
  const total = nonScottish.reduce((s, r) => s + (typeof r.value === 'number' ? r.value : 0), 0);
  console.log(`\nSum across England & Wales local authorities (Scotland excluded — devolved): ${total.toLocaleString()}`);

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
      notes: `DLA claimant caseload by local authority, ${yyyymm}.`,
    })
    .select()
    .single();
  if (releaseErr) { console.error('Failed to insert source release:', releaseErr.message); process.exit(1); }
  console.log(`  Inserted source release id ${releaseRow.id}`);

  const metricRows = nonScottish.map((r) => ({
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

  const scottishRows = scottish.map((r) => ({
    council_gss_code: r.code,
    council_name: r.label,
    metric_key: METRIC_KEY,
    value: null,
    unit: 'people',
    period_start: `${yyyymm.slice(0, 4)}-${yyyymm.slice(4, 6)}-01`,
    period_end: periodEnd,
    source_release_id: releaseRow.id,
    status: 'unavailable',
    metadata_json: {
      reason: 'devolved_to_scotland',
      note: 'DLA has been devolved to Scotland: Child Disability Payment (CDP) has fully replaced DLA for children, and Scottish Adult DLA (SADLA) is replacing it for adults (case transfer targeted complete by end of 2025). DWP/Stat-Xplore DLA data no longer covers this local authority.',
      scottish_equivalent: 'Child Disability Payment (CDP) for children, Scottish Adult DLA (SADLA) for adults, both administered by Social Security Scotland',
    },
  }));
  console.log(`\n${scottishRows.length} Scottish local authority rows will be written as status='unavailable' (devolved).`);

  const allRows = [...metricRows, ...scottishRows];
  const BATCH_SIZE = 200;
  let written = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('welfare_local_authority_metrics')
      .upsert(batch, { onConflict: 'council_gss_code,metric_key,period_end' });
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
