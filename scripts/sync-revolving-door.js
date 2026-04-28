// Sync ACOBA (Advisory Committee on Business Appointments) case decisions.
//
// ACOBA publication titles follow a near-uniform shape:
//   "Surname, Firstname - Previous role, organisation - ACOBA advice"
//   "Firstname Surname - Previous role, organisation - ACOBA advice"
// We parse that to extract person_name, previous_role, organisation, and
// approval_date (from the publication timestamp). The new_role and
// conditions live inside each decision's PDF body and aren't recoverable
// from the search-API metadata alone — those stay null.
//
// Non-case publications (ACOBA's own announcements, evidence sessions,
// closure notices) are filtered out by requiring the title to contain
// the marker "ACOBA advice|correspondence" AND a dash separator.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SEARCH_URL = 'https://www.gov.uk/api/search.json';
const ACOBA = 'advisory-committee-on-business-appointments';
const PAGE_SIZE = 100;

// Match either hyphen or em-dash, surrounded by optional whitespace.
const DASH_SPLIT = /\s*[–—-]\s*/;
const ACOBA_TAIL = /(?:^|\s)acoba\s+(?:advice|correspondence)(?:\s+and\s+correspondence)?\.?$/i;

function normaliseName(seg) {
  if (!seg) return null;
  const s = seg.replace(/\s+/g, ' ').trim();
  // "Surname, Firstname" → "Firstname Surname"
  const comma = s.match(/^([^,]+),\s*(.+)$/);
  if (comma) return `${comma[2].trim()} ${comma[1].trim()}`;
  return s;
}

function parseTitle(title) {
  const t = String(title || '').trim();
  if (!t) return null;

  // Quick-reject: titles without an ACOBA tail or without a dash are
  // organisational notices, not case decisions.
  if (!ACOBA_TAIL.test(t)) return null;
  const parts = t.split(DASH_SPLIT).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // Strip the trailing ACOBA marker from the last segment.
  const last = parts[parts.length - 1];
  if (ACOBA_TAIL.test(last)) parts.pop();
  if (parts.length < 1) return null;

  const person_name = normaliseName(parts.shift());
  if (!person_name) return null;

  // Remaining segments collectively describe the previous role.
  // The trailing comma-segment of that joined string is usually the
  // organisation.
  let previous_role = parts.join(' - ').trim() || null;
  let organisation = null;
  if (previous_role) {
    const segs = previous_role.split(',').map(s => s.trim()).filter(Boolean);
    if (segs.length >= 2) {
      organisation = segs[segs.length - 1];
      previous_role = segs.slice(0, -1).join(', ');
    }
  }

  return { person_name, previous_role, organisation };
}

async function fetchAll() {
  const out = [];
  let start = 0;
  while (true) {
    const url = `${SEARCH_URL}?filter_organisations=${ACOBA}&count=${PAGE_SIZE}&start=${start}&order=-public_timestamp`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`GOV.UK search failed (${res.status}) at start=${start}`);
      break;
    }
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) break;
    for (const r of results) {
      const parsed = parseTitle(r.title);
      if (!parsed) continue;
      out.push({
        person_name: parsed.person_name,
        previous_role: parsed.previous_role,
        new_role: null,
        organisation: parsed.organisation,
        approval_date: r.public_timestamp ? r.public_timestamp.slice(0, 10) : null,
        conditions: null,
      });
    }
    start += results.length;
    if (start >= (data.total || 0)) break;
    await sleep(DELAY_MS);
  }
  return out;
}

async function insertBatched(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase.from('revolving_door').insert(batch);
    if (error) {
      // Duplicate-key conflicts are expected on subsequent runs since
      // GOV.UK doesn't expose a stable per-publication ID. We surface
      // the first such error and stop the batch loop.
      console.error(`[revolving-door] insert error at batch ${i}:`, error.message || error);
      return inserted;
    }
    inserted += batch.length;
    await sleep(DELAY_MS);
  }
  return inserted;
}

async function main() {
  console.log('[revolving-door] fetching ACOBA publications from GOV.UK…');
  const rows = await fetchAll();
  console.log(`[revolving-door] parsed ${rows.length} case-decision titles`);
  if (rows.length === 0) { console.log('Nothing to insert.'); return; }
  console.log('[revolving-door] sample row:', JSON.stringify(rows[0]));
  const n = await insertBatched(rows);
  console.log(`[revolving-door] inserted ${n} rows`);
}

main().catch((e) => { console.error('[revolving-door] fatal:', e?.message || e); process.exit(0); });
