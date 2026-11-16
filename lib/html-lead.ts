// The opening of an article's HTML and the rest (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 135 H2: on phones and tablets an
// article shows its first 3 paragraphs, then one "Continue reading" fold). Splits after the nth top-level block (a
// paragraph, a list, a table, a quote or a box: GOV.UK releases often open with a box of bullet points), so no element
// is cut in two. Null when there is nothing after it.
const CONTAINERS = new Set(['div', 'section', 'blockquote', 'ul', 'ol', 'table', 'figure', 'aside', 'details', 'dl']);

// When the whole text sits in one wrapper (GOV.UK's <div class="govspeak">), the split is made inside it and each half
// keeps the wrapper, so its styling applies to both.
function singleWrapper(html: string): { open: string; inner: string; close: string } | null {
  const t = html.trim();
  const m = /^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/.exec(t);
  if (!m || !CONTAINERS.has(m[1].toLowerCase())) return null;
  const name = m[1].toLowerCase();
  const re = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
  let depth = 0;
  for (let x = re.exec(t); x; x = re.exec(t)) {
    depth += x[1] ? -1 : 1;
    if (depth === 0) return x.index + x[0].length === t.length ? { open: m[0], inner: t.slice(m[0].length, x.index), close: x[0] } : null;
  }
  return null;
}

export function splitHtmlLead(html: string, paragraphs = 3): { lead: string; rest: string } | null {
  const w = singleWrapper(html);
  if (w) {
    const inner = splitHtmlLead(w.inner, paragraphs);
    return inner ? { lead: w.open + inner.lead + w.close, rest: w.open + inner.rest + w.close } : null;
  }
  let depth = 0, seen = 0;
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const [, closing, rawName, selfClosing] = m;
    const name = rawName.toLowerCase();
    if (CONTAINERS.has(name) && !selfClosing) depth += closing ? -1 : 1;
    // A paragraph, a list or a box at the top level each count as one block of the opening.
    if (closing && (name === 'p' || CONTAINERS.has(name)) && depth === 0 && ++seen === paragraphs) {
      const at = m.index + m[0].length;
      const rest = html.slice(at);
      return rest.replace(/<[^>]*>/g, '').trim() ? { lead: html.slice(0, at), rest } : null;
    }
  }
  return null;
}
