// Links to other sites open in a new tab (owner, Cowork ENTRY 450, 21 Nov 2026): target="_blank",
// rel="noopener noreferrer" and visually hidden text " (opens in a new tab)" for screen readers. Applied once for the
// whole site by the JSX runtime in lib/og-jsx (every <a> any page renders, and HTML given to dangerouslySetInnerHTML);
// internal links (relative paths, opengovt.uk, www.opengovt.uk), #jumps, mailto: and tel: are left as they are.
// Push check: A20 in scripts/checks/qa/rendered-checks.mjs (scripts/checks/qa/new-tab-links.mjs).

export const NEW_TAB_TEXT = ' (opens in a new tab)';
// The visually hidden class (Tailwind's sr-only, used across the site).
export const NEW_TAB_CLASS = 'sr-only';

// The site's own hosts: opengovt.uk and any subdomain of it (as A9 counts them).
export function isSiteHost(hostname: string): boolean {
  return /(^|\.)opengovt\.uk$/i.test(hostname);
}

// True for an http(s) or protocol relative address on another host. Relative paths, #jumps, mailto:, tel: and anything
// that is not a URL are false.
export function isExternalHref(href: unknown): href is string {
  if (typeof href !== 'string') return false;
  const h = href.trim();
  if (!/^(https?:)?\/\//i.test(h)) return false;
  try {
    const u = new URL(h, 'https://opengovt.uk');
    return /^https?:$/.test(u.protocol) && !isSiteHost(u.hostname);
  } catch {
    return false;
  }
}

// The rel value for a new tab link: the link's own rel words kept (such as "license"), noopener and noreferrer added.
export function newTabRel(rel: unknown): string {
  const words = typeof rel === 'string' ? rel.split(/\s+/).filter(Boolean) : [];
  for (const w of ['noopener', 'noreferrer']) if (!words.some((x) => x.toLowerCase() === w)) words.push(w);
  return words.join(' ');
}

// An aria-label names the link instead of its text, so the hidden text would not be read: the label gets it instead.
export function newTabLabel(label: string): string {
  return /opens in a new tab/i.test(label) ? label : `${label.replace(/\s+$/, '')}${NEW_TAB_TEXT}`;
}

const HIDDEN_HTML = `<span class="${NEW_TAB_CLASS}">${NEW_TAB_TEXT}</span>`;
const attr = (attrs: string, name: string) => new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs);

// The same for links inside an HTML string (written answers, official text, council text): each <a> to another host
// gets target="_blank", the rel words and the hidden text before its </a>. Links never nest, so the next </a> closes it.
export function externalLinksInHtml(html: string): string {
  if (!/<a\s/i.test(html)) return html;
  return html.replace(/<a(\s[^>]*)>([\s\S]*?)<\/a\s*>/gi, (whole, attrs: string, inner: string) => {
    const href = attr(attrs, 'href');
    if (!href || !isExternalHref(href[2] ?? href[3] ?? href[4] ?? '')) return whole;
    const rel = attr(attrs, 'rel');
    const label = attr(attrs, 'aria-label');
    let a = attrs.replace(/\s(target|rel)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/gi, '');
    if (label) a = a.replace(label[0], ` aria-label="${newTabLabel(label[2] ?? label[3] ?? label[4] ?? '').replace(/"/g, '&quot;')}"`);
    a += ` target="_blank" rel="${newTabRel(rel ? rel[2] ?? rel[3] ?? rel[4] : '')}"`;
    const text = /opens in a new tab/i.test(inner) ? inner : inner + HIDDEN_HTML;
    return `<a${a}>${text}</a>`;
  });
}
