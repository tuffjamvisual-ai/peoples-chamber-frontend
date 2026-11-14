// The standing email design for opengovt Weekly (T1-NLDESIGN, owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 62, 64,
// 65; visual reference Claude outputs/newsletter/design/cowork-design-sample-short-2026-11-15.html).
//
// One column at every width: 720px at most on a desktop, the full width on a phone; nothing side by side. Paper
// colours, the stamped OPENGOVT logo (the site's own /brand-logo.png), folder tab section labels in a typewriter face
// (Courier New; no web fonts), body text in Georgia, at least 15px. Table layout and inline styles for Gmail, Apple
// Mail and Outlook (a fixed 720px table for Outlook, which ignores max-width). On phones, links that stand alone are
// at least 44px tall. Colours are set on every block, so a mail app's dark mode stays readable.
//
// The issue's markdown sections map to blocks (lib/newsletter-issue.ts reads the file):
//   "# opengovt Weekly · <date>"      the masthead date
//   Subject / Preview text            the headline question and the line under it
//   "## Still waiting"                the card: the quote's first bold line (department, overdue count as a badge),
//                                     its second bold line (the question), its "- Label: value" lines as a table
//                                     (Asked by -> Asked, Answer due -> Due, Last checked -> Checked) and its link;
//                                     the section's paragraphs follow under the card, "**Our view.**" ruled in red
//   "## The receipt"                  the quote as a paper clipping; the next paragraph's text as its source line and
//                                     its link under the quote; later paragraphs in the card
//   "## Coming due"                   "- **date:** text" lines as a dated list
//   "## Stories you may have missed"  "- " lines as a list, each link on its own line
//   "## New on opengovt" + "## Your question"  one card, "NEW AND YOUR QUESTION"
//   any other "## " section           a card with its paragraphs and lists
//   the sign-off (lines ending in two spaces, e.g. "John Sanders  \nopengovt") and everything after it: the footer
// Every word comes from the file; only the labels' wording and the arrows on links are the design's.
import { esc, inlineHtml, splitBlocks, type Issue } from '@/lib/newsletter-issue';

const INK = '#14100d';
const ACCENT = '#7a1612';
const PAPER = '#e3cb97';
const CARD = '#f3e6c4';
const EDGE = '#b8975a';
const MUTED = '#5b4a3a';
const OUTSIDE = '#2a221c';
const LOGO_BG = '#fbf4e6';
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";
export const LOGO_URL = 'https://www.opengovt.uk/brand-logo.png';

const LINK = `color:${ACCENT};font-weight:bold;text-decoration:underline`;
const P = (size = 16) => `font-family:${SERIF};font-size:${size}px;line-height:1.5;color:${INK};margin:0 0 10px`;

// A paragraph's trailing links ("text. [a](u) · [b](v)") are split off and shown on their own line, so each can be a
// 44px tap target on a phone; the words stay exactly as written.
function splitTrailingLinks(md: string): { text: string; links: string[] } {
  const m = md.match(/((?:\s*(?:·\s*)?\[[^\]]+\]\([^)\s]+\))+)\s*$/);
  if (!m || m.index === undefined) return { text: md, links: [] };
  const links = [...m[1].matchAll(/\[[^\]]+\]\([^)\s]+\)/g)].map((x) => x[0]);
  return { text: md.slice(0, m.index).trim(), links };
}
function actionLinks(links: string[], arrow = true): string {
  if (!links.length) return '';
  return `<div style="margin:2px 0 10px">${links
    .map((l) => {
      const html = inlineHtml(l).replace(/<a href/, '<a class="ogw-a" href').replace(/style="color:#7a1612"/, `style="${LINK}"`);
      return arrow ? html.replace(/<\/a>$/, ' &rarr;</a>') : html;
    })
    .join(`<span style="color:${MUTED}"> &middot; </span>`)}</div>`;
}
const styled = (html: string) => html.replace(/style="color:#7a1612"/g, `style="${LINK}"`);

function para(md: string, size = 16, arrow = false): string {
  const { text, links } = splitTrailingLinks(md);
  const body = text ? `<p style="${P(size)}">${styled(inlineHtml(text)).replace(/\n/g, '<br>')}</p>` : '';
  return body + actionLinks(links, arrow);
}

function tab(label: string): string {
  return `<tr><td class="ogw-pad" style="padding:20px 18px 0"><span style="display:inline-block;background:${CARD};border:1px solid ${EDGE};border-bottom:0;border-radius:6px 6px 0 0;padding:6px 12px;font-family:${MONO};font-size:13px;font-weight:bold;letter-spacing:3px;color:${ACCENT}">${esc(label.toUpperCase())}</span></td></tr>`;
}
function card(inner: string): string {
  return `<tr><td class="ogw-pad" style="padding:0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD};border:1px solid ${EDGE}" bgcolor="${CARD}"><tr><td style="padding:14px 16px 6px">${inner}</td></tr></table></td></tr>`;
}
const row = (inner: string) => `<tr><td class="ogw-pad" style="padding:14px 18px 0">${inner}</td></tr>`;

const quoteLines = (block: string) => block.split('\n').map((l) => l.replace(/^>\s?/, ''));
const isQuote = (b: string) => b.split('\n').every((l) => /^>/.test(l));
const isList = (b: string) => b.split('\n').every((l) => /^[-*]\s+/.test(l));
const items = (b: string) => b.split('\n').map((l) => l.replace(/^[-*]\s+/, ''));

function generic(blocks: string[]): string {
  return blocks
    .map((b) => {
      if (isQuote(b)) return `<div style="border-left:4px solid ${ACCENT};padding-left:12px;margin:0 0 10px">${generic(splitBlocks(quoteLines(b).join('\n')))}</div>`;
      if (isList(b)) return items(b).map((i) => `<div style="padding:6px 0;border-top:1px solid ${EDGE}">${para(i, 15, true)}</div>`).join('');
      return para(b, 15, true);
    })
    .join('');
}

const LABELS: Record<string, string> = { 'asked by': 'Asked', 'answer due': 'Due', 'last checked': 'Checked', 'next check': 'Next check' };

function stillWaiting(blocks: string[]): string {
  const q = blocks.find(isQuote);
  const rest = blocks.filter((b) => b !== q);
  let inner = '';
  if (q) {
    const parts = splitBlocks(quoteLines(q).join('\n'));
    const bolds = parts.filter((p) => /^\*\*[^*]+\*\*$/.test(p.trim()));
    const head = bolds[0]?.replace(/\*\*/g, '') ?? '';
    const [dept, overdue] = head.split(/:\s*(?=\d+ days? overdue$)/);
    inner += `<div style="margin:0 0 6px">${overdue ? `<span style="display:inline-block;background:${ACCENT};color:#ffffff;font-family:${MONO};font-size:13px;font-weight:bold;letter-spacing:2px;padding:4px 8px;margin:0 8px 4px 0">${esc(overdue.toUpperCase())}</span>` : ''}<span style="display:inline-block;font-family:${MONO};font-size:13px;font-weight:bold;letter-spacing:2px;color:${MUTED}">${esc((dept ?? '').toUpperCase())}</span></div>`;
    if (bolds[1]) inner += `<div style="font-family:${SERIF};font-size:19px;line-height:1.3;font-weight:bold;color:${INK};margin:6px 0 8px">${inlineHtml(bolds[1].replace(/\*\*/g, ''))}</div>`;
    const list = parts.find(isList);
    if (list) {
      inner += `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px">${items(list)
        .map((i) => {
          const m = i.match(/^([^:]+):\s*(.*)$/);
          const label = m ? LABELS[m[1].trim().toLowerCase()] ?? m[1].trim() : '';
          return `<tr><td style="font-family:${MONO};font-size:14px;font-weight:bold;color:${INK};padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="font-family:${SERIF};font-size:15px;line-height:1.4;color:${INK};padding:4px 0">${inlineHtml(m ? m[2] : i)}</td></tr>`;
        })
        .join('')}</table>`;
    }
    for (const p of parts.filter((x) => !bolds.includes(x) && x !== list)) {
      const { text, links } = splitTrailingLinks(p);
      inner += (text ? para(text, 15) : '') + actionLinks(links);
    }
  }
  const after = rest
    .map((b) => (/^\*\*Our view\.\*\*/.test(b.trim()) ? `<div style="border-left:4px solid ${ACCENT};padding-left:12px;margin:4px 0 10px">${para(b)}</div>` : para(b)))
    .join('');
  return card(inner) + (after ? row(after) : '');
}

function receipt(blocks: string[]): string {
  const qi = blocks.findIndex(isQuote);
  if (qi < 0) return card(generic(blocks));
  const quote = splitBlocks(quoteLines(blocks[qi]).join('\n')).map((x) => inlineHtml(x)).join('<br><br>');
  const src = blocks[qi + 1] ? splitTrailingLinks(blocks[qi + 1]) : { text: '', links: [] };
  const clip = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf6;border:1px solid ${EDGE}" bgcolor="#fffdf6"><tr><td style="padding:12px 14px 4px">${src.text ? `<div style="font-family:${MONO};font-size:12px;letter-spacing:1px;color:${MUTED};border-bottom:1px dashed ${EDGE};padding-bottom:6px;margin-bottom:8px">${esc(src.text.replace(/\.$/, '').toUpperCase())}</div>` : ''}<p style="font-family:${MONO};font-size:15px;line-height:1.55;color:${INK};margin:0 0 8px">${quote}</p>${actionLinks(src.links)}</td></tr></table>`;
  const later = blocks.filter((_, i) => i !== qi && i !== qi + 1 && i > qi).map((b) => para(b, 15)).join('');
  const before = blocks.slice(0, qi).map((b) => para(b, 15)).join('');
  return card(before + clip + (later ? `<div style="margin-top:12px">${later}</div>` : ''));
}

function comingDue(blocks: string[]): string {
  const inner = blocks
    .map((b) => {
      if (!isList(b)) return para(b, 15);
      return items(b)
        .map((i, n) => {
          const m = i.match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/);
          const date = m ? m[1].replace(/:$/, '') : '';
          const split = splitTrailingLinks(m ? m[2] : i);
          // The line reads on its own under its date, so it starts with a capital (as in the design reference).
          const text = split.text.charAt(0).toUpperCase() + split.text.slice(1);
          const links = split.links;
          return `<div style="padding:8px 0;${n ? `border-top:1px solid ${EDGE}` : ''}">${date ? `<div style="font-family:${MONO};font-size:14px;font-weight:bold;letter-spacing:1px;color:${ACCENT};margin:0 0 2px">${esc(date.toUpperCase())}</div>` : ''}<p style="${P(15)};margin:0">${styled(inlineHtml(text))}</p>${actionLinks(links)}</div>`;
        })
        .join('');
    })
    .join('');
  return card(inner);
}

function stories(blocks: string[]): string {
  const inner = blocks
    .map((b) => {
      if (!isList(b)) return para(b, 15);
      return items(b)
        .map((i, n) => {
          const { text, links } = splitTrailingLinks(i);
          return `<div style="padding:8px 0;${n ? `border-top:1px solid ${EDGE}` : ''}"><p style="${P(15)};margin:0 0 4px">${styled(inlineHtml(text))}</p>${actionLinks(links)}</div>`;
        })
        .join('');
    })
    .join('');
  return card(inner);
}

type Section = { heading: string; blocks: string[] };

export function issueHtml(issue: Issue): string {
  const all = splitBlocks(issue.body);
  let masthead = '';
  const pre: string[] = [];
  const sections: Section[] = [];
  let signoff = '';
  const footer: string[] = [];
  for (const b of all) {
    if (signoff) { footer.push(b); continue; }
    const h1 = b.match(/^#\s+(.*)$/);
    if (h1 && !sections.length) { masthead = h1[1]; continue; }
    const h2 = b.match(/^##\s+(.*)$/);
    if (h2) { sections.push({ heading: h2[1].trim(), blocks: [] }); continue; }
    // The sign-off: short lines joined by markdown line breaks (two trailing spaces), e.g. "John Sanders  \nopengovt".
    if (/ {2}\n/.test(b) && b.split('\n').length <= 3 && b.length < 80) { signoff = b; continue; }
    (sections.length ? sections[sections.length - 1].blocks : pre).push(b);
  }
  const date = masthead.split('·').pop()?.trim() ?? '';

  const out: string[] = [];
  out.push(`<tr><td class="ogw-pad" style="padding:14px 18px 12px;background:${LOGO_BG};border-bottom:3px double ${INK}" bgcolor="${LOGO_BG}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="${LOGO_URL}" width="140" height="50" alt="opengovt" style="display:block;border:0;width:140px;height:50px;color:${ACCENT};font-family:${MONO};font-weight:bold;font-size:20px"></td><td align="right" style="vertical-align:middle;font-family:${MONO};font-size:13px;font-weight:bold;letter-spacing:2px;color:${INK}">WEEKLY${date ? `<br>${esc(date.toUpperCase())}` : ''}</td></tr></table></td></tr>`);
  out.push(row(`<h1 class="ogw-h1" style="font-family:${SERIF};font-size:27px;line-height:1.2;font-weight:bold;color:${INK};margin:4px 0 8px">${esc(issue.subject)}</h1>${issue.preview ? `<p style="${P(16)};color:${MUTED}">${esc(issue.preview)}</p>` : ''}`));
  if (pre.length) out.push(row(generic(pre)));

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const key = s.heading.toLowerCase();
    const next = sections[i + 1];
    if (key === 'new on opengovt' && next?.heading.toLowerCase() === 'your question') {
      const qBlocks = next.blocks.map((b, n) => (n === 0 ? b.replace(/^([^?]+\?)/, '**$1**') : b));
      out.push(tab('New and your question') + card(generic(s.blocks) + `<div style="border-top:1px solid ${EDGE};padding-top:10px">${generic(qBlocks)}</div>`));
      i++;
      continue;
    }
    out.push(tab(s.heading));
    if (key === 'still waiting') out.push(stillWaiting(s.blocks));
    else if (key === 'the receipt') out.push(receipt(s.blocks));
    else if (key === 'coming due') out.push(comingDue(s.blocks));
    else if (key.startsWith('stories')) out.push(stories(s.blocks));
    else out.push(card(generic(s.blocks)));
  }

  if (signoff) {
    const [name, ...restLines] = signoff.split('\n').map((l) => l.trim());
    out.push(`<tr><td class="ogw-pad" style="padding:20px 18px 8px;font-family:${SERIF};font-size:16px;color:${INK}">${inlineHtml(name)}${restLines.length ? `<br><span style="font-family:${MONO};font-size:13px;letter-spacing:2px;color:${ACCENT};font-weight:bold">${esc(restLines.join(' ').toUpperCase())}</span>` : ''}</td></tr>`);
  }
  if (footer.length) {
    const foot = footer
      .map((b) => `<p style="font-family:${SERIF};font-size:15px;line-height:1.5;color:${MUTED};margin:0 0 8px">${inlineHtml(b).replace(/style="color:#7a1612"/g, `class="ogw-a" style="color:${MUTED};text-decoration:underline"`)}</p>`)
      .join('');
    out.push(`<tr><td class="ogw-pad" style="padding:12px 18px 16px;border-top:3px double ${INK}">${foot}</td></tr>`);
  }

  const preheader = issue.preview ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(issue.preview)}</div>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(issue.subject)}</title><style>
@media only screen and (max-width:600px){.ogw-pad{padding-left:12px!important;padding-right:12px!important}.ogw-h1{font-size:24px!important}a.ogw-a{display:inline-block!important;min-height:44px!important;line-height:44px!important}}
</style></head><body style="margin:0;padding:0;background:${OUTSIDE}" bgcolor="${OUTSIDE}">${preheader}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${OUTSIDE}" style="background:${OUTSIDE}"><tr><td align="center" style="padding:12px 4px">
<!--[if mso]><table role="presentation" width="720" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAPER}" style="max-width:720px;width:100%;background:${PAPER};border:1px solid ${EDGE}">${out.join('\n')}</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

// The overdue count is worked out on the day the email is sent, from the "Answer due" date in the Still waiting card
// (ENTRY 64), and dropped if the card no longer says "no answer". It replaces "<n> days overdue" in the preview text
// and in the card's first line.
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function withOverdue(issue: Issue, today: string): Issue {
  const section = issue.body.split(/\n(?=## )/).find((s) => /^## Still waiting/im.test(s));
  if (!section) return issue;
  const due = section.match(/Answer due:\s*(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  const unanswered = /Last checked:[^\n]*no answer/i.test(section);
  let days = 0;
  if (due && unanswered) {
    const month = MONTHS.indexOf(due[2].toLowerCase());
    const t = Date.parse(`${today}T00:00:00Z`);
    if (month >= 0 && !Number.isNaN(t)) {
      const ty = new Date(t).getUTCFullYear();
      let d = Date.UTC(due[3] ? Number(due[3]) : ty, month, Number(due[1]));
      if (!due[3] && d > t + 180 * 86400000) d = Date.UTC(ty - 1, month, Number(due[1]));
      days = Math.round((t - d) / 86400000);
    }
  }
  const phrase = days > 0 ? `${days} day${days === 1 ? '' : 's'} overdue` : '';
  const fix = (s: string) =>
    phrase
      ? s.replace(/\b\d+ days? overdue\b/g, phrase)
      : s.replace(/(\*\*[^*\n]*?):\s*\d+ days? overdue(\*\*)/g, '$1$2').replace(/\bis \d+ days? overdue\b/g, 'is still waiting').replace(/\b\d+ days? overdue\b/g, 'waiting');
  return { ...issue, preview: fix(issue.preview), body: fix(issue.body) };
}
