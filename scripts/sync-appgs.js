// Sync the Register of All-Party Parliamentary Groups (APPGs) from
// publications.parliament.uk.
//
// The site is Cloudflare-protected; plain curl gets 403. Same pattern as
// the committee-proceedings scraper: fresh browser context per request +
// generous delays bypass the challenge most of the time.
//
// Two phases:
//   1. Find the latest register edition. The 2026-year landing page on
//      parliament.uk lists "HTML Version" links for each register
//      revision; we pick the most recent.
//   2. Open contents.htm to harvest per-APPG .htm slugs, then visit each
//      slug page and parse Title / Purpose / Category / Officers / Funders.
//
// Resume support: progress (slugs done, parsed rows) is written to
// /tmp/appg-progress.json on every save so a re-run picks up where the
// last left off. Delete the file to start fresh.
const fs = require('fs');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const SUPABASE_URL = 'https://nwnsvnbudmfkhhwcjwwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36';
const REQUEST_DELAY_MS = 6000;
const SETTLE_MS = 7000;
const PROGRESS_FILE = '/tmp/appg-progress.json';

const REGISTERS_URL = (year) =>
  `https://www.parliament.uk/mps-lords-and-offices/standards-and-financial-interests/parliamentary-commissioner-for-standards/registers-of-interests/register-of-all-party-party-parliamentary-groups/registers-published-in-${year}/`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { contentsUrl: null, slugs: null, rows: [], doneSlugs: [] };
  }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function freshContext(browser) {
  return browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    locale: 'en-GB',
  });
}

async function fetchPage(browser, url, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    let ctx;
    try {
      ctx = await freshContext(browser);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(SETTLE_MS);
      const result = await page.evaluate(() => {
        const main = document.querySelector('#shellcontent, #content, main') || document.body;
        const inner = main.innerHTML;
        const text = main.innerText;
        const isCfChallenge = /Performing security verification|Just a moment|Verifying you are human/i.test(text);
        const linksAbs = Array.from(main.querySelectorAll('a[href]')).map((a) => ({
          href: a.href,
          rawHref: a.getAttribute('href') || '',
          text: (a.textContent || '').trim(),
        }));
        return { inner, text, isCfChallenge, linksAbs };
      });
      await ctx.close();
      if (!result.isCfChallenge) return result;
      console.warn(`[appgs] CF challenge for ${url} (attempt ${i + 1})`);
    } catch (e) {
      console.warn(`[appgs] fetch error ${url}: ${e.message}`);
      if (ctx) try { await ctx.close(); } catch {}
    }
    await sleep(REQUEST_DELAY_MS * 2);
  }
  return null;
}

async function discoverContentsUrl(browser) {
  const year = new Date().getFullYear();
  for (const y of [year, year - 1]) {
    const data = await fetchPage(browser, REGISTERS_URL(y));
    if (!data) continue;
    const link = data.linksAbs.find((l) => /HTML Version/i.test(l.text) && /publications\.parliament\.uk\/.+\/contents\.htm$/.test(l.href));
    if (link) return link.href;
  }
  return null;
}

async function harvestSlugs(browser, contentsUrl) {
  const data = await fetchPage(browser, contentsUrl);
  if (!data) throw new Error('contents.htm fetch failed');
  const slugs = [];
  const seen = new Set();
  for (const l of data.linksAbs) {
    if (!l.rawHref || /^http/i.test(l.rawHref)) continue;
    if (!/\.htm$/i.test(l.rawHref)) continue;
    if (/^introduction\.htm$/i.test(l.rawHref)) continue;
    if (/contents\.htm$/i.test(l.rawHref)) continue;
    if (seen.has(l.rawHref)) continue;
    seen.add(l.rawHref);
    slugs.push({ slug: l.rawHref, displayName: l.text });
  }
  return slugs;
}

function decodeText(s) {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(s) {
  return decodeText(String(s).replace(/<[^>]+>/g, ''));
}

function parseAppgPage(_text, html) {
  // The page is a sequence of <table class="basicTable"> blocks. Each table
  // is either 2-column (label/value rows like Title/Purpose/Category) or
  // 3-column (Officers Role/Name/Party). The Benefits in kind / Income
  // tables follow the same structure with their own first-cell title.
  const result = { appg_name: null, category: null, chair: null, officers: null, funders: null, purpose: null };
  const officers = [];
  const fundersLines = [];

  const tables = [...html.matchAll(/<table[^>]*class="basicTable"[^>]*>([\s\S]*?)<\/table>/g)];
  for (const t of tables) {
    const trs = [...t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
    const rows = trs.map((tr) =>
      [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripTags(c[1]))
    );
    if (rows.length === 0) continue;

    // 2-column key/value rows for Title/Purpose/Category etc.
    for (const row of rows) {
      if (row.length === 2) {
        const [label, value] = row;
        if (!value) continue;
        if (/^Title$/i.test(label)) result.appg_name = value;
        else if (/^Purpose$/i.test(label)) result.purpose = value;
        else if (/^Category$/i.test(label)) result.category = value;
      }
    }

    // 3-column rows under an Officers header.
    const firstCellOfFirstRow = rows[0][0] || '';
    if (/^Officers$/i.test(firstCellOfFirstRow)) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;
        const [role, name, party] = row;
        if (/^Role$/i.test(role) && /^Name$/i.test(name)) continue;
        if (!name) continue;
        officers.push({ role, name, party });
        if (!result.chair && /chair/i.test(role)) result.chair = name;
      }
    }

    // Benefits / Subscriptions tables.
    if (/Benefits|Registrable\s+benefits|Subscriptions|Income and Expenditure|received by the group/i.test(firstCellOfFirstRow)) {
      const tableLines = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (row.length === 0) continue;
        // Drop sub-header / column-header rows.
        if (row.every((c) => /^(source|value|value\s*£?s?|received|registered|date|amount|donor|sponsor|financial benefits|benefits in kind)$/i.test(c))) continue;
        if (row.length === 1 && /^(financial benefits|benefits in kind|other|donations|sponsorship)$/i.test(row[0])) continue;
        tableLines.push(row.join(' | '));
      }
      if (tableLines.length) {
        fundersLines.push(`${firstCellOfFirstRow}:`);
        fundersLines.push(...tableLines);
      }
    }
  }

  result.officers = officers.length
    ? officers.map((o) => `${o.role}: ${o.name}${o.party ? ` (${o.party})` : ''}`).join('\n')
    : null;
  result.funders = fundersLines.length ? fundersLines.join('\n').slice(0, 4000) : null;
  return result;
}

async function main() {
  const progress = loadProgress();
  const browser = await chromium.launch({ headless: true });

  try {
    if (!progress.contentsUrl) {
      console.log('[appgs] discovering latest register edition…');
      progress.contentsUrl = await discoverContentsUrl(browser);
      if (!progress.contentsUrl) throw new Error('could not discover contents.htm — Cloudflare blocked the listing page');
      saveProgress(progress);
    }
    console.log(`[appgs] using contents URL: ${progress.contentsUrl}`);

    if (!progress.slugs) {
      console.log('[appgs] harvesting APPG slugs…');
      progress.slugs = await harvestSlugs(browser, progress.contentsUrl);
      saveProgress(progress);
    }
    console.log(`[appgs] ${progress.slugs.length} APPG pages to fetch (${progress.doneSlugs.length} already done)`);

    const baseDir = progress.contentsUrl.replace(/contents\.htm$/, '');
    const doneSet = new Set(progress.doneSlugs);

    for (let i = 0; i < progress.slugs.length; i++) {
      const { slug, displayName } = progress.slugs[i];
      if (doneSet.has(slug)) continue;
      const url = baseDir + slug;
      const data = await fetchPage(browser, url);
      if (!data) {
        console.warn(`  [${i + 1}/${progress.slugs.length}] ${displayName} (${slug}): fetch failed — leaving for next run`);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }
      const parsed = parseAppgPage(data.text, data.inner);
      if (parsed.appg_name) {
        progress.rows.push(parsed);
      } else {
        console.warn(`  [${i + 1}/${progress.slugs.length}] ${displayName} (${slug}): no title parsed`);
      }
      progress.doneSlugs.push(slug);
      doneSet.add(slug);

      if (i % 10 === 0 || i === progress.slugs.length - 1) {
        console.log(`  [${i + 1}/${progress.slugs.length}] ${parsed.appg_name || displayName} — chair=${parsed.chair || '?'}, officers=${parsed.officers ? parsed.officers.split('\n').length : 0}, funders=${parsed.funders ? 'yes' : 'no'}`);
        saveProgress(progress);
      }
      await sleep(REQUEST_DELAY_MS);
    }
    saveProgress(progress);
  } finally {
    await browser.close();
  }

  if (!progress.rows.length) {
    console.log('[appgs] no rows produced.');
    return;
  }

  console.log(`[appgs] wiping appg_register…`);
  const { error: delErr } = await supabase.from('appg_register').delete().not('id', 'is', null);
  if (delErr) {
    console.error('[appgs] wipe error:', delErr.message || delErr);
    return;
  }

  const BATCH = 250;
  let inserted = 0;
  for (let i = 0; i < progress.rows.length; i += BATCH) {
    const batch = progress.rows.slice(i, i + BATCH);
    const { error } = await supabase.from('appg_register').insert(batch);
    if (error) {
      console.error(`[appgs] insert batch ${i} error:`, error.message || error);
      break;
    }
    inserted += batch.length;
    console.log(`[appgs] inserted ${inserted}/${progress.rows.length}`);
    await sleep(150);
  }
  console.log('[appgs] done.');
}

main().catch((e) => { console.error('[appgs] fatal:', e?.message || e); process.exit(0); });
