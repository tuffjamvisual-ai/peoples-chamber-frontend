// Mobile check (owner, 3 Nov 2026): loads each page at phone sizes (375x812 and 360x780) and at 1440x900 on a running
// site, with no cookie choice made (so the banner shows, as on a first visit), and records for each phone view:
//   horizontal scroll  how far the page is wider than the screen (0 is right)
//   text column        the width of the main content box, as a share of the screen width
//   tap targets        visible links, buttons and form controls under 44px tall, split into standalone controls and
//                      links inside running text (WCAG 2.5.8 treats inline links separately)
//   first screen       where the page heading sits, the banner's height and how much of the first screen is chrome
//   background         whether the desk backdrop image (folders.webp or folders-900.webp) was requested
// It saves a first screen screenshot of each view and a full page one at 375px.
//
//   node scripts/checks/mobile-check.mjs <base url> <out dir> <label>
//   node scripts/checks/mobile-check.mjs --compare <dir a> <dir b>     (desktop screenshots, pixel by pixel)
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const PAGES = ['/', '/mps/4874', '/editorials/alghyhvbbo', '/councils/nottingham', '/transparency/contracts', '/organisations/kpmg-llp', '/commission', '/lords', '/lords/100'];
const PHONES = [{ width: 375, height: 812 }, { width: 360, height: 780 }];
const DESKTOP = { width: 1440, height: 900 };
const slug = (p) => (p === '/' ? 'home' : p.slice(1).replace(/\//g, '_'));

async function measure(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[hidden], [aria-hidden="true"]'); };
    const content = document.querySelector('.dossier-content') || document.querySelector('main') || document.body;
    const cs = getComputedStyle(content);
    const colWidth = content.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const targets = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')].filter(visible);
    // A target's tap height: its box, its 44px tap layer (::after) where it has one, or for a checkbox or radio inside
    // a label, the label it is tapped through.
    const tapHeight = (el) => {
      let h = el.getBoundingClientRect().height;
      const after = getComputedStyle(el, '::after');
      if (after.content && after.content !== 'none' && after.position === 'absolute') h = Math.max(h, parseFloat(after.height) || 0);
      const label = el.closest('label');
      if (label && (el.type === 'checkbox' || el.type === 'radio')) h = Math.max(h, label.getBoundingClientRect().height);
      return h;
    };
    const small = targets.filter((el) => tapHeight(el) < 44);
    const inline = (el) => {
      if (el.tagName !== 'A') return false;
      const block = el.closest('p, li, td, dd, figcaption, blockquote');
      if (!block) return false;
      const own = (el.textContent || '').trim().length, all = (block.textContent || '').trim().length;
      return all > own + 15; // other text around it in the same block
    };
    const inlineSmall = small.filter(inline);
    const h1 = [...document.querySelectorAll('h1')].find(visible);
    const h1r = h1 ? h1.getBoundingClientRect() : null;
    const banner = document.querySelector('[data-cookie-banner], .cookie-banner, [aria-label*="ookie"]');
    const br = banner && visible(banner) ? banner.getBoundingClientRect() : null;
    const contentTop = content.getBoundingClientRect().top + parseFloat(cs.paddingTop);
    return {
      pageHeight: document.documentElement.scrollHeight,
      horizontalScroll: Math.max(0, document.documentElement.scrollWidth - vw),
      textColumnPct: Math.round((colWidth / vw) * 1000) / 10,
      tapTargets: targets.length,
      under44: small.length,
      under44Standalone: small.length - inlineSmall.length,
      under44Inline: inlineSmall.length,
      examplesStandalone: small.filter((e) => !inline(e)).slice(0, 6).map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(tapHeight(e))}px`),
      h1: h1 ? (h1.textContent || '').trim().slice(0, 60) : null,
      h1Top: h1r ? Math.round(h1r.top) : null,
      h1OnFirstScreen: h1r ? h1r.bottom <= vh : false,
      bannerHeight: br ? Math.round(br.height) : 0,
      bannerPosition: banner ? getComputedStyle(banner).position : null,
      contentTop: Math.round(contentTop),
    };
  });
}

async function run(base, outDir, label) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = {};
  for (const p of PAGES) {
    for (const vp of [...PHONES, DESKTOP]) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
      const page = await ctx.newPage();
      const backdrop = [];
      page.on('request', (req) => { if (/\/folders(-900)?\.webp/.test(req.url())) backdrop.push(req.url().replace(/^https?:\/\/[^/]+/, '')); });
      const res = await page.goto(base + p, { waitUntil: 'networkidle', timeout: 120000 }).catch((e) => ({ status: () => `error ${e.message}` }));
      const status = typeof res?.status === 'function' ? res.status() : null;
      await page.waitForTimeout(800);
      const key = `${slug(p)}@${vp.width}`;
      if (status !== 200) { results[key] = { status }; await ctx.close(); continue; }
      await page.screenshot({ path: path.join(outDir, `${label}-${key}-first-screen.png`) });
      if (vp.width === 375) await page.screenshot({ path: path.join(outDir, `${label}-${key}-full.png`), fullPage: true });
      results[key] = vp.width === DESKTOP.width ? { status, backgroundRequested: backdrop } : { status, ...(await measure(page)), backgroundRequested: backdrop };
      await ctx.close();
      console.log(key, JSON.stringify(results[key]));
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, `${label}-results.json`), JSON.stringify(results, null, 1));
}

async function compare(a, b) {
  for (const f of fs.readdirSync(a).filter((x) => x.includes('@1440') && x.endsWith('.png'))) {
    const twin = fs.readdirSync(b).find((x) => x.replace(/^[^-]+-/, '') === f.replace(/^[^-]+-/, ''));
    if (!twin) { console.log(f, 'no counterpart'); continue; }
    const [x, y] = await Promise.all([sharp(path.join(a, f)).raw().toBuffer({ resolveWithObject: true }), sharp(path.join(b, twin)).raw().toBuffer({ resolveWithObject: true })]);
    if (x.info.width !== y.info.width || x.info.height !== y.info.height) { console.log(f, 'size differs'); continue; }
    let diff = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let i = 0, px = 0; i < x.data.length; i += x.info.channels, px++) {
      if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2]) {
        diff++;
        const cx = px % x.info.width, cy = Math.floor(px / x.info.width);
        x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      }
    }
    // Where they differ: the box around every differing pixel (left, top to right, bottom).
    const box = diff ? ` within ${x0},${y0} to ${x1},${y1}` : '';
    console.log(f.replace(/^[^-]+-/, ''), `${diff} of ${x.info.width * x.info.height} pixels differ (${((diff / (x.info.width * x.info.height)) * 100).toFixed(2)} per cent)${box}`);
  }
}

const args = process.argv.slice(2);
(args[0] === '--compare' ? compare(args[1], args[2]) : run(args[0], args[1], args[2])).catch((e) => { console.error(e); process.exit(1); });
