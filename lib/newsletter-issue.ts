// One issue of opengovt Weekly as email HTML and plain text (T1-NLSEND, COWORK-TO-T1 ENTRY 43, 53, 14 Nov 2026).
//
// The issue is a markdown file: first lines "Subject: ..." and "Preview text: ...", then a blank line, then the body,
// which holds the placeholder {{unsubscribe_url}}. The body uses: # / ## / ### headings, paragraphs, **bold**,
// *italic*, [links](url), "- " lists, "---" rules and "> " quotes (a quote may hold paragraphs and a list, as the
// "Still waiting" box does). Every link is kept, in the HTML and in the plain text.

import { issueHtml, withOverdue, type HtmlOptions, type Person } from '@/lib/newsletter-template';

export type Issue = { subject: string; preview: string; body: string };
export type IssueEmail = { subject: string; html: string; text: string; headers: Record<string, string> };

export const SITE = 'https://www.opengovt.uk';
export const UNSUBSCRIBE_PLACEHOLDER = '{{unsubscribe_url}}';
export const unsubscribeUrl = (token: string) => `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
// A token no subscriber has: the link opens the newsletter page with "invalid" and changes nothing.
// The issue's web copy (scripts/newsletter/web-copy.ts writes it; it is pushed with the issue's pictures).
export const webCopyUrl = (issueDate: string) => `${SITE}/newsletter/issues/${issueDate}.html`;
export const DEAD_TOKEN = '00000000-0000-0000-0000-000000000000';

const INK = '#14100d';
const ACCENT = '#7a1612';

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Only http(s) and mailto links become links; anything else is shown as text.
const safeUrl = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : null);

export function inlineHtml(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t: string, u: string) => {
      const url = safeUrl(u.replace(/&amp;/g, '&'));
      return url ? `<a href="${esc(url)}" style="color:${ACCENT}">${t}</a>` : m;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}
const inlineText = (s: string) =>
  s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*]+)\*/g, '$1$2');

// The body's blocks: split on blank lines, but a quote's lines stay together (a ">" line that is empty inside a quote
// is not a break).
export function splitBlocks(md: string): string[] {
  const parts = md.replace(/\r\n/g, '\n').split(/\n[ \t]*\n/).map((b) => b.trim()).filter(Boolean);
  const merged: string[] = [];
  for (const b of parts) {
    const isQuote = b.split('\n').every((l) => /^>/.test(l));
    if (isQuote && merged.length && merged[merged.length - 1].split('\n').every((l) => /^>/.test(l))) merged[merged.length - 1] += `\n>\n${b}`;
    else merged.push(b);
  }
  return merged;
}

function blocks(md: string): { html: string[]; text: string[] } {
  const html: string[] = [];
  const text: string[] = [];
  for (const b of splitBlocks(md)) {
    const lines = b.split('\n');
    if (lines.every((l) => /^>/.test(l))) {
      const inner = blocks(lines.map((l) => l.replace(/^>\s?/, '')).join('\n'));
      html.push(`<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:4px solid ${ACCENT};background:#f6f1ea">${inner.html.join('\n')}</blockquote>`);
      text.push(inner.text.join('\n\n').split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
      continue;
    }
    if (/^---+$/.test(b)) { html.push('<hr style="border:none;border-top:1px solid #ccc;margin:24px 0">'); text.push('----'); continue; }
    const h = b.match(/^(#{1,3})\s+([\s\S]*)$/);
    if (h) {
      const level = h[1].length;
      const size = level === 1 ? 24 : level === 2 ? 19 : 17;
      html.push(`<h${level} style="font-size:${size}px;line-height:1.3;margin:24px 0 8px">${inlineHtml(h[2])}</h${level}>`);
      text.push(inlineText(h[2]).toUpperCase());
      continue;
    }
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      const items = lines.map((l) => l.replace(/^[-*]\s+/, ''));
      html.push(`<ul style="padding-left:20px;margin:0 0 16px">${items.map((i) => `<li style="margin:0 0 6px">${inlineHtml(i)}</li>`).join('')}</ul>`);
      text.push(items.map((i) => `- ${inlineText(i)}`).join('\n'));
      continue;
    }
    html.push(`<p style="margin:0 0 16px">${inlineHtml(b).replace(/\n/g, '<br>')}</p>`);
    text.push(inlineText(b));
  }
  return { html, text };
}

export function render(md: string): { html: string; text: string } {
  const { html, text } = blocks(md);
  return {
    html: `<div style="max-width:640px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${INK}">${html.join('\n')}</div>`,
    text: text.join('\n\n') + '\n',
  };
}

export function parseIssue(raw: string): Issue {
  const src = raw.replace(/\r\n/g, '\n').replace(/^﻿/, '');
  const cut = src.indexOf('\n\n');
  const head = cut < 0 ? src : src.slice(0, cut);
  const meta: Record<string, string> = {};
  for (const line of head.split('\n')) {
    const m = line.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (m) meta[m[1].trim().toLowerCase()] = m[2].trim();
  }
  if (!meta.subject) throw new Error('The issue needs a "Subject:" line at the top.');
  const body = cut < 0 ? '' : src.slice(cut + 2);
  if (!body.includes(UNSUBSCRIBE_PLACEHOLDER)) throw new Error(`The issue has no ${UNSUBSCRIBE_PLACEHOLDER} placeholder.`);
  return { subject: meta.subject, preview: meta['preview text'] || '', body };
}

// Today's date in the UK (YYYY-MM-DD), the day an email is sent, for the overdue count.
export const ukToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);

// One recipient's email: their own unsubscribe link in the body and in the one click headers. The HTML is the standing
// design (lib/newsletter-template.ts, T1-NLDESIGN); the plain text keeps every word and link. The overdue count in the
// Still waiting card is worked out for the day it is sent (today, YYYY-MM-DD, UK).
export function emailFor(issue: Issue, token: string, subjectPrefix = '', today = ukToday(), people: Person[] = [], opts: HtmlOptions = {}): IssueEmail {
  // A web copy belongs to no subscriber: its Unsubscribe link goes to the newsletter page.
  const url = opts.web ? `${SITE}/newsletter` : unsubscribeUrl(token);
  const dated = withOverdue(issue, today);
  const filled = { ...dated, body: dated.body.split(UNSUBSCRIBE_PLACEHOLDER).join(url) };
  const { text } = render(filled.body);
  return {
    subject: `${subjectPrefix}${issue.subject}`,
    html: issueHtml(filled, people, opts),
    text,
    headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}
