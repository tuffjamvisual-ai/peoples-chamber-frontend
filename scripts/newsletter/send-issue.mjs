// Send one issue of opengovt Weekly to confirmed subscribers (T1-NLSEND, COWORK-TO-T1 ENTRY 43, 14 Nov 2026).
//
// SAFE BY DEFAULT: without --send it only writes a preview (HTML and plain text) and prints the recipient COUNT.
// Nothing is sent, and no address is ever printed or logged.
//
// The issue is a markdown file: first lines "Subject: ..." and "Preview text: ...", then a blank line, then the body,
// which holds the placeholder {{unsubscribe_url}}. Each email gets that subscriber's own one click link
// (https://www.opengovt.uk/api/newsletter/unsubscribe?token=<their token>; no sign in, app/api/newsletter/unsubscribe),
// and the headers List-Unsubscribe (that link) and List-Unsubscribe-Post: List-Unsubscribe=One-Click (the route
// accepts POST for one click unsubscribes).
// Recipients: newsletter_subscribers with status = 'confirmed' only. Sent through Resend (RESEND_API_KEY and
// RESEND_FROM in .env.local, typed in by the owner, never printed), in batches of up to 100 (Resend's batch endpoint).
//
// Usage:
//   node scripts/newsletter/send-issue.mjs <issue.md>                                 preview only (count, files)
//   node scripts/newsletter/send-issue.mjs <issue.md> --test <address> --send         send ONLY to that address
//                                                                                     (its unsubscribe link is that
//                                                                                     subscriber's own if it is on the
//                                                                                     list, else a dead test link)
//   node scripts/newsletter/send-issue.mjs <issue.md> --send                          send to every confirmed subscriber
// A full send is refused if a record shows this issue was already sent (scripts/newsletter/sent/<issue>.json).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), quiet: true });
const { createClient } = require('@supabase/supabase-js');

const SITE = 'https://www.opengovt.uk';
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && a.endsWith('.md'));
const send = args.includes('--send');
const testTo = args.includes('--test') ? args[args.indexOf('--test') + 1] : null;
if (!file) { console.error('Give the issue file (.md).'); process.exit(1); }

// ---- markdown to HTML and plain text (the parts the issues use: #/## headings, paragraphs, **bold**, *italic*,
// [links](url), "- " lists, "---" rules). Links are kept in both forms.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inlineHtml(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#7a1612">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}
const inlineText = (s) => s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*]+)\*/g, '$1$2');
export function render(md) {
  const blocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const html = [], text = [];
  for (const b of blocks) {
    if (/^---+$/.test(b)) { html.push('<hr style="border:none;border-top:1px solid #ccc;margin:24px 0">'); text.push('----'); continue; }
    const h = b.match(/^(#{1,3})\s+(.*)$/s);
    if (h) {
      const size = h[1].length === 1 ? 24 : h[1].length === 2 ? 19 : 17;
      html.push(`<h${h[1].length} style="font-size:${size}px;line-height:1.3;margin:24px 0 8px">${inlineHtml(h[2])}</h${h[1].length}>`);
      text.push(inlineText(h[2]).toUpperCase());
      continue;
    }
    if (b.split('\n').every((l) => /^[-*]\s+/.test(l))) {
      const items = b.split('\n').map((l) => l.replace(/^[-*]\s+/, ''));
      html.push(`<ul style="padding-left:20px;margin:0 0 16px">${items.map((i) => `<li style="margin:0 0 6px">${inlineHtml(i)}</li>`).join('')}</ul>`);
      text.push(items.map((i) => `- ${inlineText(i)}`).join('\n'));
      continue;
    }
    html.push(`<p style="margin:0 0 16px">${inlineHtml(b).replace(/\n/g, '<br>')}</p>`);
    text.push(inlineText(b));
  }
  const body = `<div style="max-width:640px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#14100d">${html.join('\n')}</div>`;
  return { html: body, text: text.join('\n\n') + '\n' };
}

export function parseIssue(raw) {
  const [head, ...rest] = raw.split(/\n\n/);
  const meta = Object.fromEntries(head.split('\n').map((l) => l.split(/:\s*/, 2)).filter((p) => p.length === 2).map(([k, v]) => [k.trim().toLowerCase(), v.trim()]));
  if (!meta.subject) throw new Error('The issue needs a "Subject:" line at the top.');
  const body = rest.join('\n\n');
  if (!body.includes('{{unsubscribe_url}}')) throw new Error('The issue has no {{unsubscribe_url}} placeholder.');
  return { subject: meta.subject, preview: meta['preview text'] || '', body };
}

const unsubscribeUrl = (token) => `${SITE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
function emailFor(issue, token) {
  const url = unsubscribeUrl(token);
  const { html, text } = render(issue.body.replaceAll('{{unsubscribe_url}}', url));
  // The preview text, hidden, first in the HTML (shown by mail apps next to the subject).
  const pre = issue.preview ? `<div style="display:none;max-height:0;overflow:hidden">${esc(issue.preview)}</div>` : '';
  return { subject: issue.subject, html: pre + html, text, headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}

async function main() {
  const issue = parseIssue(fs.readFileSync(file, 'utf8'));
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data: subs, error } = await db.from('newsletter_subscribers').select('email, token').eq('status', 'confirmed');
  if (error) throw new Error(`subscribers: ${error.message}`);
  console.log(`Issue: "${issue.subject}". Confirmed subscribers: ${subs.length}.`);

  const outDir = path.join(process.cwd(), 'scripts/newsletter/preview');
  fs.mkdirSync(outDir, { recursive: true });
  const sample = emailFor(issue, '00000000-0000-0000-0000-000000000000');
  fs.writeFileSync(path.join(outDir, 'preview.html'), sample.html);
  fs.writeFileSync(path.join(outDir, 'preview.txt'), `Subject: ${sample.subject}\n\n${sample.text}`);
  console.log(`Preview written: ${path.relative(process.cwd(), outDir)}/preview.html and preview.txt (sample unsubscribe link, not a real token).`);
  if (!send) { console.log('PREVIEW ONLY. Nothing was sent. Add --send (and --test <address> for a test send).'); return; }

  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY and RESEND_FROM must be set in .env.local (by the owner).');
  const { Resend } = require('resend');
  const resend = new Resend(key);

  if (testTo) {
    const own = subs.find((s) => s.email.toLowerCase() === testTo.toLowerCase());
    const e = emailFor(issue, own ? own.token : '00000000-0000-0000-0000-000000000000');
    const r = await resend.emails.send({ from, to: testTo, subject: `[TEST] ${e.subject}`, html: e.html, text: e.text, headers: e.headers });
    if (r.error) throw new Error(`Resend: ${r.error.message}`);
    console.log(`TEST SENT to the given address only. Resend id ${r.data?.id}. Unsubscribe link: ${own ? "that subscriber's own" : 'a dead test link (address not on the list)'}.`);
    return;
  }

  const record = path.join(process.cwd(), 'scripts/newsletter/sent', `${path.basename(file, '.md')}.json`);
  if (fs.existsSync(record)) throw new Error(`Already sent (${path.relative(process.cwd(), record)}). Not sending again.`);
  const ids = [];
  for (let i = 0; i < subs.length; i += 100) {
    const batch = subs.slice(i, i + 100).map((s) => { const e = emailFor(issue, s.token); return { from, to: s.email, subject: e.subject, html: e.html, text: e.text, headers: e.headers }; });
    const r = await resend.batch.send(batch);
    if (r.error) throw new Error(`Resend batch ${i / 100 + 1}: ${r.error.message} (${ids.length} sent before it)`);
    ids.push(...(r.data?.data ?? []).map((d) => d.id));
    if (i + 100 < subs.length) await new Promise((res) => setTimeout(res, 1000));
  }
  fs.mkdirSync(path.dirname(record), { recursive: true });
  // The record holds counts, ids and a hash of each address, never the address itself.
  fs.writeFileSync(record, JSON.stringify({ issue: path.basename(file), subject: issue.subject, sentAt: new Date().toISOString(), recipients: subs.length, resendIds: ids, recipientHashes: subs.map((s) => crypto.createHash('sha256').update(s.email.toLowerCase()).digest('hex').slice(0, 16)) }, null, 1));
  console.log(`SENT to ${subs.length} confirmed subscribers (${ids.length} Resend ids). Record: ${path.relative(process.cwd(), record)}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(`Stopped: ${e.message}`); process.exit(1); });
