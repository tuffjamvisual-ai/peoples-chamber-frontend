#!/usr/bin/env node
/**
 * One-off probe: fetch a single, small Universal Credit table from Stat-Xplore
 * to confirm what format the PCON24 (Westminster Parliamentary Constituency)
 * dimension's category codes actually come back in, before any import logic
 * is written against an assumption about that format.
 *
 * This is READ-ONLY against Stat-Xplore. It does not touch Supabase at all.
 *
 * Usage:
 *   node scripts/probe-stat-xplore-uc.js
 *
 * Requires STAT_XPLORE_API_KEY in .env.local.
 */

require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.STAT_XPLORE_API_KEY;
if (!API_KEY) {
  console.error('STAT_XPLORE_API_KEY not set (.env.local)');
  process.exit(1);
}

const BASE = 'https://stat-xplore.dwp.gov.uk/webapi/rest/v1';

const DATABASE = 'str:database:UC_Monthly';
const MEASURE = 'str:count:UC_Monthly:V_F_UC_CASELOAD_FULL';
const PCON24_FIELD = 'str:field:UC_Monthly:V_F_UC_CASELOAD_FULL:PCON24';
const DATE_FIELD = 'str:field:UC_Monthly:F_UC_DATE:DATE_NAME';

async function main() {
  const body = {
    database: DATABASE,
    measures: [MEASURE],
    dimensions: [[PCON24_FIELD], [DATE_FIELD]],
    recodes: {
      [DATE_FIELD]: {
        map: [['str:value:UC_Monthly:F_UC_DATE:DATE_NAME:C_UC_DATE:202608']],
        total: false,
      },
    },
  };

  console.log('--- POST /table request body ---');
  console.log(JSON.stringify(body, null, 2));

  const res = await fetch(`${BASE}/table`, {
    method: 'POST',
    headers: {
      APIKey: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`\nRequest failed (${res.status}):`);
    console.error(text);
    process.exit(1);
  }

  const data = JSON.parse(text);

  console.log('\n--- Top-level response keys ---');
  console.log(Object.keys(data));

  // Stat-Xplore table responses carry a `fields` array (one per requested
  // dimension) each with an `items` array of { labels, uris } — these are
  // the category codes/labels for that dimension, in request order.
  const fields = data.fields || [];
  console.log(`\n--- ${fields.length} field(s) in response ---`);

  fields.forEach((field, i) => {
    console.log(`\nField ${i}: ${field.uri}`);
    console.log(`  label: ${field.label}`);
    const items = field.items || [];
    console.log(`  item count: ${items.length}`);
    console.log('  first 5 items (raw):');
    items.slice(0, 5).forEach((item) => {
      console.log('   ', JSON.stringify(item));
    });
  });

  console.log('\n--- Cube shape ---');
  const cube = data.cubes && data.cubes[MEASURE];
  if (cube) {
    console.log('  values dimensions (should match fields length + 1 for measure):', cube.values ? 'present' : 'missing');
    if (Array.isArray(cube.values)) {
      console.log('  outer length:', cube.values.length);
      if (Array.isArray(cube.values[0])) {
        console.log('  inner length (first):', cube.values[0].length);
        console.log('  sample values[0][0..4]:', cube.values[0].slice(0, 5));
      }
    }
  } else {
    console.log('  No cube found under measure key — full response below for inspection:');
    console.log(JSON.stringify(data, null, 2).slice(0, 3000));
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
