// Speed check (owner's priority, 25 Oct 2026, report 43). Read only: loads the site's most visited routes from a running
// local production build and records, for each route and viewport:
// - server time: time to the first byte of the page HTML, with no throttling (the median of 3 requests, after one
//   warm-up request so an ISR page is measured as visitors get it, from the cache);
//   the first request's time is also kept (on a fresh build it is the page's first render, as after a deploy);
// - whether the HTML came from the cache (x-nextjs-cache HIT / STALE) or was rendered for the request;
// - layout shift (CLS) while the page loads;
// - Largest Contentful Paint with Chrome's "Fast 4G" network preset (9 Mbps down, 1.5 Mbps up, 165 ms latency, as
//   DevTools applies it), and without throttling, from the browser's Performance API;
// - the LCP element, the requests that finished before it (fonts, styles, scripts, images, data fetches), total
//   JavaScript bytes, and every image's size and format.
// - layout on phones (report 52): every route is also loaded, without throttling, at 320 and 414 px (--layout-widths),
//   and at every width the check looks for sideways scroll and for a number or money value in a table cell or a card
//   that is wider than its box (cut off), as "£108,433,986" was on the /donors cards at 320 px.
// It fails (exit code 1) if any route is over a target: LCP 2.5 s throttled, 1 s unthrottled, server time 1 s, an HTTP
// error, any sideways scroll on a phone width (320, 375 or 414 px), or any clipped number. Layout shift over 0.1 is shown as a warning, and fails the run only with
// --cls: on a first visit with an empty cache the Special Elite font arrives just after the first paint and the text
// reflows (report 43); real visitors' CLS is near 0 (Speed Insights p75 at most 0.05 on 25 Oct 2026).
//
// Usage: npm run build && npx next start -p 3001, then
//   npx tsx scripts/checks/speed-check.ts [--base http://127.0.0.1:3001] [--only /mps/4597,/] [--json out.json]
//                                         [--viewports 375,1280] [--layout-widths 320,414] [--details] [--cls]
// --details prints the LCP element, blocking requests and images for each page.

import { chromium, type Browser } from 'playwright';
import { writeFileSync } from 'node:fs';

// The 30 most visited routes (Vercel Web Analytics, 18 to 25 Oct 2026, page paths grouped into routes), each with
// one representative page.
export const ROUTES: { route: string; path: string }[] = [
  { route: '/', path: '/' },
  { route: '/mps/[id]', path: '/mps/4597' },
  { route: '/editorials/[slug]', path: '/editorials/ten-worst-performing-councils-england' },
  { route: '/councils/[slug]', path: '/councils/birmingham' },
  { route: '/divisions/[slug]', path: '/divisions/pw-2026-10-21-101-commons' },
  { route: '/news/[slug]', path: '/news/joint-press-release-on-the-r4-ministerial-meeting-in-istanbul' },
  { route: '/parties/[slug]', path: '/parties/reform-uk' },
  { route: '/departments/[slug]', path: '/departments/home-office' },
  { route: '/people/[slug]', path: '/people/simon-ridley' },
  { route: '/mps', path: '/mps' },
  { route: '/bills', path: '/bills' },
  { route: '/transparency/special-advisers', path: '/transparency/special-advisers' },
  { route: '/money', path: '/money' },
  { route: '/departments', path: '/departments' },
  { route: '/expenses', path: '/expenses' },
  { route: '/search', path: '/search?q=housing' },
  { route: '/reports', path: '/reports' },
  { route: '/parties/[slug]/bio', path: '/parties/labour/bio' },
  { route: '/transparency/register-of-interests', path: '/transparency/register-of-interests' },
  { route: '/councils', path: '/councils' },
  { route: '/transparency/ministers-meetings', path: '/transparency/ministers-meetings' },
  { route: '/civil-service', path: '/civil-service' },
  { route: '/second-jobs', path: '/second-jobs' },
  { route: '/councils/league-table', path: '/councils/league-table' },
  { route: '/donors/[slug]', path: '/donors/lord-sainsbury-of-turville' },
  { route: '/parties/[slug]/money', path: '/parties/restore-britain/money' },
  { route: '/bills/[id]/full', path: '/bills/4017/full' },
  { route: '/transparency/mp-activity', path: '/transparency/mp-activity' },
  { route: '/parties', path: '/parties' },
  { route: '/debates/[guid]', path: '/debates/1532738B-A3C2-4ACB-AE5B-0D7B8FAC2600' },
];

// Pages with phone-only table layouts (cards and sticky columns, report 47), added to the phone layout pass although
// they are not among the 30 most visited routes.
export const PHONE_LAYOUT_EXTRA: { route: string; path: string }[] = [
  { route: '/donors', path: '/donors' },
  { route: '/sewage', path: '/sewage' },
];

export const TARGETS = { lcpThrottledMs: 2500, lcpUnthrottledMs: 1000, serverMs: 1000, cls: 0.1 };

// Chrome DevTools "Fast 4G": 9 Mbps down, 1.5 Mbps up, 60 ms latency, each scaled the way DevTools applies its presets
// (throughput x 0.9, latency x 2.75).
const FAST_4G = { offline: false, downloadThroughput: (9e6 / 8) * 0.9, uploadThroughput: (1.5e6 / 8) * 0.9, latency: 60 * 2.75 };

// Runs in the page before anything else: records LCP entries, layout shifts and what moved.
const INIT_SCRIPT = `
  window.__lcp = []; window.__cls = 0; window.__shifts = [];
  var describe = function (el) {
    if (!el || !el.tagName) return '(text)';
    var cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls + ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  };
  new PerformanceObserver(function (list) {
    list.getEntries().forEach(function (e) {
      var el = e.element, d = el ? el.tagName.toLowerCase() : '(removed element)';
      if (el && el.id) d += '#' + el.id;
      if (el && typeof el.className === 'string' && el.className.trim()) d += '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.');
      if (e.url) d += ' src=' + e.url.replace(location.origin, '');
      else if (el && el.textContent) d += ' "' + el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 70) + '"';
      window.__lcp.push({ t: e.startTime, el: d });
    });
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(function (list) {
    list.getEntries().forEach(function (e) {
      if (e.hadRecentInput) return;
      window.__cls += e.value;
      if (e.value >= 0.01) window.__shifts.push(e.value.toFixed(3) + ' at ' + Math.round(e.startTime) + ' ms: ' + (e.sources || []).slice(0, 3).map(function (x) { return describe(x.node); }).join(' | '));
    });
  }).observe({ type: 'layout-shift', buffered: true });
`;

// Runs in the page: numbers and money values (for example 1,234 · £108,433,986 · 12.5% · £3.4bn) in a table cell or a
// card whose box is narrower than the value, so part of it is cut off or spills out. A plain string, for the same reason
// as INIT_SCRIPT.
const CLIPPED_NUMBERS = `(() => {
  var re = /^[-+\u2212]?[£$€]?\\s?[-+\u2212]?\\d[\\d,]*(\\.\\d+)?\\s?(%|k|m|bn|million|billion)?$/i;
  var out = [];
  document.querySelectorAll('td, th, [class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"]').forEach(function (scope) {
    var leaves = scope.children.length ? scope.querySelectorAll('*') : [scope];
    [scope].concat(Array.prototype.slice.call(leaves)).forEach(function (el) {
      if (el.children.length) return;
      var t = (el.innerText || '').trim();
      if (!t || !re.test(t)) return;
      var box = el.closest('td, th') || el;
      if (getComputedStyle(box).display.indexOf('inline') === 0) box = box.parentElement || box;
      if (box.clientWidth > 0 && box.scrollWidth > box.clientWidth + 1) out.push(t + ' (' + box.scrollWidth + ' of ' + box.clientWidth + ' px)');
    });
  });
  return Array.from(new Set(out));
})()`;

type Req = { url: string; type: string; startMs: number; endMs: number; bytes: number; blocking: boolean };
type Img = { src: string; format: string; bytes: number; natural: string; shown: string };
export type PageResult = {
  route: string; path: string; viewport: number; status: number; cache: string;
  serverMs: number; firstMs: number; cls: number; shifts: string[]; lcpMs: number; lcpUnthrottledMs: number; lcpElement: string;
  jsBytes: number; beforeLcp: Req[]; images: Img[]; scrollWidth: number; clientWidth: number; clipped: string[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

// Time to first byte of the HTML (no browser, no throttling): one warm-up request, then the median of three.
export async function serverTime(base: string, path: string): Promise<{ ms: number; firstMs: number; cache: string; status: number }> {
  const once = async () => {
    const t0 = performance.now();
    const r = await fetch(base + path, { redirect: 'manual' });
    const ms = performance.now() - t0;
    await r.arrayBuffer();
    return { ms, cache: r.headers.get('x-nextjs-cache') ?? 'none (rendered per request)', status: r.status };
  };
  const first = await once();
  const runs = [await once(), await once(), await once()];
  runs.sort((a, b) => a.ms - b.ms);
  return { ...runs[1], firstMs: first.ms };
}

async function measure(browser: Browser, base: string, path: string, viewport: number, throttle: boolean) {
  const context = await browser.newContext({ viewport: { width: viewport, height: viewport < 600 ? 812 : 900 }, deviceScaleFactor: viewport < 600 ? 3 : 1 });
  const page = await context.newPage();
  // A plain string, not a function: tsx wraps named functions in a helper (__name) that does not exist in the page.
  await page.addInitScript(INIT_SCRIPT);
  const types = new Map<string, string>();
  page.on('response', (r) => { types.set(r.url(), r.headers()['content-type'] ?? ''); });
  if (throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', FAST_4G);
  }
  const resp = await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(1500);
  // A tap ends LCP reporting, as a visitor's first interaction does.
  await page.mouse.click(1, 1).catch(() => {});
  const data = await page.evaluate(() => {
    const w = window as unknown as { __lcp: { t: number; el: string }[]; __cls: number; __shifts: string[] };
    const last = w.__lcp[w.__lcp.length - 1] ?? { t: NaN, el: '(no LCP entry)' };
    const res = (performance.getEntriesByType('resource') as (PerformanceResourceTiming & { renderBlockingStatus?: string })[]).map((r) => ({
      url: r.name.replace(location.origin, ''), type: r.initiatorType, startMs: Math.round(r.startTime), endMs: Math.round(r.responseEnd),
      bytes: r.transferSize || r.encodedBodySize, blocking: r.renderBlockingStatus === 'blocking',
    }));
    const imgs = [...document.images].filter((i) => i.currentSrc).map((i) => ({
      src: i.currentSrc.replace(location.origin, ''), natural: `${i.naturalWidth}x${i.naturalHeight}`,
      shown: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`,
    }));
    return { lcp: last, cls: w.__cls, shifts: w.__shifts, res, imgs, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
  });
  const clipped = (await page.evaluate(CLIPPED_NUMBERS)) as string[];
  await context.close();
  const fmt = (u: string) => {
    const t = types.get(u.startsWith('http') ? u : base + u) ?? '';
    return t.split(';')[0].replace('image/', '') || (u.match(/\.(\w+)(\?|$)/)?.[1] ?? '?');
  };
  const byUrl = new Map(data.res.map((r) => [r.url, r]));
  return {
    status: resp?.status() ?? 0,
    cache: resp?.headers()['x-nextjs-cache'] ?? 'none',
    lcpMs: Math.round(data.lcp.t), lcpElement: data.lcp.el, cls: Math.round(data.cls * 1000) / 1000, shifts: data.shifts,
    jsBytes: data.res.filter((r) => r.type === 'script' || /\.js(\?|$)/.test(r.url)).reduce((s, r) => s + r.bytes, 0),
    beforeLcp: data.res.filter((r) => r.endMs <= data.lcp.t && r.type !== 'navigation'),
    images: data.imgs.map((i) => ({ ...i, format: fmt(i.src), bytes: byUrl.get(i.src)?.bytes ?? 0 })),
    scrollWidth: data.scrollWidth, clientWidth: data.clientWidth, clipped,
  };
}

// The phone layout pass: sideways scroll and clipped numbers at one width, without throttling or LCP.
export async function layoutCheck(browser: Browser, base: string, path: string, width: number) {
  const context = await browser.newContext({ viewport: { width, height: 812 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const resp = await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const sizes = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  const clipped = (await page.evaluate(CLIPPED_NUMBERS)) as string[];
  await context.close();
  return { status: resp?.status() ?? 0, scrollWidth: sizes[0], clientWidth: sizes[1], clipped };
}

export async function runSpeedCheck(base: string, routes = ROUTES, viewports = [375, 1280]): Promise<PageResult[]> {
  const browser = await chromium.launch();
  const out: PageResult[] = [];
  try {
    for (const r of routes) {
      const st = await serverTime(base, r.path);
      for (const vp of viewports) {
        const t = await measure(browser, base, r.path, vp, true);
        const u = await measure(browser, base, r.path, vp, false);
        out.push({ route: r.route, path: r.path, viewport: vp, status: t.status, cache: st.cache, serverMs: Math.round(st.ms),
          firstMs: Math.round(st.firstMs), cls: t.cls, shifts: t.shifts,
          lcpMs: t.lcpMs, lcpUnthrottledMs: u.lcpMs, lcpElement: t.lcpElement, jsBytes: t.jsBytes, beforeLcp: t.beforeLcp,
          images: t.images, scrollWidth: t.scrollWidth, clientWidth: t.clientWidth, clipped: t.clipped });
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

async function main() {
  const base = (arg('base') || 'http://127.0.0.1:3001').replace(/\/$/, '');
  const only = arg('only')?.split(',');
  const viewports = (arg('viewports') || '375,1280').split(',').map(Number);
  const routes = only ? only.map((p) => ROUTES.find((r) => r.path === p || r.route === p) ?? { route: p, path: p }) : ROUTES;
  const results = await runSpeedCheck(base, routes, viewports);
  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  let failures = 0;
  console.log('route | page | width | status | HTML | server ms | first request ms | LCP Fast 4G ms | LCP unthrottled ms | CLS | JS | result');
  for (const r of results) {
    const over: string[] = [];
    if (r.status >= 400) over.push(`HTTP ${r.status}`);
    if (r.serverMs > TARGETS.serverMs) over.push('server time');
    if (!(r.lcpMs <= TARGETS.lcpThrottledMs)) over.push('LCP Fast 4G');
    if (!(r.lcpUnthrottledMs <= TARGETS.lcpUnthrottledMs)) over.push('LCP unthrottled');
    if (r.cls > TARGETS.cls && process.argv.includes('--cls')) over.push('layout shift');
    if (r.viewport < 600 && r.scrollWidth > r.clientWidth) over.push('sideways scroll');
    if (r.clipped.length) over.push(`clipped numbers: ${r.clipped.slice(0, 3).join('; ')}`);
    if (over.length) failures++;
    const warn = r.cls > TARGETS.cls && !process.argv.includes('--cls') ? ' (warning: layout shift)' : '';
    console.log([r.route, r.path, r.viewport, r.status, r.cache, r.serverMs, r.firstMs, r.lcpMs, r.lcpUnthrottledMs, r.cls, kb(r.jsBytes), (over.length ? `OVER: ${over.join(', ')}` : 'ok') + warn].join(' | '));
    if (process.argv.includes('--details')) {
      console.log(`    LCP element: ${r.lcpElement}`);
      for (const sh of r.shifts) console.log(`    layout shift ${sh}`);
      for (const q of r.beforeLcp) console.log(`    before LCP: ${q.type} ${q.url.slice(0, 110)} ${q.startMs}-${q.endMs} ms ${kb(q.bytes)}${q.blocking ? ' render-blocking' : ''}`);
      for (const i of r.images) console.log(`    image: ${i.src.slice(0, 110)} ${i.format} ${kb(i.bytes)} natural ${i.natural} shown ${i.shown}`);
    }
  }
  // Phone layout pass at the other phone widths (320 and 414 px by default): sideways scroll and clipped numbers.
  const layoutWidths = (arg('layout-widths') ?? '320,414').split(',').filter(Boolean).map(Number);
  const layout: { route: string; path: string; width: number; scrollWidth: number; clientWidth: number; clipped: string[] }[] = [];
  if (layoutWidths.length) {
    const browser = await chromium.launch();
    try {
      console.log(`phone layout at ${layoutWidths.join(' and ')} px:`);
      const layoutRoutes = only ? routes : [...routes, ...PHONE_LAYOUT_EXTRA];
      for (const r of layoutRoutes) for (const w of layoutWidths) {
        const l = await layoutCheck(browser, base, r.path, w);
        layout.push({ route: r.route, path: r.path, width: w, ...l });
        const over: string[] = [];
        if (l.scrollWidth > l.clientWidth) over.push(`sideways scroll (${l.scrollWidth} of ${l.clientWidth})`);
        if (l.clipped.length) over.push(`clipped numbers: ${l.clipped.slice(0, 3).join('; ')}`);
        if (l.status >= 400) over.push(`HTTP ${l.status}`);
        if (over.length) { failures++; console.log(`  ${r.path} at ${w} px: OVER: ${over.join(', ')}`); }
      }
    } finally {
      await browser.close();
    }
    if (!layout.some((l) => l.scrollWidth > l.clientWidth || l.clipped.length)) console.log(`  all ${layout.length} page loads fit: no sideways scroll, no clipped numbers`);
  }
  const json = arg('json');
  if (json) writeFileSync(json, JSON.stringify({ results, layout }, null, 2));
  console.log(failures ? `${failures} page loads over target` : 'all pages within target');
  process.exit(failures ? 1 : 0);
}

if (process.argv[1]?.endsWith('speed-check.ts')) main().catch((e) => { console.error(e); process.exit(2); });
