// Sync the Register of Consultant Lobbyists from the Office of the Registrar.
//
// The website at https://orcl.my.site.com/CLR_Search is a Salesforce
// Visualforce page. Two-phase scrape:
//
// Phase 1 (Playwright): paginate the listing to harvest all 290 (firm_name,
// profile_id) tuples. Salesforce ViewState postback prevents direct page=N
// URL access, so we click "Next Page" through the listing.
//
// Phase 2 (plain curl): fetch each profile page. Profile HTML is server
// rendered and parses cleanly with regex — h1 for firm_name, "Registered
// since" for date, "Current client list (X to Y YYYY)" for the quarter,
// the table that follows for clients, and the conduct heading for code_of_
// conduct status. Profile pages cap the client table at 20 rows; for firms
// with more current clients we re-open the profile in Playwright and click
// "Next clients" until exhausted.
//
// Output: one row per (firm, current-quarter client). Firms with zero
// current clients still get one row with client_name=null so registration
// coverage is preserved.
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEARCH_URL = 'https://orcl.my.site.com/CLR_Search';
const PROFILE_URL = (id) => `https://orcl.my.site.com/CLR_Public_Profile?id=${id}`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36';
const FETCH_DELAY_MS = 400;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function parseUkDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${day}`;
}

function decode(s) {
  if (s == null) return null;
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseProfileHtml(html) {
  const h1 = html.match(/<h1 class="page-header">([^<]+)<\/h1>/);
  const firmName = h1 ? decode(h1[1]) : null;

  const reg = html.match(/Registered since<\/h3>\s*([^<\r\n]+)/);
  const registrationDate = reg ? parseUkDate(decode(reg[1])) : null;

  const quarterMatch = html.match(/Current client list \(([^)]+)\)/);
  const quarter = quarterMatch ? decode(quarterMatch[1]) : null;

  const cocMatch = html.match(/comply with a relevant code of conduct\?<\/h4>\s*([^<\r\n]+)/);
  const codeOfConduct = cocMatch ? decode(cocMatch[1]) : null;

  // Slice between "Current client list" heading and "Previous client lists"
  // to scope the client-row regex. The clients table is split into two
  // half-tables (clientsTableLeft and clientsTableRight) and the first <td>
  // in each half is wrapped in nested <span>s, so we strip inner tags.
  const i = html.indexOf('Current client list');
  const end = html.indexOf('Previous client lists', i);
  const section = i !== -1 && end !== -1 ? html.slice(i, end) : '';
  const tdMatches = [...section.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
  const clients = tdMatches
    .map((m) => decode(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')))
    .filter((s) => s && s.length > 0);

  const totalMatch = section.match(/Displaying \d+-\d+ of (\d+)/);
  const totalClients = totalMatch ? Number(totalMatch[1]) : clients.length;

  return { firmName, registrationDate, quarter, codeOfConduct, clients, totalClients };
}

async function fetchProfileHtml(profileId) {
  const res = await fetch(PROFILE_URL(profileId), { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) throw new Error(`profile ${profileId} HTTP ${res.status}`);
  return res.text();
}

// ---------- Phase 1: listing harvest via Playwright ----------

async function harvestListing(browser) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(SEARCH_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const out = [];
  const seen = new Set();
  const MAX_PAGES = 12; // safety cap

  for (let i = 0; i < MAX_PAGES; i++) {
    const pageData = await page.evaluate(() => {
      const rows = [];
      document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const m = href.match(/CLR_Public_Profile\?id=([A-Za-z0-9]+)/);
        if (!m) return;
        const text = (a.textContent || '').trim();
        const profileMatch = text.match(/^See Profile for (.+?)\.\.\.?$/);
        const firmName = profileMatch ? profileMatch[1].trim() : null;
        rows.push({ profileId: m[1], firmNameFromLink: firmName });
      });
      const range = document.body.innerText.match(/Displaying (\d+)-(\d+) of (\d+)/);
      return { rows, range: range ? { from: +range[1], to: +range[2], total: +range[3] } : null };
    });

    let added = 0;
    for (const r of pageData.rows) {
      if (seen.has(r.profileId)) continue;
      seen.add(r.profileId);
      out.push(r);
      added++;
    }
    console.log(`[lobbyist-register] listing page ${i + 1}: +${added} new (cumulative ${out.length}, page range=${pageData.range ? `${pageData.range.from}-${pageData.range.to}/${pageData.range.total}` : '?'})`);
    if (!pageData.range || pageData.range.to >= pageData.range.total) break;

    const nextBtn = page.getByRole('link', { name: /^Next Page$/i }).first();
    try {
      await nextBtn.click({ timeout: 5000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      console.warn(`[lobbyist-register] Next Page click failed at page ${i + 1}:`, e.message);
      break;
    }
  }
  await ctx.close();
  return out;
}

// ---------- Phase 2b: paginated clients via Playwright ----------

async function readClientPage(page) {
  return page.evaluate(() => {
    const html = document.body.innerHTML;
    const i0 = html.indexOf('Current client list');
    const i1 = html.indexOf('Previous client lists', i0);
    const section = i0 !== -1 && i1 !== -1 ? html.slice(i0, i1) : '';
    const matches = [...section.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const clients = matches.map((m) => decode(m[1])).filter(Boolean);
    const pager = section.match(/Displaying (\d+)-(\d+) of (\d+)/);
    return {
      clients,
      from: pager ? Number(pager[1]) : null,
      to: pager ? Number(pager[2]) : null,
      total: pager ? Number(pager[3]) : null,
    };
  });
}

async function fetchPaginatedClients(browser, profileId, totalClients) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(PROFILE_URL(profileId), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const collected = new Set();
  const MAX_LOOPS = 30;

  for (let i = 0; i < MAX_LOOPS; i++) {
    const before = await readClientPage(page);
    for (const c of before.clients) collected.add(c);

    // Stop if pager shows we've consumed the full range, or we've collected
    // enough unique clients.
    if (before.to != null && before.total != null && before.to >= before.total) break;
    if (collected.size >= totalClients) break;

    // Locate by id-suffix or text — Salesforce gives this link a stable
    // `clientsForm:j_idNNN` id pattern. Try multiple selectors.
    const nextLocator = page.locator('a:visible', { hasText: /^Next clients$/ }).first();
    let clicked = false;
    try {
      await nextLocator.scrollIntoViewIfNeeded({ timeout: 2000 });
      await nextLocator.click({ timeout: 6000 });
      clicked = true;
    } catch (e) {
      console.warn(`  [${profileId}] Next clients click failed at loop ${i}: ${e.message.split('\n')[0]}`);
      break;
    }

    // Wait for the pager's "from" cursor to move forward (signals AJAX postback completed).
    if (clicked) {
      try {
        await page.waitForFunction((prevFrom) => {
          const html = document.body.innerHTML;
          const i0 = html.indexOf('Current client list');
          const i1 = html.indexOf('Previous client lists', i0);
          const section = i0 !== -1 && i1 !== -1 ? html.slice(i0, i1) : '';
          const m = section.match(/Displaying (\d+)-(\d+) of (\d+)/);
          return m && Number(m[1]) > prevFrom;
        }, before.from || 0, { timeout: 10000 });
      } catch (e) {
        console.warn(`  [${profileId}] pager didn't advance after click at loop ${i}`);
        break;
      }
    }
  }
  await ctx.close();
  return [...collected];
}

// ---------- Main ----------

async function main() {
  console.log('[lobbyist-register] launching Playwright…');
  const browser = await chromium.launch({ headless: true });

  console.log('[lobbyist-register] phase 1: harvesting listing IDs…');
  const listing = await harvestListing(browser);
  console.log(`[lobbyist-register] harvested ${listing.length} firm IDs`);
  if (listing.length === 0) {
    await browser.close();
    return;
  }

  console.log('[lobbyist-register] phase 2: fetching profile pages…');
  const rows = [];
  let truncated = 0;
  for (let i = 0; i < listing.length; i++) {
    const { profileId } = listing[i];
    let parsed;
    try {
      const html = await fetchProfileHtml(profileId);
      parsed = parseProfileHtml(html);
    } catch (e) {
      console.warn(`[${i + 1}/${listing.length}] ${profileId} fetch failed: ${e.message}`);
      await sleep(FETCH_DELAY_MS);
      continue;
    }

    let clients = parsed.clients;
    // Profile pages cap at 20 visible clients per response. Only paginate
    // when we hit that cap *and* the API says there are more — otherwise a
    // mismatch reflects a parser miss, which a re-render won't fix.
    if (clients.length >= 20 && parsed.totalClients > clients.length) {
      truncated++;
      console.log(`  [${i + 1}/${listing.length}] ${parsed.firmName}: ${clients.length}/${parsed.totalClients} clients — paginating via Playwright…`);
      try {
        const all = await fetchPaginatedClients(browser, profileId, parsed.totalClients);
        if (all.length > clients.length) clients = all;
      } catch (e) {
        console.warn(`  [${profileId}] pagination failed: ${e.message}`);
      }
    } else if (parsed.totalClients > clients.length) {
      console.warn(`  [${i + 1}/${listing.length}] ${parsed.firmName}: parser missed ${parsed.totalClients - clients.length} client(s) (got ${clients.length}/${parsed.totalClients})`);
    }

    if (i % 25 === 0 || i === listing.length - 1) {
      console.log(`  [${i + 1}/${listing.length}] ${parsed.firmName} — ${clients.length} clients, q="${parsed.quarter}", coc=${parsed.codeOfConduct}`);
    }

    if (clients.length === 0) {
      rows.push({
        firm_name: parsed.firmName,
        client_name: null,
        registration_date: parsed.registrationDate,
        code_of_conduct: parsed.codeOfConduct,
        quarter: parsed.quarter,
      });
    } else {
      for (const c of clients) {
        rows.push({
          firm_name: parsed.firmName,
          client_name: c,
          registration_date: parsed.registrationDate,
          code_of_conduct: parsed.codeOfConduct,
          quarter: parsed.quarter,
        });
      }
    }
    await sleep(FETCH_DELAY_MS);
  }

  await browser.close();
  console.log(`[lobbyist-register] built ${rows.length} rows (${truncated} firms required pagination)`);
  if (rows.length === 0) return;

  console.log('[lobbyist-register] wiping table…');
  // Delete all existing rows. .delete() requires a filter — id is non-null.
  const { error: delErr } = await supabase.from('lobbyist_register').delete().not('id', 'is', null);
  if (delErr) {
    console.error('[lobbyist-register] wipe error:', delErr.message || delErr);
    return;
  }

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('lobbyist_register').insert(batch);
    if (error) {
      console.error(`[lobbyist-register] insert batch ${i}/${rows.length} error:`, error.message || error);
      break;
    }
    inserted += batch.length;
    console.log(`[lobbyist-register] inserted ${inserted}/${rows.length}`);
    await sleep(150);
  }
  console.log('[lobbyist-register] done.');
}

main().catch((e) => { console.error('[lobbyist-register] fatal:', e?.message || e); process.exit(0); });
