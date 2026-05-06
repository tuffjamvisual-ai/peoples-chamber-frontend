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
const ws = require('ws');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Cover the full current government period (Labour, July 2024 onwards)
const FROM_DATE = '2024-07-04';

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

// Match an org-name leading token; used to find the role/org boundary
// inside a comma-joined string when there's no explicit "at" separator.
// Token list covers the common starting words of UK central-gov bodies
// (Home Office, Treasury, Crown Prosecution Service, National Audit Office,
// Government Legal Department, etc.) plus the obvious leaders.
const ORG_LEAD = /^(the\b|Department\b|Ministry\b|Office\b|Cabinet\b|Foreign\b|HM\b|His Majesty\b|Her Majesty\b|Home\b|Treasury\b|Crown\b|National\b|Government\b)/i;

// "<role-text> at <org-text>" — the org-text must itself start with a
// known org leader, otherwise we'd snap on the first preposition.
const AT_SPLIT = /^(.*?)\s+at\s+((?:the|Department|Ministry|Office|Cabinet|Foreign|HM|His Majesty|Her Majesty|Home|Treasury|Crown|National|Government)\b.+)$/i;

function splitRoleAndOrg(joined) {
  const t = String(joined || '').trim();
  if (!t) return { previous_role: null, organisation: null };

  // 1. Prefer the explicit "<role> at <org>" form when present
  const atMatch = t.match(AT_SPLIT);
  if (atMatch) {
    return { previous_role: atMatch[1].trim(), organisation: atMatch[2].trim() };
  }

  // 2. Comma-split, then find the first segment that LOOKS like the start
  //    of an organisation name (preserves multi-comma org names like
  //    "the Foreign, Commonwealth and Development Office").
  const segs = t.split(',').map(s => s.trim()).filter(Boolean);
  if (segs.length < 2) return { previous_role: t, organisation: null };
  for (let i = 1; i < segs.length; i++) {
    if (ORG_LEAD.test(segs[i])) {
      return {
        previous_role: segs.slice(0, i).join(', '),
        organisation: segs.slice(i).join(', '),
      };
    }
  }

  // 3. No org-leader marker found anywhere: keep the entire string as the
  //    role and leave organisation null. Avoids the Tariq-Ahmad case
  //    where multi-comma role titles (e.g. ministerial portfolios spanning
  //    several geographic regions) get a tail segment misclassified as an
  //    organisation. Better null than wrong.
  return { previous_role: t, organisation: null };
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

  // Remaining segments collectively describe the role + organisation.
  const joined = parts.join(' - ').trim();
  const { previous_role, organisation } = splitRoleAndOrg(joined);

  return { person_name, previous_role: previous_role || null, organisation: organisation || null };
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
      const pubDate = r.public_timestamp ? r.public_timestamp.slice(0, 10) : null;
      if (pubDate && pubDate < FROM_DATE) continue;
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
    const { error } = await supabase.from('revolving_door').upsert(batch, { onConflict: 'person_name,previous_role,approval_date', ignoreDuplicates: true });
    if (error) {
      // Duplicate-key conflicts are expected on re-runs; log and continue
      // rather than stopping so all new batches are still processed.
      console.warn(`[revolving-door] insert warning at batch ${i} (skipped):`, error.message || error);
    } else {
      inserted += batch.length;
    }
    await sleep(DELAY_MS);
  }
  return inserted;
}

async function main() {
  console.log(`[revolving-door] fetching ACOBA publications from GOV.UK (${FROM_DATE} onwards)…`);
  const rows = await fetchAll();
  console.log(`[revolving-door] parsed ${rows.length} case-decision titles`);
  if (rows.length === 0) { console.log('Nothing to insert.'); return; }
  const dates = rows.map(r => r.approval_date).filter(Boolean).sort();
  console.log(`[revolving-door] date range: ${dates[0]} → ${dates[dates.length - 1]}`);
  console.log('[revolving-door] sample row:', JSON.stringify(rows[0]));
  const n = await insertBatched(rows);
  console.log(`[revolving-door] inserted ${n} rows`);
}

main().catch((e) => { console.error('[revolving-door] fatal:', e?.message || e); process.exit(0); });
