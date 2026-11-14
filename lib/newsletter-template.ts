// The standing email design for opengovt Weekly (T1-NLDESIGN, owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 70,
// which replaces the boxed layouts of ENTRY 62 to 68; visual reference newsletter/design/cowork-design-sample-stream-
// 2026-11-15.html, after the pattern of a one-stream political newsletter).
//
// ONE STREAM OF TEXT: plain paper background, 680px at most, one column; no cards, boxes, tabs, borders or shaded
// panels anywhere. Only the stamped OPENGOVT logo at the top (the site's logo with its paper made transparent and its
// border thickened, /newsletter-logo.png, 450 by 128 for sharpness; shown 225px wide, 185px on phones, ENTRY 74, 75). Then "By <NAME>" (the sign-off's name) and "Tips, corrections and questions: contact@opengovt.uk".
// Body text 16px Georgia, line height 1.6; section headings 16px bold capitals with space above; links underlined in
// the site red; the receipt quote indented 18px in Courier New 15px; footer 13px, muted. Table layout and inline
// styles for Gmail, Apple Mail and Outlook (a fixed 680px table for Outlook, which ignores max-width); colours set on
// every block, so dark mode stays readable; on phones each link gets a 44px tap height.
//
// How the issue's markdown maps (lib/newsletter-issue.ts reads the file; every word comes from it):
//   "## <heading>"                        a heading in capitals
//   "## The short version"                its bullets as "•" lines; any paragraph after them (the welcome) opens the
//                                         email, above the heading, as in the reference
//   a paragraph opening with bold words   the first one in a section, and every one in "In case you missed them", has
//                                         its bold words in CAPITALS ending in a colon ("**£12.8bn.**" -> "£12.8BN:");
//                                         other bold lead-ins stay as written
//   "> " quote                            indented, typewriter
//   in "In case you missed them", trailing paragraphs without bold words: "One new thing..." gets the heading
//   NEW ON OPENGOVT and the last one (the question to readers) YOUR QUESTION, as in the reference
//   the sign-off ("John Sanders" / "opengovt") and everything after it: the footer
import { esc, inlineHtml, splitBlocks, type Issue } from '@/lib/newsletter-issue';

const INK = '#14100d';
const ACCENT = '#7a1612';
const PAPER = '#efe2c4';
const MUTED = '#5b4a3a';
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";
export const LOGO_URL = 'https://www.opengovt.uk/newsletter-logo.png';
export const CONTACT = 'contact@opengovt.uk';

const BODY = `font-family:${SERIF};font-size:16px;line-height:1.6;color:${INK};margin:0 0 14px`;
const HEAD = `font-family:${SERIF};font-size:16px;line-height:1.4;font-weight:bold;letter-spacing:1px;color:${INK};margin:28px 0 12px`;
const SMALL = `font-family:${SERIF};font-size:13px;line-height:1.5;color:${MUTED};margin:0 0 4px`;

const links = (html: string) => html.replace(/<a href/g, '<a class="ogw-il" href').replace(/style="color:#7a1612"/g, `style="color:${ACCENT};text-decoration:underline"`);
const isQuote = (b: string) => b.split('\n').every((l) => /^>/.test(l));
const isList = (b: string) => b.split('\n').every((l) => /^[-*]\s+/.test(l));
const items = (b: string) => b.split('\n').map((l) => l.replace(/^[-*]\s+/, ''));
const quoteText = (b: string) => b.split('\n').map((l) => l.replace(/^>\s?/, '')).join('\n');

// "**£12.8bn.** That's..." -> "**£12.8BN:** That's..."; "**Andy Burnham** was..." -> "**ANDY BURNHAM:** was...".
export function capsLead(md: string): string {
  return md.replace(/^\*\*([^*]+?)[.:]?\*\*/, (_, words: string) => `**${words.toUpperCase()}:**`);
}

const heading = (text: string) => `<p style="${HEAD}">${esc(text.toUpperCase())}</p>`;
function block(b: string): string {
  if (isQuote(b)) {
    const q = splitBlocks(quoteText(b)).map((x) => links(inlineHtml(x))).join('<br><br>');
    return `<p style="${BODY};margin:0 0 14px 18px"><span style="font-family:${MONO};font-size:15px">${q}</span></p>`;
  }
  if (isList(b)) return items(b).map((i) => `<p style="${BODY};margin:0 0 8px">&bull; ${links(inlineHtml(i))}</p>`).join('');
  return `<p style="${BODY}">${links(inlineHtml(b)).replace(/\n/g, '<br>')}</p>`;
}
const bold = (b: string) => /^\*\*[^*]+\*\*/.test(b.trim());

// MP caricatures (ENTRY 71, 72, 73, "always caricatures"): a person named in the issue, with their Members API id, gets
// their full caricature (public/newsletter/mps/<id>.jpg, made by scripts/newsletter/mp-photos.mjs from the site's own
// photo) in the site's polaroid frame (off-white, thicker at the bottom, a slight shadow and tilt where the mail
// program supports them), beside the paragraph where they are first named: a two-cell row, frame left (84px picture),
// paragraph right, no other box. Desktop only: the frame's cell is hidden under 600px. Names come with their ids from
// the send (checked against the Members API there), never guessed here.
export type Person = { name: string; id: number };
export const PHOTO_BASE = 'https://www.opengovt.uk/newsletter/mps/';
const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ');
function framed(p: Person, paragraph: string): string {
  const inner = paragraph.replace(/margin:0 0 (8|14)px(?: 18px)?"/, 'margin:0"');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td class="ogw-ph" valign="top" width="108" style="padding:4px 18px 0 2px"><div style="background:#fbf8f0;padding:6px 6px 18px;box-shadow:2px 3px 6px rgba(20,16,13,0.3);transform:rotate(-2deg);width:84px"><img src="${PHOTO_BASE}${p.id}.jpg" width="84" height="84" alt="${esc(p.name)}" style="display:block;width:84px;height:84px;border:0"></div></td><td valign="top">${inner}</td></tr></table>`;
}
function withPhotos(blocks: string[], people: Person[]): string[] {
  const out = [...blocks];
  for (const p of people) {
    const re = new RegExp(p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i');
    // The first block whose text (not its tags or link addresses) names them, unless it is a heading or already framed.
    const i = out.findIndex((b) => b.startsWith('<p ') && !b.includes('font-weight:bold;letter-spacing:1px') && re.test(textOf(b)));
    if (i >= 0) out[i] = framed(p, out[i]);
  }
  return out;
}

type Section = { heading: string; blocks: string[] };

export function issueHtml(issue: Issue, people: Person[] = []): string {
  let signoff = '';
  const pre: string[] = [];
  const sections: Section[] = [];
  const footer: string[] = [];
  for (const b of splitBlocks(issue.body)) {
    if (signoff) { footer.push(b); continue; }
    if (/^#\s/.test(b) && !sections.length) continue; // the "# opengovt Weekly · <date>" title line: the subject says it
    const h2 = b.match(/^##\s+(.*)$/);
    if (h2) { sections.push({ heading: h2[1].trim(), blocks: [] }); continue; }
    // The sign-off: two or three short lines, the last the site's name or joined by markdown line breaks.
    const lines = b.split('\n');
    if (lines.length >= 2 && lines.length <= 3 && b.length < 80 && (/ {2}\n/.test(b) || /^opengovt$/i.test(lines[lines.length - 1].trim()))) { signoff = b; continue; }
    (sections.length ? sections[sections.length - 1].blocks : pre).push(b);
  }
  const [name = '', ...signRest] = signoff.split('\n').map((l) => l.trim());

  const out: string[] = [];
  out.push(`<p style="margin:0 0 10px"><img class="ogw-logo" src="${LOGO_URL}" width="225" height="64" alt="opengovt" style="display:block;border:0;width:225px;height:64px;color:${ACCENT};font-family:${MONO};font-weight:bold;font-size:20px"></p>`);
  if (name) out.push(`<p style="font-family:${SERIF};font-size:14px;color:${INK};margin:0 0 4px">By <strong>${esc(name.toUpperCase())}</strong></p>`);
  out.push(`<p style="${SMALL};margin:0 0 20px">Tips, corrections and questions: <a class="ogw-il" href="mailto:${CONTACT}" style="color:${ACCENT};text-decoration:underline">${CONTACT}</a></p>`);

  for (const b of pre) out.push(block(b));
  for (const s of sections) {
    const key = s.heading.toLowerCase();
    if (key === 'the short version') {
      const li = s.blocks.findIndex(isList);
      // The welcome after the bullets opens the email, above the heading (reference).
      for (const b of s.blocks.slice(li + 1)) out.push(block(b));
      out.push(heading(s.heading));
      for (const b of s.blocks.slice(0, li + 1)) out.push(block(b));
      continue;
    }
    out.push(heading(s.heading));
    const missed = key === 'in case you missed them';
    let firstPara = true;
    const trailing: string[] = [];
    s.blocks.forEach((b, n) => {
      if (missed && !bold(b) && !isQuote(b) && !isList(b) && s.blocks.slice(n).every((x) => !bold(x))) { trailing.push(b); return; }
      const caps = (missed || firstPara) && bold(b) && !isList(b) && !isQuote(b);
      if (!isList(b) && !isQuote(b)) firstPara = false;
      out.push(block(caps ? capsLead(b) : b));
    });
    trailing.forEach((b, n) => {
      if (/^One new thing/i.test(b)) out.push(heading('New on opengovt'));
      else if (n === trailing.length - 1 && /\?/.test(b)) out.push(heading('Your question'));
      out.push(block(b));
    });
  }

  // Pictures in the stream only (not the header lines above it).
  const body = withPhotos(out.splice(3), people);
  out.push(...body);
  if (name) out.push(`<p style="${BODY};margin:22px 0 4px">${esc(name)}${signRest.length ? `<br><strong>${esc(signRest.join(' '))}</strong>` : ''}</p>`);
  footer.forEach((b, n) => out.push(`<p style="${SMALL};margin:${n === 0 ? '24px' : '0'} 0 4px">${links(inlineHtml(b))}</p>`));

  const preheader = issue.preview ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(issue.preview)}</div>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(issue.subject)}</title><style>
@media only screen and (max-width:599px){td.ogw-ph{display:none!important;width:0!important;padding:0!important}img.ogw-logo{width:185px!important;height:53px!important}}
@media only screen and (max-width:600px){a.ogw-il{display:inline-block!important;padding:10px 0!important;line-height:1.3!important}}
</style></head><body style="margin:0;padding:0;background:${PAPER}" bgcolor="${PAPER}">${preheader}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAPER}" style="background:${PAPER}"><tr><td align="center">
<!--[if mso]><table role="presentation" width="680" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAPER}" style="max-width:680px;width:100%;background:${PAPER}"><tr><td style="padding:18px 18px 28px;text-align:left">
${out.join('\n')}
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

// The overdue count is worked out on the day the email is sent, from an "Answer due: <day> <month>" line in a
// "## Still waiting" section, and dropped if that section no longer says "no answer" (ENTRY 64). It replaces
// "<n> days overdue" in the preview text and the body. An issue without such a line is left as written.
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function withOverdue(issue: Issue, today: string): Issue {
  const section = issue.body.split(/\n(?=## )/).find((s) => /^## Still waiting/im.test(s));
  if (!section) return issue;
  const due = section.match(/Answer due:\s*(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
  if (!due) return issue;
  const unanswered = /Last checked:[^\n]*no answer/i.test(section);
  let days = 0;
  if (unanswered) {
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
