// Sync awarded government contracts from Contracts Finder.
// Note: the public site's search page is a server-rendered HTML view; the
// JSON handler at /Published/Notices/PublicUI/Handler/PublicNoticeSearch is
// a POST endpoint that historically required a session/CSRF token and
// returned HTML fragments. We try a JSON-friendly variant first; if that
// fails we leave the table untouched and surface the error so the source
// can be revisited rather than silently inserting bad data.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const HANDLER_URL = 'https://www.contractsfinder.service.gov.uk/Published/Notices/PublicUI/Handler/PublicNoticeSearch';

async function fetchAwarded() {
  const body = new URLSearchParams({
    NoticeStatuses: 'Awarded',
    PublishedFrom: '',
    PublishedTo: '',
    PageSize: '100',
    PageNumber: '1',
  });
  const res = await fetch(HANDLER_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  });
  if (!res.ok) throw new Error(`Contracts Finder handler ${res.status}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('handler returned non-JSON (likely HTML/CSRF page)'); }
  return data;
}

function mapItem(it) {
  return {
    notice_id: it.Id ?? it.NoticeId ?? null,
    title: it.Title ?? null,
    organisation: it.OrganisationName ?? it.Organisation ?? null,
    description: it.Description ?? null,
    value_low: it.ValueLow ?? it.LowValue ?? null,
    value_high: it.ValueHigh ?? it.HighValue ?? null,
    awarded_date: it.AwardedDate ? String(it.AwardedDate).slice(0, 10) : null,
    closing_date: it.ClosingDate ? String(it.ClosingDate).slice(0, 10) : null,
    cpv_codes: Array.isArray(it.CpvCodes) ? it.CpvCodes.join(', ') : (it.CpvCodes ?? null),
    region: it.Region ?? null,
  };
}

async function main() {
  console.log('[government-contracts] fetching from Contracts Finder handler…');
  let rows = [];
  try {
    const data = await fetchAwarded();
    const items = data.Notices || data.Results || data.Items || data.notices || [];
    rows = items.map(mapItem).filter((r) => r.notice_id || r.title);
  } catch (e) {
    console.error('[government-contracts] fetch failed:', e.message || e);
    return;
  }
  console.log(`[government-contracts] fetched ${rows.length} contracts`);
  if (rows.length === 0) { console.log('Nothing to upsert.'); return; }
  const { error } = await supabase
    .from('government_contracts')
    .upsert(rows, { onConflict: 'notice_id' });
  if (error) {
    console.error('[government-contracts] upsert error:', error.message || error);
  } else {
    console.log(`[government-contracts] upsert ok (${rows.length} rows)`);
  }
}

main().catch((e) => { console.error('[government-contracts] fatal:', e?.message || e); process.exit(0); });
