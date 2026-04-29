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

async function findLatestMeetingsPublication(deptSlug) {
  // Search for the dept's quarterly "ministerial gifts hospitality... meetings"
  // returns. The most recently PUBLISHED one is the target.
  const url = `${SEARCH}?filter_format=transparency&filter_organisations=${deptSlug}` +
    `&q=${encodeURIComponent('ministers meetings hospitality')}` +
    `&order=-public_timestamp&count=10`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  // Pick the first result whose title contains both "ministerial" and "meetings"
  const candidates = (data.results || []).filter((r) => {
    const t = String(r.title || '').toLowerCase();
    return t.includes('ministerial') && t.includes('meetings');
  });
  return candidates[0] || null;
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

async function syncDept(deptSlug) {
  console.log(`[ministers-meetings] dept: ${deptSlug}`);
  const pub = await findLatestMeetingsPublication(deptSlug);
  if (!pub) { console.log(`  no publication found`); return 0; }
  console.log(`  publication: ${pub.title}`);
  console.log(`  link: ${pub.link}`);
  const slug = pub.link.replace(/^.*\/publications\//, '');
  const atts = await fetchPublicationAttachments(pub.link);
  const meetingsCsvs = atts.filter((a) =>
    a.content_type === 'text/csv' &&
    /meetings/i.test(a.title || '') &&
    !/hospitality|gifts|travel|expenses/i.test(a.title || '')
  );
  console.log(`  found ${meetingsCsvs.length} meetings CSV attachments`);

  let allRows = [];
  for (const att of meetingsCsvs) {
    const rows = await parseCsvAttachment(att, slug);
    allRows = allRows.concat(rows);
    await sleep(DELAY_MS);
  }
  console.log(`[ministers-meetings] dept '${deptSlug}': ${allRows.length} total rows to insert`);
  if (allRows.length === 0) return 0;
  return insertBatched(allRows);
}

async function main() {
  let totalInserted = 0;
  for (const dept of DEPT_SLUGS) {
    totalInserted += await syncDept(dept);
  }
  console.log(`[ministers-meetings] inserted ${totalInserted} rows total`);
}

main().catch((e) => { console.error('[ministers-meetings] fatal:', e?.message || e); process.exit(0); });
