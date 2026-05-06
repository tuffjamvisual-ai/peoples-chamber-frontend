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
const ws = require('ws');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bnN2bmJ1ZG1ma2hod2Nqd3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTkyNTUsImV4cCI6MjA4OTQzNTI1NX0.8PW8OHPr08zcXy-tGq0R9O04ZmKwt9twfnmagClDnuw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

// Real listing URL — `/work/publications/` 404s, the actual path is
// `/publications/`. The page lists the latest 4 of each publication
// type unfiltered (~20 cards by default) — good for our recency view.
const TARGET = 'https://committees.parliament.uk/publications/';
const REALISTIC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
// publications.parliament.uk publishes each report as a stack of HTML
// files: a Table-of-Contents page (the URL we get from the listing)
// links to chapter pages via <p class="ToC1"><a href="…">. Real text
// lives in `#shellcontent` on each page. Cloudflare 403s repeated
// navigations within a single browser context, so we open a FRESH
// context for every page and sleep 6 seconds between requests — that
// pattern reliably passes the challenge.
//
// PDFs and /default/ download URLs are skipped (set null, mark
// content_attempted=true so the row isn't retried indefinitely).
const REQUEST_DELAY_MS = 6000;
const MAX_CHAPTERS_PER_PUB = 8;
const CONTENT_CAP_CHARS = 100_000;

async function fetchShellContent(browser, url) {
  const ctx = await browser.newContext({ userAgent: REALISTIC_UA, locale: 'en-GB' });
  try {
    const page = await ctx.newPage();
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (!res || !res.ok()) return { content: '', tocLinks: [], status: res?.status() ?? 0 };
    await page.waitForTimeout(800);
    return await page.evaluate(() => {
      const sc = document.querySelector('#shellcontent');
      const content = sc ? (sc.innerText || '').trim() : '';
      const tocLinks = Array.from(document.querySelectorAll('p.ToC1 a, .ToC1 a'))
        .map((a) => a.href)
        .filter(Boolean);
      return { content, tocLinks, status: 200 };
    });
  } catch (e) {
    return { content: '', tocLinks: [], error: e.message };
  } finally {
    await ctx.close();
  }
}

async function extractFullContentFromUrl(browser, startUrl) {
  if (!startUrl) return null;
  if (!/\.html?(?:[?#]|$)/i.test(startUrl)) return null; // PDFs / /default/ wrappers — skip

  // 1. Fetch the ToC page itself
  const toc = await fetchShellContent(browser, startUrl);
  if (!toc.content && (!toc.tocLinks || toc.tocLinks.length === 0)) return null;

  let full = toc.content || '';
  const chapters = (toc.tocLinks || []).slice(0, MAX_CHAPTERS_PER_PUB);

  // 2. Follow each chapter link with a fresh context + 6s delay
  for (const chUrl of chapters) {
    if (full.length >= CONTENT_CAP_CHARS) break;
    await sleep(REQUEST_DELAY_MS);
    const ch = await fetchShellContent(browser, chUrl);
    if (ch.content) {
      const remaining = CONTENT_CAP_CHARS - full.length;
      full += '\n\n' + ch.content.slice(0, remaining);
    }
  }
  return full.length > 0 ? full : null;
}

async function runContentExtraction() {
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
  let attempted = 0, succeeded = 0, totalChars = 0;
  try {
    for (const row of pending) {
      attempted++;
      const content = await extractFullContentFromUrl(browser, row.url);
      const { error } = await supabase
        .from('committee_proceedings')
        .update({ full_content: content, content_attempted: true })
        .eq('id', row.id);
      if (error) {
        console.error(`  row ${row.id} update error: ${error.message}`);
      } else if (content) {
        succeeded++;
        totalChars += content.length;
        console.log(`  ✓ row ${row.id}: extracted ${content.length} chars`);
      } else {
        console.log(`  – row ${row.id}: no content extracted (PDF, blocked, or empty)`);
      }
      await sleep(REQUEST_DELAY_MS); // also pause between publications
    }
  } finally {
    await browser.close();
  }
  if (succeeded > 0) console.log(`[committee] avg extracted: ${Math.round(totalChars / succeeded).toLocaleString()} chars per success`);
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
