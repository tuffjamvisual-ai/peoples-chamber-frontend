// Sync ministerial meetings — pilot scoped to Cabinet Office's most recent
// quarterly transparency publication. Downloads each "meetings"-titled CSV
// attachment, parses it, and inserts one row per meeting into the
// ministers_meetings table.
//
// Schema target: minister_name, minister_dept, meeting_date, organisation,
// purpose, quarter.
//
// Pilot scope:
//   - Single department (cabinet-office)
//   - Single publication (most recent matching the standard quarterly title)
//   - Generalises to other departments later by extending DEPT_PUBS or by
//     auto-discovering quarterly publications via filter_organisations.
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SEARCH = 'https://www.gov.uk/api/search.json';
const CONTENT = 'https://www.gov.uk/api/content';

// Department slugs to pilot. Add more as the parser proves out per-dept.
const DEPT_SLUGS = ['cabinet-office'];

// Cut-off — UK general election date that brought the current Labour
// government in. Used both as a server-side filter on the GOV.UK search
// (skip publications dated before this) and as a client-side filter on
// individual meeting rows (skip rows whose meeting_date < cutoff even if
// they appear in a more recent publication).
const CUTOFF_ISO = '2024-07-04';

// CSV header → target-column mapping. We accept several header spellings
// since departments aren't fully consistent. Match is case-insensitive
// and whitespace-tolerant.
const HEADER_MAP = {
  minister_name:  ['minister', 'minister name', 'name of minister'],
  meeting_date:   ['date', 'date of meeting', 'meeting date', 'month'],
  organisation:   [
    'name of individual or organisation',
    'name of organisation or individual',
    'organisation',
    'name of organisation',
    'organisation met',
    'individual or organisation',
    'name of external organisation',
  ],
  purpose:        ['purpose of meeting', 'purpose', 'reason'],
};

function normaliseHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
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

// Parse a date string into ISO YYYY-MM-DD where possible.
function isoDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Fallback: let JS parse it (e.g., "12 July 2024")
  const t = Date.parse(s);
  if (Number.isFinite(t)) {
    return new Date(t).toISOString().slice(0, 10);
  }
  return null;
}

// Convert "july-to-september-2024" → "Q3 2024" (best effort).
function quarterFromSlug(slug) {
  const QUARTERS = {
    'january-to-march': 'Q1',
    'april-to-june': 'Q2',
    'july-to-september': 'Q3',
    'october-to-december': 'Q4',
  };
  for (const [phrase, q] of Object.entries(QUARTERS)) {
    const re = new RegExp(`${phrase}-(\\d{4})`);
    const m = slug.match(re);
    if (m) return `${q} ${m[1]}`;
  }
  return null;
}

// Derive a department label from the CSV attachment title. CSVs vary:
//   "Cabinet Office ministerial meetings, July to September 2024"
//   "Cabinet Office ministers' meetings, October to December 2025"
//   "Leader of the House of Commons and Whips' ministerial meetings, ..."
//   "Rt Hon Sir Keir Starmer KCB KC MP meetings, October to December 2025"
function deptFromCsvTitle(title) {
  let s = String(title || '').split(/ meetings,/i)[0].trim();
  s = s.replace(/\s+(ministers'|ministers|ministerial)$/i, '').trim();
  s = s.replace(/[''’]$/u, '').trim();
  return s || null;
}

// Pull every transparency publication for a dept that looks like a
// quarterly meetings/hospitality return. No year filter — we want the
// full historical span so users see 2024 + 2025 + 2026 data, not just
// the most recent quarter. Ordered by -public_timestamp so newest are
// handled first; the upstream cap is 30 pages × 100 each = 3,000 results
// max but in practice each dept has at most a few dozen.
async function findMeetingsPublications(deptSlug) {
  const all = [];
  let start = 0;
  const PAGE = 100;
  while (start < 1000) {
    const url = `${SEARCH}?filter_format=transparency&filter_organisations=${deptSlug}` +
      `&q=${encodeURIComponent('ministers meetings hospitality')}` +
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
  return all.filter((r) => {
    const t = String(r.title || '').toLowerCase();
    return t.includes('ministerial') && t.includes('meetings');
  });
}

async function fetchPublicationAttachments(publicationLink) {
  // publicationLink is e.g. "/government/publications/..."
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
  if (idx.minister_name === undefined || idx.meeting_date === undefined) {
    console.error(`  "${att.title}": couldn't locate Minister or Date headers (have ${headers.join(', ')})`);
    return [];
  }

  const minister_dept = deptFromCsvTitle(att.title);
  const quarter = quarterFromSlug(publicationSlug);

  const rows = [];
  for (const rec of records) {
    const vals = Object.values(rec);
    const minister_name = vals[idx.minister_name];
    const date = isoDate(vals[idx.meeting_date]);
    const organisation = idx.organisation !== undefined ? vals[idx.organisation] : null;
    const purpose = idx.purpose !== undefined ? vals[idx.purpose] : null;
    if (!minister_name || !date) continue;
    // Drop meetings before the cutoff — defensive against publications
    // that include pre-Labour quarters.
    if (date < CUTOFF_ISO) continue;
    rows.push({
      minister_name: String(minister_name).trim(),
      minister_dept,
      meeting_date: date,
      organisation: organisation ? String(organisation).trim() : null,
      purpose: purpose ? String(purpose).trim() : null,
      quarter,
    });
  }
  console.log(`  "${att.title}": ${rows.length} meetings parsed`);
  return rows;
}

async function insertBatched(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('ministers_meetings').insert(batch);
    if (error) {
      console.error(`[ministers-meetings] insert error at offset ${i}: ${error.message || error}`);
      return inserted;
    }
    inserted += batch.length;
    await sleep(DELAY_MS);
  }
  return inserted;
}

async function collectDeptRows(deptSlug) {
  console.log(`[ministers-meetings] dept: ${deptSlug}`);
  const pubs = await findMeetingsPublications(deptSlug);
  console.log(`  found ${pubs.length} matching publications`);
  let allRows = [];
  for (const pub of pubs) {
    const slug = pub.link.replace(/^.*\/publications\//, '');
    console.log(`  → ${pub.title} (${(pub.public_timestamp || '').slice(0,10)})`);
    let atts;
    try {
      atts = await fetchPublicationAttachments(pub.link);
    } catch (e) {
      console.error(`    publication fetch failed: ${e.message}`);
      continue;
    }
    const meetingsCsvs = atts.filter((a) =>
      a.content_type === 'text/csv' &&
      /meetings/i.test(a.title || '') &&
      !/hospitality|gifts|travel|expenses/i.test(a.title || '')
    );
    if (meetingsCsvs.length === 0) continue;
    for (const att of meetingsCsvs) {
      const rows = await parseCsvAttachment(att, slug);
      allRows = allRows.concat(rows);
      await sleep(DELAY_MS);
    }
  }
  console.log(`[ministers-meetings] dept '${deptSlug}': ${allRows.length} parsed meeting rows`);
  return allRows;
}

async function wipeTable() {
  // The table has no natural unique key, so re-runs need a wipe to avoid
  // unbounded duplicate growth. Each cron run re-fetches the full
  // historical span and rewrites the table.
  const { error } = await supabase
    .from('ministers_meetings')
    .delete()
    .not('minister_name', 'is', null);
  if (error) console.error(`[ministers-meetings] wipe error: ${error.message || error}`);
  else console.log('[ministers-meetings] wiped existing rows');
}

async function main() {
  let allRows = [];
  for (const dept of DEPT_SLUGS) {
    const rows = await collectDeptRows(dept);
    allRows = allRows.concat(rows);
  }
  if (allRows.length === 0) {
    console.log('[ministers-meetings] no rows collected — leaving table untouched');
    return;
  }
  await wipeTable();
  const inserted = await insertBatched(allRows);
  console.log(`[ministers-meetings] inserted ${inserted} rows total`);
}

main().catch((e) => { console.error('[ministers-meetings] fatal:', e?.message || e); process.exit(0); });
