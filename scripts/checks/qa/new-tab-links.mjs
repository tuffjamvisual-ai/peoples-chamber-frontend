// A20 (owner, Cowork ENTRY 450, 21 Nov 2026): every rendered link to another site opens in a new tab. A rendered
// <a href> to an http(s) host other than the page's own and opengovt.uk (www and any subdomain) without
// target="_blank" fails, always (no baseline). mailto:, tel:, #jumps and on-site links are not counted. The site does
// this in one place, lib/og-jsx (tsconfig jsxImportSource); a failure means a link rendered outside it (a next/link
// <Link> to another site, or a link a script added).
// Used by rendered-checks.mjs: collectLinks runs in the page (page.evaluate), newTabFailures in node.

// In the page: every a[href], with its target and a short label.
export function collectLinks() {
  return [...document.querySelectorAll('a[href]')].map((a) => ({
    href: a.getAttribute('href') ?? '',
    target: a.getAttribute('target') ?? '',
    label: (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
  }));
}

// The links to another host that lack target="_blank", as "host: label", once each.
export function newTabFailures(links, pageUrl) {
  const page = new URL(pageUrl);
  const out = [];
  for (const l of links) {
    let u;
    try { u = new URL(l.href, page); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || u.host === page.host || /(^|\.)opengovt\.uk$/i.test(u.hostname)) continue;
    if ((l.target ?? '').toLowerCase() === '_blank') continue;
    out.push(`${u.hostname.replace(/^www\./, '')}: ${l.label}`);
  }
  return [...new Set(out)];
}
