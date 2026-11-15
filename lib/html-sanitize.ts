// One allow-list sanitiser for the HTML the site shows from outside sources (security review M4, owner approved 14 Nov
// 2026, COWORK-TO-T1 ENTRY 59): Parliament committee purposes, Hansard debate speeches, GOV.UK press release bodies and
// GOV.UK people's role descriptions. It replaces a set of regular expressions (which missed unquoted handlers,
// javascript: links and elements such as <iframe>) and covers the two places that used none.
//
// The HTML is parsed (htmlparser2) and written out again keeping only:
//  - the elements in ALLOWED (text structure, lists, tables, emphasis); any other element is dropped but its text kept,
//    and the elements in DROP_WITH_CONTENT (script, style, iframe, object, embed, form...) are dropped with everything
//    inside them;
//  - the attributes class, id, title, lang, colspan, rowspan, scope; on <a> href (http, https, mailto, a page path or
//    #anchor only) and rel; on <img> an https src, alt, width and height; no style, no on... handlers, no javascript: or
//    data: URLs;
//  - text, escaped again.
// Options keep the old per-page rules: links: 'strip' drops <a> but keeps its text (opengovt never links offsite from
// Hansard or committee text); hansardColumns removes Hansard's empty column-number spans.
import { Parser } from 'htmlparser2';

const ALLOWED = new Set(['p', 'br', 'hr', 'span', 'div', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'abbr',
  'cite', 'q', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table',
  'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'figure', 'figcaption', 'a', 'time', 'address',
  'section', 'article', 'aside', 'details', 'summary', 'mark', 'del', 'ins', 'img']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select',
  'textarea', 'noscript', 'template', 'svg', 'math', 'canvas', 'audio', 'video', 'link', 'meta', 'base', 'frame', 'frameset', 'applet']);
const VOID = new Set(['br', 'hr', 'col', 'img', 'input', 'meta', 'link', 'base', 'wbr', 'source', 'track', 'area', 'param', 'embed']);
const ATTRS = new Set(['class', 'id', 'title', 'lang', 'colspan', 'rowspan', 'scope']);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => esc(s).replace(/"/g, '&quot;');
// http(s), mailto, a site path or an #anchor; anything else (javascript:, data:, vbscript:...) is dropped.
function safeHref(v: string): string | null {
  const t = v.trim().replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (/^(https?:|mailto:)/i.test(t)) return v.trim();
  if (/^[/#?]/.test(t) && !/^\/\//.test(t)) return v.trim();
  return null;
}

export type SanitizeOptions = { links?: 'keep' | 'strip'; hansardColumns?: boolean };

export function sanitizeHtml(html: string, opts: SanitizeOptions = { links: 'strip', hansardColumns: true }): string {
  const links = opts.links ?? 'strip';
  const out: string[] = [];
  let dropDepth = 0;         // inside an element dropped with its content
  const stack: (string | null)[] = []; // what each open element wrote (its name), or null when it wrote nothing
  const parser = new Parser({
    onopentag(name, attribs) {
      if (dropDepth > 0 || DROP_WITH_CONTENT.has(name)) { if (!VOID.has(name)) dropDepth++; return; }
      const columnSpan = opts.hansardColumns && name === 'span' && /(^|\s)column-number(\s|$)/.test(attribs.class ?? '');
      if (columnSpan) { dropDepth++; return; } // Hansard layout artefact: empty, dropped
      const keep = ALLOWED.has(name) && !(name === 'a' && links === 'strip');
      if (!keep) { if (!VOID.has(name)) stack.push(null); return; }
      const parts: string[] = [];
      for (const [k, v] of Object.entries(attribs)) {
        const key = k.toLowerCase();
        if (key === 'href' && name === 'a') { const h = safeHref(v); if (h) parts.push(`href="${escAttr(h)}"`); continue; }
        if (key === 'rel' && name === 'a') { parts.push(`rel="${escAttr(v)}"`); continue; }
        // Images (GOV.UK press releases have some): an https picture only, with its text and size.
        if (name === 'img' && key === 'src') { if (/^https:\/\//i.test(v.trim())) parts.push(`src="${escAttr(v.trim())}"`); continue; }
        if (name === 'img' && (key === 'alt' || key === 'width' || key === 'height')) { parts.push(`${key}="${escAttr(v)}"`); continue; }
        if (ATTRS.has(key)) parts.push(`${key}="${escAttr(v)}"`);
      }
      out.push(`<${name}${parts.length ? ' ' + parts.join(' ') : ''}>`);
      if (!VOID.has(name)) stack.push(name);
    },
    ontext(text) { if (dropDepth === 0) out.push(esc(text)); },
    onclosetag(name, isImplied) {
      if (dropDepth > 0) { if (!VOID.has(name)) dropDepth--; return; }
      if (VOID.has(name)) return;
      const wrote = stack.pop();
      if (wrote) out.push(`</${wrote}>`);
      void isImplied;
    },
  }, { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true, recognizeSelfClosing: true });
  parser.write(html);
  parser.end();
  return out.join('').trim();
}
