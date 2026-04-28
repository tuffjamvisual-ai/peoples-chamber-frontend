// Sync awarded UK government contracts from the Find-a-Tender OCDS feed.
// Replaces the broken Contracts Finder handler URL — find-tender.service.gov.uk
// hosts the modern OCDS-format JSON API (documented at /apidocumentation).
//
// We pull a rolling 30-day window of release updates (paginated via
// `nextCursor`) and emit one row per AWARD inside each release — releases
// still in the tender stage (no awards array) are skipped because the
// table represents awarded contracts.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const API = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages';
const LIMIT = 100;
const MAX_PAGES = 30;        // safety cap — up to 3,000 release packages
const WINDOW_DAYS = 30;      // pull rolling last-30-days window

function kebab(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isoMinusDays(days) {
  const d = new Date(Date.now() - days * 86_400_000);
  // API expects YYYY-MM-DDTHH:MM:SS (no fractional, no Z)
  return d.toISOString().replace(/\.\d{3}Z$/, '');
}

function buyerOf(release) {
  if (release?.buyer?.name) return release.buyer.name;
  const parties = Array.isArray(release?.parties) ? release.parties : [];
  const b = parties.find((p) => Array.isArray(p.roles) && p.roles.includes('buyer'));
  return b?.name || null;
}

function rowsFromRelease(r) {
  const buyer = buyerOf(r);
  const tender = r.tender || {};
  const awards = Array.isArray(r.awards) ? r.awards : [];
  const contracts = Array.isArray(r.contracts) ? r.contracts : [];
  const releaseDate = r.date ? String(r.date).slice(0, 10) : null;
  const out = [];

  // UK gov OCDS keeps value + dateSigned on `contracts[]`. Iterate
  // contracts and join to awards via `contract.awardID == award.id`
  // for the supplier. Fall back to award-only iteration when no
  // contracts[] are present.
  if (contracts.length > 0) {
    for (const c of contracts) {
      const award = awards.find((a) => a.id != null && String(a.id) === String(c.awardID));
      const supplier = award?.suppliers?.[0]?.name || null;
      const amount = (c.value && typeof c.value.amount === 'number')
        ? c.value.amount
        : (tender.value && typeof tender.value.amount === 'number' ? tender.value.amount : null);
      out.push({
        dept_slug: kebab(buyer),
        title: tender.title || null,
        supplier,
        value: amount,
        awarded_date: c.dateSigned ? String(c.dateSigned).slice(0, 10) : releaseDate,
        status: c.status || award?.status || tender.status || null,
        description: tender.description || null,
      });
    }
  } else if (awards.length > 0) {
    for (const aw of awards) {
      const supplier = aw?.suppliers?.[0]?.name || null;
      const amount = (aw.value && typeof aw.value.amount === 'number')
        ? aw.value.amount
        : (tender.value && typeof tender.value.amount === 'number' ? tender.value.amount : null);
      out.push({
        dept_slug: kebab(buyer),
        title: tender.title || aw.title || null,
        supplier,
        value: amount,
        awarded_date: aw.date ? String(aw.date).slice(0, 10) : releaseDate,
        status: aw.status || tender.status || null,
        description: tender.description || aw.description || null,
      });
    }
  }
  return out;
}

async function fetchPage(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    return { error: `fetch threw: ${e.message}` };
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { error: `JSON parse failed at byte ${text.length}: ${e.message}` };
  }
  return { data };
}

async function insertBatch(rows) {
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('government_contracts').insert(rows);
  if (error) {
    console.error(`[contracts] insert error: ${error.message || error}`);
    return 0;
  }
  return rows.length;
}

async function main() {
  console.log('[contracts] fetching from Find-a-Tender OCDS API…');
  const firstParams = new URLSearchParams({
    updatedFrom: isoMinusDays(WINDOW_DAYS),
    limit: String(LIMIT),
  });
  let url = `${API}?${firstParams.toString()}`;
  let totalReleases = 0;
  let totalInserted = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await fetchPage(url);
    if (error) {
      console.error(`[contracts] page ${page} ${error} — stopping pagination, keeping prior progress`);
      break;
    }
    const releases = Array.isArray(data.releases) ? data.releases : [];
    if (releases.length === 0) break;
    totalReleases += releases.length;

    const rows = releases.flatMap(rowsFromRelease);
    if (rows.length > 0) {
      if (page === 0) console.log('[contracts] sample row:', JSON.stringify(rows[0]));
      // Insert in batches of 100 to keep payload sizes reasonable
      for (let i = 0; i < rows.length; i += 100) {
        totalInserted += await insertBatch(rows.slice(i, i + 100));
      }
    }

    const next = data?.links?.next;
    if (!next) break;
    url = next;
    await sleep(DELAY_MS);
  }

  console.log(`[contracts] scanned ${totalReleases} release packages, inserted ${totalInserted} rows`);
}

main().catch((e) => { console.error('[contracts] fatal:', e?.message || e); process.exit(0); });
