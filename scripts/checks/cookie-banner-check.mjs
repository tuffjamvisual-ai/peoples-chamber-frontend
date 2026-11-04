// Cookie banner wording check (owner, 4 Nov 2026): at 1440x900, 375x812 and 360x780, with no cookie choice made, each
// banner button must show exactly one label and "View cookies" must show exactly once; prints the banner's height.
// --no-css also blocks every stylesheet, to show the banner's own rules are enough on their own.
//   node scripts/checks/cookie-banner-check.mjs <base url> [--no-css]
import { chromium } from 'playwright';

const [base, flag] = process.argv.slice(2);
const browser = await chromium.launch();
let failed = false;
for (const vp of [{ width: 1440, height: 900 }, { width: 375, height: 812 }, { width: 360, height: 780 }]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
  const page = await ctx.newPage();
  if (flag === '--no-css') await page.route(/\.css(\?|$)/, (r) => r.abort());
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const b = document.querySelector('.og-cookie-banner');
    if (!b) return null;
    const buttons = [...b.querySelectorAll('button')].filter(vis).map((x) => ({ text: x.innerText.trim(), labels: [...x.querySelectorAll('span')].filter(vis).length, h: Math.round(x.getBoundingClientRect().height) }));
    const view = [...b.querySelectorAll('a')].filter((a) => vis(a) && a.textContent.trim() === 'View cookies').length;
    return { height: Math.round(b.getBoundingClientRect().height), position: getComputedStyle(b).position, buttons, viewCookies: view };
  });
  const ok = r && r.buttons.length === 2 && r.buttons.every((x) => x.labels === 1) && r.viewCookies === 1;
  if (!ok) failed = true;
  console.log(`${vp.width}x${vp.height}`, ok ? 'OK' : 'FAIL', JSON.stringify(r));
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
