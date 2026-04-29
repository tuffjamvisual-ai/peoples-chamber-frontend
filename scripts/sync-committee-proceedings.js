// Scrape recent UK Parliamentary committee publications (Oral Evidence,
// Written Evidence, Reports) from committees.parliament.uk.
//
// Why headless rather than fetch(): the site sits behind a Cloudflare
// JS challenge that returns 403 to plain HTTP clients. Running a real
// Chromium via Playwright passes the challenge most of the time. There
// is no guarantee — Cloudflare can still serve the challenge page if
// it detects automation, especially on cloud-IP ranges.
//
// Outputs upserts into Supabase table `committee_proceedings` keyed by
// the publication URL. Re-runs are idempotent.
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Real listing URL — `/work/publications/` 404s, the actual path is
// `/publications/`. The page lists the latest 4 of each publication
// type unfiltered (~20 cards by default) — good for our recency view.
const TARGET = 'https://committees.parliament.uk/publications/';
const REALISTIC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

function parseUkDate(s) {
  if (!s) return null;
  const trimmed = String(s).trim();
  // dd Month yyyy or dd Mon yyyy
  const m = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthIdx = months.findIndex((mm) => mm.startsWith(m[2].toLowerCase()));
    if (monthIdx === -1) return null;
    const yyyy = m[3];
    const mm = String(monthIdx + 1).padStart(2, '0');
    const dd = String(parseInt(m[1], 10)).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      userAgent: REALISTIC_UA,
      viewport: { width: 1280, height: 800 },
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page = await ctx.newPage();
    console.log(`[committee] navigating to ${TARGET}`);
    const response = await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    console.log(`[committee] initial status: ${response?.status()}`);

    // Wait for the publication cards to render. The site is fast and
    // server-rendered, so a short timeout is fine.
    try {
      await page.waitForSelector('.card-publication', { timeout: 30_000 });
    } catch {
      const url = page.url();
      const title = await page.title();
      const bodyPreview = (await page.locator('body').innerText().catch(() => '')).slice(0, 200);
      console.error(`[committee] selector wait failed.`);
      console.error(`  current url:   ${url}`);
      console.error(`  page title:    ${title}`);
      console.error(`  body preview:  ${bodyPreview.replace(/\n/g, ' ')}`);
      return [];
    }
    await page.waitForTimeout(1000);

    // Extract using the real Parliament card structure:
    //   .primary-info               — title (often paragraph-length)
    //   .list .item                 — "Committees" label + name
    //   .indicator-label time       — datetime attribute (ISO date)
    //   .dropdown-menu a[target=_blank]
    //                               — direct HTML / PDF download links
    const items = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.card-publication').forEach((card) => {
        const titleEl = card.querySelector('.primary-info');
        const fullText = titleEl ? (titleEl.textContent || '').trim().replace(/\s+/g, ' ') : '';

        // Most cards encode "Short Title - Long description" in the
        // primary-info string. Split on the first " - " to give us a
        // clean title + summary pair. If there's no dash, the whole
        // thing is the title and summary stays null.
        let title = fullText;
        let summary = null;
        const dashIdx = fullText.indexOf(' - ');
        if (dashIdx > 0 && dashIdx < 80) {
          title = fullText.slice(0, dashIdx).trim();
          summary = fullText.slice(dashIdx + 3).trim();
        }

        // Prefer the HTML link over PDF — readable in the user's browser.
        const links = Array.from(card.querySelectorAll('.dropdown-menu a[href]'));
        const htmlLink = links.find((a) => /\.htm[l]?$/i.test(a.href));
        const url = (htmlLink || links[0])?.href || null;

        // Committee name lives in a .list .item where the .label is
        // "Committees" — read the text minus the label.
        let committee = null;
        const items = card.querySelectorAll('.list .item');
        for (const it of items) {
          const label = it.querySelector('.label');
          if (label && /committee/i.test(label.textContent || '')) {
            committee = (it.textContent || '').replace(label.textContent || '', '').trim();
            break;
          }
        }

        const timeEl = card.querySelector('.indicator-label time, time[datetime]');
        const isoDate = timeEl ? timeEl.getAttribute('datetime') : null;

        out.push({ url, title, summary, committee, isoDate });
      });
      return out;
    });

    console.log(`[committee] extracted ${items.length} items`);
    return items;
  } finally {
    await browser.close();
  }
}

// Heuristic from the title text — reasonable since titles overwhelmingly
// start with "<Nth Report …>" / "Oral evidence …" / "Written evidence".
function classifyTitle(title) {
  const t = String(title || '').toLowerCase();
  if (/oral\s+evidence/.test(t)) return 'Oral Evidence';
  if (/written\s+evidence/.test(t)) return 'Written Evidence';
  if (/government\s+response/.test(t)) return 'Government Response';
  if (/special\s+report/.test(t)) return 'Special Report';
  if (/\breport\b/.test(t)) return 'Report';
  return null;
}

async function upsert(rows) {
  if (rows.length === 0) return 0;
  // Dedupe by URL within the batch — Supabase upsert errors with "ON
  // CONFLICT DO UPDATE command cannot affect row a second time" if the
  // same conflict-key appears twice in a single insert payload.
  const seen = new Set();
  const payload = [];
  for (const r of rows) {
    if (!r.url || !r.title) continue;
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    payload.push({
      committee_name: r.committee || null,
      title: r.title || null,
      publication_date: r.isoDate || null,
      publication_type: classifyTitle(r.title) || classifyTitle(r.summary),
      url: r.url,
      summary: r.summary || null,
      publication_url: r.url, // mirror — kept as a stable reference even if `url` semantics ever change
    });
  }
  if (payload.length === 0) return 0;
  const { error, count } = await supabase
    .from('committee_proceedings')
    .upsert(payload, { onConflict: 'url', count: 'exact' });
  if (error) {
    console.error(`[committee] upsert error: ${error.message || error}`);
    return 0;
  }
  return count ?? payload.length;
}

// ── Phase 2: per-publication full-content extraction ───────────────────
// For each row whose content_attempted is still false, navigate to the
// publication URL and try to extract the body text. publications.parliament.uk
// HTML pages wrap their report inside an iframe — we use Playwright's
// frames API to read it. PDFs are skipped (Playwright can't render them
// to text). content_attempted is set to true regardless of outcome so
// that later cron runs only target genuinely new rows.
async function extractFullContentFromUrl(page, url) {
  if (!url) return null;
  if (!/\.html?(?:[?#]|$)/i.test(url)) return null; // skip PDFs / direct downloads
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(3000); // give iframe time to populate
    // Try every frame attached to the page (excluding main) — for
    // publications.parliament.uk this is where the report HTML lives.
    for (const f of page.frames()) {
      if (f === page.mainFrame()) continue;
      try {
        await f.waitForLoadState('domcontentloaded', { timeout: 5000 });
        const txt = await f.evaluate(() => {
          const main = document.querySelector('main, article, #content, .content') || document.body;
          return (main.innerText || '').trim();
        });
        if (txt && txt.length > 500) return txt.slice(0, 100_000); // cap at 100KB
      } catch { /* try next frame */ }
    }
    // Fallback — main page body, in case the page is not iframe-based.
    const txt = await page.evaluate(() => {
      const main = document.querySelector('main, article, #content, .content');
      return main ? (main.innerText || '').trim() : '';
    });
    if (txt && txt.length > 500) return txt.slice(0, 100_000);
    return null;
  } catch {
    return null;
  }
}

async function runContentExtraction() {
  // Pick up rows where content_attempted is still false, regardless of
  // whether we wrote them in this run or a previous one.
  const { data: pending } = await supabase
    .from('committee_proceedings')
    .select('id, url')
    .eq('content_attempted', false)
    .limit(50);
  if (!pending || pending.length === 0) {
    console.log('[committee] no rows pending content extraction');
    return { attempted: 0, succeeded: 0 };
  }
  console.log(`[committee] starting content-extraction pass on ${pending.length} rows`);

  const browser = await chromium.launch({ headless: true });
  let attempted = 0, succeeded = 0;
  try {
    const ctx = await browser.newContext({
      userAgent: REALISTIC_UA,
      viewport: { width: 1280, height: 800 },
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page = await ctx.newPage();
    for (const row of pending) {
      attempted++;
      const content = await extractFullContentFromUrl(page, row.url);
      const { error } = await supabase
        .from('committee_proceedings')
        .update({ full_content: content, content_attempted: true })
        .eq('id', row.id);
      if (error) {
        console.error(`  row ${row.id} update error: ${error.message}`);
      } else if (content) {
        succeeded++;
        console.log(`  ✓ row ${row.id}: extracted ${content.length} chars`);
      } else {
        console.log(`  – row ${row.id}: no content extracted (PDF or iframe-blocked)`);
      }
    }
  } finally {
    await browser.close();
  }
  return { attempted, succeeded };
}

async function main() {
  const items = await scrape();
  if (items.length === 0) {
    console.log('[committee] nothing scraped — leaving table untouched');
  } else {
    console.log('[committee] sample items:');
    console.log(JSON.stringify(items.slice(0, 2), null, 2));
    const written = await upsert(items);
    console.log(`[committee] upserted ${written} rows`);
  }
  // Phase 2 — runs whether or not phase 1 wrote anything new, so a
  // partial earlier run still gets its content backfilled.
  const { attempted, succeeded } = await runContentExtraction();
  console.log(`[committee] content extraction: ${succeeded}/${attempted} succeeded`);
}

main().catch((e) => { console.error('[committee] fatal:', e?.message || e); process.exit(0); });
