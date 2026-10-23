#!/usr/bin/env node
// Send one email from contact@opengovt.uk through the IONOS mailbox.
//
// SAFE BY DEFAULT: without --send it only prints a preview and sends nothing.
// Every email is shown to the site owner and sent only after their explicit yes.
//
// The email is a JSON file in scripts/mail/outbox/ (kept out of Git):
//   { "to": "someone@example.org", "cc": "optional", "subject": "...", "text": "plain text body" }
// A reply can also give "inReplyTo" and "references" (Message-IDs, space separated) so it threads.
//
// Login comes from .env.local (typed in by the site owner, never printed):
//   CONTACT_MAIL_USER=contact@opengovt.uk
//   CONTACT_MAIL_PASSWORD=...
// IONOS settings (ionos.co.uk help): SMTP smtp.ionos.co.uk:587 STARTTLS; IMAP imap.ionos.co.uk:993 SSL.
//
// After sending, a copy is saved to the mailbox's Sent folder and a record is written to
// scripts/mail/sent-log/ (also kept out of Git). A file that has already been sent is
// refused unless --again is given.
//
// Usage:
//   node scripts/mail/send-email.js scripts/mail/outbox/<name>.json          # preview only
//   node scripts/mail/send-email.js scripts/mail/outbox/<name>.json --send   # send

'use strict';
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const { ImapFlow } = require('imapflow');

const SMTP = { host: 'smtp.ionos.co.uk', port: 587, secure: false, requireTLS: true };
const IMAP = { host: 'imap.ionos.co.uk', port: 993, secure: true };
const FROM_NAME = 'Open Govt';
const LOG_DIR = path.join(__dirname, 'sent-log');

const args = process.argv.slice(2);
const SEND = args.includes('--send');
const AGAIN = args.includes('--again');
const file = args.find((a) => !a.startsWith('--'));

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }
const isEmail = (s) => typeof s === 'string' && /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s.trim());

(async () => {
  if (!file) fail('give the email file, e.g. scripts/mail/outbox/registrar.json');
  if (!fs.existsSync(file)) fail(`file not found: ${file}`);
  let email;
  try { email = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`not valid JSON: ${e.message}`); }

  const user = process.env.CONTACT_MAIL_USER;
  const pass = process.env.CONTACT_MAIL_PASSWORD;
  if (!user || !pass) fail('CONTACT_MAIL_USER and CONTACT_MAIL_PASSWORD must be set in .env.local');
  if (!isEmail(user)) fail('CONTACT_MAIL_USER is not an email address');

  const toList = String(email.to || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ccList = String(email.cc || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!toList.length || !toList.every(isEmail)) fail('"to" must be one or more valid email addresses');
  if (ccList.length && !ccList.every(isEmail)) fail('"cc" contains an invalid email address');
  if (!email.subject || !String(email.subject).trim()) fail('"subject" is empty');
  if (!email.text || !String(email.text).trim()) fail('"text" is empty');
  const isMsgIds = (s) => s == null || /^(<[^<>\s]+@[^<>\s]+>\s*)+$/.test(String(s).trim());
  if (!isMsgIds(email.inReplyTo)) fail('"inReplyTo" must be one or more <message-id> values');
  if (!isMsgIds(email.references)) fail('"references" must be one or more <message-id> values');

  const base = path.basename(file, '.json');
  const logFile = path.join(LOG_DIR, `${base}.json`);
  if (SEND && fs.existsSync(logFile) && !AGAIN) fail(`this email was already sent (see ${logFile}); add --again only if it must be sent a second time`);

  const message = {
    from: { name: FROM_NAME, address: user },
    to: toList,
    cc: ccList.length ? ccList : undefined,
    subject: String(email.subject).trim(),
    text: String(email.text),
    inReplyTo: email.inReplyTo ? String(email.inReplyTo).trim() : undefined,
    references: email.references ? String(email.references).trim() : undefined,
  };

  console.log('--- EMAIL PREVIEW ---');
  console.log(`From:    ${FROM_NAME} <${user}>`);
  console.log(`To:      ${toList.join(', ')}`);
  if (ccList.length) console.log(`Cc:      ${ccList.join(', ')}`);
  console.log(`Subject: ${message.subject}`);
  if (message.inReplyTo) console.log(`In-Reply-To: ${message.inReplyTo}`);
  if (message.references) console.log(`References:  ${message.references}`);
  console.log('');
  console.log(message.text);
  console.log('--- END ---');

  if (!SEND) { console.log('\nPREVIEW ONLY. Nothing was sent. Add --send to send it.'); return; }

  const transport = nodemailer.createTransport({ ...SMTP, auth: { user, pass } });
  await transport.verify();
  const info = await transport.sendMail(message);
  console.log(`\nSENT. Message ID: ${info.messageId}; accepted: ${(info.accepted || []).join(', ')}; rejected: ${(info.rejected || []).join(', ') || 'none'}`);

  // Save a copy to the Sent folder so it appears in the mailbox like any other sent email.
  let savedTo = null;
  try {
    const raw = await new MailComposer({ ...message, messageId: info.messageId, date: new Date() }).compile().build();
    const imap = new ImapFlow({ ...IMAP, auth: { user, pass }, logger: false });
    await imap.connect();
    const boxes = await imap.list();
    const sent = boxes.find((b) => b.specialUse === '\\Sent') || boxes.find((b) => /^(sent|sent items|gesendete objekte)$/i.test(b.name));
    if (sent) { await imap.append(sent.path, raw, ['\\Seen']); savedTo = sent.path; }
    await imap.logout();
  } catch (e) {
    console.log(`Note: the email was sent, but saving a copy to the Sent folder failed: ${e.message}`);
  }
  console.log(savedTo ? `Copy saved to the "${savedTo}" folder.` : 'No Sent folder copy was saved.');

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify({ sent_at: new Date().toISOString(), file, to: toList, cc: ccList, subject: message.subject, message_id: info.messageId, accepted: info.accepted, rejected: info.rejected, sent_folder: savedTo }, null, 2));
  console.log(`Record written to ${logFile}`);
})().catch((e) => fail(e.message));
