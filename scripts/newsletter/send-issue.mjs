// Ask the live site to preview, test or send one issue of opengovt Weekly (T1-NLSEND, COWORK-TO-T1 ENTRY 43, 53,
// 14 Nov 2026). The site sends (it holds the Resend key); this script only posts the issue to
// POST https://www.opengovt.uk/api/newsletter/send-issue with the server secret (CRON_SECRET from .env.local, never
// printed). The rules (who receives what, no double send, limits) are in lib/newsletter-send.ts.
//
//   node scripts/newsletter/send-issue.mjs <issue.md> --date 2026-11-15                 preview: writes HTML and text,
//                                                                                       prints the recipient COUNT
//   node scripts/newsletter/send-issue.mjs <issue.md> --date 2026-11-15 --mode test     ONE email to contact@opengovt.uk
//   node scripts/newsletter/send-issue.mjs <issue.md> --date 2026-11-15 --mode send     every confirmed subscriber
// --out <file.html> sets where the preview is written (default scripts/newsletter/preview/preview.html).
// --site <url> posts to another deployment (default https://www.opengovt.uk).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), quiet: true });

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const file = args.find((a) => a.endsWith('.md'));
const mode = opt('--mode', 'preview');
const issueDate = opt('--date', null);
const site = opt('--site', 'https://www.opengovt.uk');
const out = opt('--out', path.join(process.cwd(), 'scripts/newsletter/preview/preview.html'));
if (!file || !issueDate) { console.error('Give the issue file (.md) and --date YYYY-MM-DD.'); process.exit(1); }
if (!['preview', 'test', 'send'].includes(mode)) { console.error("--mode is 'preview', 'test' or 'send'."); process.exit(1); }
const secret = process.env.CRON_SECRET;
if (!secret) { console.error('CRON_SECRET is not in .env.local.'); process.exit(1); }

const res = await fetch(new URL('/api/newsletter/send-issue', site), {
  method: 'POST',
  headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode, issueDate, issue: fs.readFileSync(file, 'utf8') }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) { console.error(`Stopped (${res.status}): ${body.error ?? 'no answer'}`); process.exit(1); }
if (mode === 'preview') {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body.html);
  fs.writeFileSync(out.replace(/\.html$/, '.txt'), `Subject: ${body.subject}\n\n${body.text}`);
  console.log(`PREVIEW ONLY, nothing sent. "${body.subject}". Confirmed subscribers: ${body.recipients}. Double-send check: ${body.sentCheck}. Written: ${out} (and .txt).`);
} else if (mode === 'test') {
  console.log(`TEST SENT: 1 email to ${body.to} only. Resend id ${body.id}. Unsubscribe link: ${body.unsubscribeLink}.`);
} else {
  console.log(`SENT to ${body.sent} of ${body.recipients} confirmed subscribers.`);
}
