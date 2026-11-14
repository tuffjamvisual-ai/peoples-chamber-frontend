// T1-NLDESIGN (ENTRY 62, 64, 65): the standing email design (lib/newsletter-template.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/newsletter-template.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIssue, emailFor, unsubscribeUrl } from '../../lib/newsletter-issue';
import { withOverdue, LOGO_URL } from '../../lib/newsletter-template';

const md = (checked = '14 November, no answer') => [
  'Subject: A question?',
  "Preview text: An MP's question is 25 days overdue, and more.",
  '',
  '# opengovt Weekly · 15 November 2026',
  '',
  '## Still waiting',
  '',
  '> **Ministry of Defence: 25 days overdue**',
  '>',
  '> **Has the MOD considered it?**',
  '>',
  '> - Asked by: An MP, 19 October',
  '> - Answer due: 21 October',
  `> - Last checked: ${checked}`,
  '>',
  '> [Track the question](https://example.org/q)',
  '',
  '**Our view.** Words. [22 September answer](https://example.org/a)',
  '',
  '## Coming due',
  '',
  '- **18 November:** our next check.',
  '',
  '## Stories you may have missed',
  '',
  '- **A story.** Text. [See how we calculated it](https://www.opengovt.uk/editorials/x)',
  '',
  'John Sanders  ',
  'opengovt',
  '',
  '[Unsubscribe]({{unsubscribe_url}}) · [Privacy policy](https://www.opengovt.uk/privacy)',
].join('\n');

test('overdue days are worked out on the send date from the due date', () => {
  const on = (d: string) => withOverdue(parseIssue(md()), d);
  assert.match(on('2026-11-15').body, /Ministry of Defence: 25 days overdue/);
  assert.match(on('2026-11-14').body, /24 days overdue/);
  assert.match(on('2026-11-14').preview, /is 24 days overdue/);
  assert.match(on('2026-10-22').body, /1 day overdue/);
});

test('the overdue badge is dropped once the question is answered', () => {
  const r = withOverdue(parseIssue(md('16 November, answered')), '2026-11-17');
  assert.ok(!/overdue/i.test(r.body) && !/overdue/i.test(r.preview));
  const e = emailFor(parseIssue(md('16 November, answered')), '11111111-1111-1111-1111-111111111111', '', '2026-11-17');
  assert.ok(!/OVERDUE/.test(e.html));
});

test('one column, 720px at most, logo, every link kept, own unsubscribe link, labels', () => {
  const tok = '11111111-1111-1111-1111-111111111111';
  const e = emailFor(parseIssue(md()), tok, '', '2026-11-15');
  assert.ok(e.html.includes('max-width:720px'));
  assert.ok(e.html.includes('width="720"'), 'fixed width for Outlook');
  assert.ok(e.html.includes(`src="${LOGO_URL}"`) && e.html.includes('alt="opengovt"'));
  for (const u of ['https://example.org/q', 'https://example.org/a', 'https://www.opengovt.uk/editorials/x', 'https://www.opengovt.uk/privacy', unsubscribeUrl(tok)]) assert.ok(e.html.includes(`href="${u}"`), u);
  assert.ok(e.text.includes(unsubscribeUrl(tok)));
  assert.ok(!e.html.includes('{{'));
  for (const l of ['STILL WAITING', 'COMING DUE', 'STORIES YOU MAY HAVE MISSED', '25 DAYS OVERDUE', '>Asked<', '>Due<', '>Checked<', '15 NOVEMBER 2026', 'John Sanders']) assert.ok(e.html.includes(l), l);
  assert.ok(/font-size:(1[0-2])px/.test(e.html) === false, 'no text under 13px');
});
