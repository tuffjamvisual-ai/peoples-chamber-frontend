// Sync ministerial hospitality. Mirrors sync-ministers-meetings.js but
// targets the "hospitality"-titled CSVs in each quarterly transparency
// publication and maps to the ministers_hospitality table columns:
// minister_name, minister_dept, hospitality_date, donor, description,
// value, quarter.
//
// Date filter cut-off is the 2024-07-04 UK general election so rows are
// scoped to the current Labour government era; pre-cutoff dates that
// appear in otherwise-recent publications are dropped row-by-row.
//
// "Nil Return" entries (where the minister logged no hospitality for
// the quarter) are filtered out — the date column is "Nil Return"
// rather than a parseable date, so the existing date-validity gate
// catches them automatically.
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEARCH = 'https://www.gov.uk/api/search.json';
const CONTENT = 'https://www.gov.uk/api/content';

const DEPT_SLUGS = ['cabinet-office'];
const CUTOFF_ISO = '2024-07-04';

// Header → column lookup. Multiple spellings per target since departments
// differ (and Cabinet Office vs FCDO vs Treasury all word things slightly
// differently across quarters).
const HEADER_MAP = {
  minister_name:    ['minister', 'minister name', 'name of minister'],
  hospitality_date: ['date', 'date of hospitality', 'date received', 'month'],
  donor: [
    'individual or organisation that offered hospitality',
    'name of individual or organisation',
    'name of organisation',
    'donor',
    'provider',
    'name of provider',
    'organisation providing hospitality',
    'who paid',
    'host',
  ],
  description: [
    'type of hospitality received',
    'type of hospitality',
    'hospitality received',
    'hospitality',
    'description',
    'reason',
    'type',
  ],
  value: [
    'value',
    'estimated value',
    'value of hospitality',
    'estimated value of hospitality',
    'amount',
    'cost',
  ],
};

// Headers we treat as the canonical "description" field — when present
// we emit the value bare; everything else gets a "Header: value" prefix.
const DESCRIPTION_HEADERS = new Set([
  'type of hospitality received',
  'type of hospitality',
  'hospitality received',
  'hospitality',
  'description',
  'type',
]);

function normaliseHeader(h) {
  // Strip currency symbols and brackets so "Estimated value of Hospitality (£)"
  // matches a clean candidate "estimated value of hospitality" in HEADER_MAP.
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[£$€¥()\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHeaderIndex(headers) {
  const idx = {};
  const norm = headers.map(normaliseHeader);
  for (const [target, candidates] of Object.entries(HEADER_MAP)) {
    for (const cand of candidates) {
      const i = norm.indexOf(cand);
      if (i !== -1) { idx[target] = i; break; }
    }
  }
  return idx;
}

function isoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^nil return$/i.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

// Numeric value extractor — strips £, commas, ranges like "£100-£200" → 200.
function parseValue(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || /^nil return$/i.test(s) || /^n\/?a$/i.test(s)) return null;
  // Take the LAST numeric run in the string (so "£100-£200" → 200,
  // "approximately £150" → 150).
  const matches = s.match(/[\d.,]+/g);
  if (!matches) return null;
  const last = matches[matches.length - 1].replace(/,/g, '');
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

function quarterFromSlug(slug) {
  const Q = {
    'january-to-march': 'Q1',
    'april-to-june': 'Q2',
    'july-to-september': 'Q3',
    'october-to-december': 'Q4',
  };
  for (const [phrase, q] of Object.entries(Q)) {
    const re = new RegExp(`${phrase}-(\\d{4})`);
    const m = slug.match(re);
    if (m) return `${q} ${m[1]}`;
  }
  // Monthly publications (e.g. DCMS publishes per-month) — map the
  // month to its containing quarter.
  const months = ['january','february','march','april','may','june',
                  'july','august','september','october','november','december'];
  for (let i = 0; i < months.length; i++) {
    const re = new RegExp(`(?:^|-)${months[i]}-(\\d{4})`);
    const m = slug.match(re);
    if (m) return `Q${Math.floor(i / 3) + 1} ${m[1]}`;
  }
  return null;
}

const ORG_LEAD = /^(the\b|Department\b|Ministry\b|Office\b|Cabinet\b|Foreign\b|HM\b|His Majesty\b|Her Majesty\b|Home\b|Treasury\b|Crown\b|National\b|Government\b)/i;

function deptFromCsvTitle(title) {
  // Two different title shapes to handle:
  //   "Cabinet Office ministerial hospitality, July to September 2024"
  //   "Department for Culture, Media & Sport: Ministers' Hospitality - February 2026"
  //   "Leader of the House of Lords ministerial hospitality, April to June 2024"
  //   "UK Export Finance: Ministers' Hospitality - November 2024"
  //
  // Strategy: split on (whitespace or colon) followed by "ministerial"
  // or "ministers'/ministers" then "hospitality". Take the prefix.
  // Normalise curly apostrophes to straight first so the regex matches
  // titles like "Department for Culture: Ministers' Hospitality" too.
  let s = String(title || '').trim().replace(/[''’]/g, "'");
  const m = s.match(/^(.*?)[\s:]+(?:ministerial|ministers'?)\s+hospitality\b/i);
  if (m) s = m[1];
  s = s.replace(/[:\-,]+$/, '').trim();
  s = s.replace(/[''’]$/u, '').trim();
  return s || null;
}

async function findHospitalityPublications(deptSlug) {
  const all = [];
  let start = 0;
  const PAGE = 100;
  while (start < 1000) {
    const url = `${SEARCH}?filter_format=transparency&filter_organisations=${deptSlug}` +
      `&q=${encodeURIComponent('ministers gifts hospitality')}` +
      `&filter_public_timestamp=${encodeURIComponent('from:' + CUTOFF_ISO)}` +
      `&order=-public_timestamp&count=${PAGE}&start=${start}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) break;
    all.push(...results);
    start += results.length;
    if (start >= (data.total || 0)) break;
    await sleep(DELAY_MS);
  }
  // Restrict to quarterly returns whose title obviously includes "hospitality".
  return all.filter((r) => {
    const t = String(r.title || '').toLowerCase();
    return t.includes('hospitality');
  });
}

async function fetchPublicationAttachments(publicationLink) {
  const res = await fetch(`${CONTENT}${publicationLink}`);
  if (!res.ok) throw new Error(`Content API ${res.status} for ${publicationLink}`);
  const data = await res.json();
  return data?.details?.attachments || [];
}

async function parseCsvAttachment(att, publicationSlug) {
  const res = await fetch(att.url);
  if (!res.ok) {
    console.error(`  csv fetch failed for "${att.title}": HTTP ${res.status}`);
    return [];
  }
  const text = await res.text();
  let records;
  try {
    records = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (e) {
    console.error(`  csv parse failed for "${att.title}": ${e.message}`);
    return [];
  }
  if (records.length === 0) return [];

  const headers = Object.keys(records[0]);
  const idx = buildHeaderIndex(headers);
  if (idx.minister_name === undefined || idx.hospitality_date === undefined) {
    console.error(`  "${att.title}": couldn't locate Minister or Date headers (have ${headers.join(', ')})`);
    return [];
  }

  const minister_dept = deptFromCsvTitle(att.title);
  const quarter = quarterFromSlug(publicationSlug);

  const usedIndices = new Set();
  for (const k of ['minister_name', 'hospitality_date', 'donor', 'value']) {
    if (idx[k] !== undefined) usedIndices.add(idx[k]);
  }

  const rows = [];
  for (const rec of records) {
    const vals = Object.values(rec);
    const minister_name = vals[idx.minister_name];
    const date = isoDate(vals[idx.hospitality_date]);
    if (!minister_name || !date) continue; // catches Nil Return rows
    if (date < CUTOFF_ISO) continue;

    const donorRaw = idx.donor !== undefined ? vals[idx.donor] : null;
    const donor = donorRaw && !/^nil return$/i.test(String(donorRaw).trim()) ? String(donorRaw).trim() : null;
    if (!donor) continue;

    const value = idx.value !== undefined ? parseValue(vals[idx.value]) : null;

    // Build description from the canonical type-of-hospitality column
    // plus any non-mapped extras (e.g. "Accompanied by Guest").
    const descParts = [];
    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue;
      const headerNorm = normaliseHeader(headers[i]);
      const value = String(vals[i] || '').trim();
      if (!value) continue;
      if (/^nil return$/i.test(value)) continue;
      if (DESCRIPTION_HEADERS.has(headerNorm)) {
        descParts.push(value);
      } else {
        const headerDisplay = String(headers[i] || '').trim();
        if (!headerDisplay) continue;
        descParts.push(`${headerDisplay}: ${value}`);
      }
    }
    const description = descParts.length > 0 ? descParts.join(' | ') : null;

    rows.push({
      minister_name: String(minister_name).trim(),
      minister_dept,
      hospitality_date: date,
      donor,
      description,
      value,
      quarter,
    });
  }
  console.log(`  "${att.title}": ${rows.length} entries parsed`);
  return rows;
}

async function collectDeptRows(deptSlug) {
  console.log(`[hospitality] dept: ${deptSlug}`);
  const pubs = await findHospitalityPublications(deptSlug);
  console.log(`  found ${pubs.length} matching publications`);
  let allRows = [];
  for (const pub of pubs) {
    const slug = pub.link.replace(/^.*\/publications\//, '');
    console.log(`  → ${pub.title} (${(pub.public_timestamp || '').slice(0, 10)})`);
    let atts;
    try {
      atts = await fetchPublicationAttachments(pub.link);
    } catch (e) {
      console.error(`    publication fetch failed: ${e.message}`);
      continue;
    }
    const hospCsvs = atts.filter((a) =>
      a.content_type === 'text/csv' &&
      /hospitality/i.test(a.title || '') &&
      !/meetings|gifts|travel|expenses/i.test(a.title || '')
    );
    if (hospCsvs.length === 0) continue;
    for (const att of hospCsvs) {
      const rows = await parseCsvAttachment(att, slug);
      allRows = allRows.concat(rows);
      await sleep(DELAY_MS);
    }
  }
  console.log(`[hospitality] dept '${deptSlug}': ${allRows.length} parsed entries`);
  return allRows;
}

async function wipeTable() {
  const { error } = await supabase
    .from('ministers_hospitality')
    .delete()
    .not('minister_name', 'is', null);
  if (error) console.error(`[hospitality] wipe error: ${error.message || error}`);
  else console.log('[hospitality] wiped existing rows');
}

async function insertBatched(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('ministers_hospitality').insert(batch);
    if (error) {
      console.error(`[hospitality] insert error at offset ${i}: ${error.message || error}`);
      return inserted;
    }
    inserted += batch.length;
    await sleep(DELAY_MS);
  }
  return inserted;
}

async function main() {
  let allRows = [];
  for (const dept of DEPT_SLUGS) {
    const rows = await collectDeptRows(dept);
    allRows = allRows.concat(rows);
  }
  if (allRows.length === 0) {
    console.log('[hospitality] no rows collected — leaving table untouched');
    return;
  }
  await wipeTable();
  const inserted = await insertBatched(allRows);
  console.log(`[hospitality] inserted ${inserted} rows total`);
}

main().catch((e) => { console.error('[hospitality] fatal:', e?.message || e); process.exit(0); });
