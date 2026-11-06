// Answers as Parliament published them, links included, so unlike lib/html-sanitize.ts this keeps <a>. Removes what could run or break
// the page: scripts, styles, frames, event handlers, javascript: addresses and inline styles and widths, which can force sideways scroll.
export function answerHtml(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*\/?>/gi, '')
    .replace(/\s(on[a-z]+|style|width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Tables stay as published: the phone script (lib/phone-enhance.ts) would otherwise rebuild them as cards. They scroll inside themselves.
    .replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (t) => (t.replace(/<[^>]*>|&nbsp;|\s/gi, '') ? t : t.replace(/^<table\b/i, '<table data-empty-table="1"')))
    .replace(/<table\b/gi, '<table data-pt-table="keep"')
    .replace(/<a\b([^>]*)>/gi, (_, attrs: string) => {
      const href = attrs.match(/href\s*=\s*("[^"]*"|'[^']*')/i)?.[1];
      return href && /^["']https?:\/\//i.test(href) ? `<a href=${href} target="_blank" rel="noopener noreferrer">` : '<a>';
    });
}

// The 10,000px rule on phones (owner, 5 Nov 2026): 136 answers are over 7,000 characters, the longest 36,846. Splits an answer at the last
// block that fits in `room` characters, never inside a table, so the rest can sit in a fold under 640px. Tables run to about 0.85px a
// character at 375px, so 6,500 leaves room for the rest of the page. Returns the whole answer with no rest when it fits.
export function splitAnswer(html: string, room = 6500): { first: string; rest: string | null } {
  if (html.length <= room) return { first: html, rest: null };
  let tables = 0;
  let last = 0;   // the end of the last block that still fits
  for (const m of html.matchAll(/<table\b|<\/table>|<\/p>|<\/ul>|<\/ol>|<\/div>/gi)) {
    const tag = m[0].toLowerCase();
    if (tag === '<table') { tables++; continue; }
    if (tag === '</table>') tables = Math.max(0, tables - 1);
    if (tables > 0) continue;
    const end = m.index + m[0].length;
    if (end > room) break;
    last = end;
  }
  // A first block too long to fit, such as one long table, opens folded.
  return { first: html.slice(0, last), rest: html.slice(last) };
}
