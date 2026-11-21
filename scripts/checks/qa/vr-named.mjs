// T1-VR: the pages a job names, read from the 'VR-pages:' lines of the pushed commits' messages, and whether a page is
// one of them. Shared by the push check (mobile-audit-prepush.mjs) and visual-compare.mjs (at push and nightly).
//
// Each line's value is split on whitespace and commas ('VR-pages: /a/[slug] /b, /c' names three), and the names of every
// commit in the pushed range are joined (one commit naming none does not cancel another's names). A value that starts
// with 'none' names nothing ('VR-pages: none (share images only)'). Only page types or addresses (starting with '/',
// an https://opengovt.uk prefix is dropped) and 'all' are kept, so words after a name are not read as pages.
// A page is named when a name is 'all', equals its page type or its address, or is a page type ('/mps/[id]') whose
// pattern its address fits.
// Test: npx tsx --test scripts/checks/vr-named.test.ts

export function splitVrPages(value) {
  const v = String(value ?? '').trim();
  if (/^none\b/i.test(v)) return [];
  return v.split(/[\s,]+/)
    .map((t) => t.replace(/^https?:\/\/(www\.)?opengovt\.uk(?=\/|$)/i, '') || '/')
    .filter((t) => t.startsWith('/') || t.toLowerCase() === 'all')
    .map((t) => (t.toLowerCase() === 'all' ? 'all' : t));
}

export function parseVrPages(messages) {
  const names = [...String(messages ?? '').matchAll(/^VR-pages:[ \t]*(.*)$/gim)].flatMap((m) => splitVrPages(m[1]));
  return [...new Set(names)];
}

const patternOf = (route) => new RegExp(`^${route.split('/').map((seg) => {
  if (/^\[\[\.\.\.[^\]]+\]\]$/.test(seg)) return '.*';
  if (/^\[\.\.\.[^\]]+\]$/.test(seg)) return '.+';
  if (/^\[[^\]]+\]$/.test(seg)) return '[^/]+';
  return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}).join('/')}/?$`);

export function pageNamed(names, page) {
  const url = String(page.url ?? '').split(/[?#]/)[0];
  return names.some((j) => j === 'all' || j === page.route || j === page.url || j === url || (j.includes('[') && patternOf(j).test(url)));
}
