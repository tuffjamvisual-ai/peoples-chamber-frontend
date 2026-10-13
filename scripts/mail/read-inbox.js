#!/usr/bin/env node
// Read the contact@opengovt.uk mailbox (IONOS) without changing it.
// READ-ONLY: never marks messages as read, never deletes, moves or flags anything.
//
// Login comes from .env.local (never printed): CONTACT_MAIL_USER, CONTACT_MAIL_PASSWORD.
// IONOS IMAP: imap.ionos.co.uk:993 SSL.
//
// Usage:
//   node scripts/mail/read-inbox.js                    # newest 20 in the Inbox
//   node scripts/mail/read-inbox.js --limit=50         # newest 50
//   node scripts/mail/read-inbox.js --from=parliament  # only senders containing this text
//   node scripts/mail/read-inbox.js --show=1234        # one message in full (by its number from the list)
//   node scripts/mail/read-inbox.js --folder=Sent      # another folder

'use strict';
require('dotenv').config({ path: '.env.local' });
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const IMAP = { host: 'imap.ionos.co.uk', port: 993, secure: true };
const opt = (name, dflt) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : dflt; };
const LIMIT = Math.max(1, Math.min(200, Number(opt('limit', 20)) || 20));
const FROM = (opt('from', '') || '').toLowerCase();
const SHOW = opt('show', null);
const FOLDER = opt('folder', 'INBOX');

function fail(msg) { console.error(`STOPPED: ${msg}`); process.exit(1); }

(async () => {
  const user = process.env.CONTACT_MAIL_USER;
  const pass = process.env.CONTACT_MAIL_PASSWORD;
  if (!user || !pass) fail('CONTACT_MAIL_USER and CONTACT_MAIL_PASSWORD must be set in .env.local');

  const imap = new ImapFlow({ ...IMAP, auth: { user, pass }, logger: false });
  await imap.connect();
  let folder = FOLDER;
  if (FOLDER.toLowerCase() === 'sent') {
    const boxes = await imap.list();
    const sent = boxes.find((b) => b.specialUse === '\\Sent');
    if (sent) folder = sent.path;
  }
  // readOnly: the folder is opened in EXAMINE mode, so nothing in it can change.
  const lock = await imap.getMailboxLock(folder, { readOnly: true });
  try {
    if (SHOW) {
      const msg = await imap.fetchOne(String(SHOW), { source: true }, { uid: true });
      if (!msg) fail(`no message ${SHOW} in ${folder}`);
      const p = await simpleParser(msg.source);
      console.log(`From:    ${p.from ? p.from.text : ''}`);
      console.log(`To:      ${p.to ? p.to.text : ''}`);
      if (p.cc) console.log(`Cc:      ${p.cc.text}`);
      console.log(`Date:    ${p.date ? p.date.toISOString() : ''}`);
      console.log(`Subject: ${p.subject || ''}`);
      if (p.attachments && p.attachments.length) console.log(`Attachments: ${p.attachments.map((a) => `${a.filename || 'unnamed'} (${a.contentType}, ${a.size} bytes)`).join('; ')}`);
      console.log('');
      console.log((p.text || '(no plain-text body)').trim());
      return;
    }
    const total = imap.mailbox.exists;
    console.log(`${folder}: ${total} messages. Newest ${Math.min(LIMIT, total)}${FROM ? ` (sender contains "${FROM}")` : ''}:`);
    if (!total) return;
    const start = Math.max(1, total - LIMIT * (FROM ? 5 : 1) + 1);
    const rows = [];
    for await (const m of imap.fetch(`${start}:*`, { uid: true, envelope: true, flags: true, internalDate: true })) {
      const from = (m.envelope.from || []).map((f) => `${f.name ? f.name + ' ' : ''}<${f.address}>`).join(', ');
      if (FROM && !from.toLowerCase().includes(FROM)) continue;
      rows.push({ uid: m.uid, date: (m.envelope.date || m.internalDate), from, subject: m.envelope.subject || '', unread: !(m.flags && m.flags.has('\\Seen')) });
    }
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const r of rows.slice(0, LIMIT)) {
      console.log(`${String(r.uid).padStart(6)} | ${new Date(r.date).toISOString().slice(0, 16).replace('T', ' ')} | ${r.unread ? 'UNREAD' : '      '} | ${r.from} | ${r.subject}`);
    }
    console.log('\nShow one in full with: node scripts/mail/read-inbox.js --show=<number>');
  } finally {
    lock.release();
    await imap.logout();
  }
})().catch((e) => fail(e.message));
