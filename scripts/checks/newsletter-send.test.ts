// T1-NLSEND step 2 (ENTRY 53): the send-issue rules (lib/newsletter-send.ts) and the issue renderer
// (lib/newsletter-issue.ts). Nothing is sent: Resend and the subscriber table are stand-ins.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/newsletter-send.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSendIssue, MAX_RECIPIENTS, TEST_ADDRESS, type OutEmail, type SendDeps } from '../../lib/newsletter-send';
import { parseIssue, render, unsubscribeUrl } from '../../lib/newsletter-issue';

const SECRET = 'test-secret';
const AUTH = `Bearer ${SECRET}`;
const ISSUE = [
  'Subject: A test issue',
  'Preview text: The preview line',
  '',
  '# opengovt Weekly',
  '',
  '## Still waiting',
  '',
  '> **Ministry of Defence**',
  '>',
  '> - Asked by: An MP, 19 October',
  '> - Answer due: 21 October',
  '>',
  '> [Track the question](https://questions-statements.parliament.uk/x)',
  '',
  '## The receipt',
  '',
  '> "A quoted sentence."',
  '',
  'A paragraph with [a link](https://www.opengovt.uk/a) and **bold**.',
  '',
  '[Unsubscribe]({{unsubscribe_url}})',
].join('\n');
const BODY = { mode: 'send', issueDate: '2026-11-15', issue: ISSUE };

function stub(over: Partial<SendDeps> = {}, subs = [
  { email: 'a@example.org', token: '11111111-1111-1111-1111-111111111111' },
  { email: 'b@example.org', token: '22222222-2222-2222-2222-222222222222' },
]) {
  const log = { one: [] as OutEmail[], batches: [] as { emails: OutEmail[]; key: string }[] };
  const deps: SendDeps = {
    secret: SECRET,
    confirmedSubscribers: async () => subs,
    tokenFor: async () => null,
    sendOne: async (e) => { log.one.push(e); return { id: 'one' }; },
    sendBatch: async (emails, key) => { log.batches.push({ emails, key }); return { ids: emails.map((_, i) => `id${i}`) }; },
    sentSubjects: async () => [],
    pause: async () => {},
    exists: async () => false,
    ...over,
  };
  return { deps, log };
}

test('refuses without the secret, with a wrong one, and when the server has none', async () => {
  const { deps, log } = stub();
  assert.equal((await handleSendIssue(null, BODY, deps)).status, 401);
  assert.equal((await handleSendIssue('Bearer wrong', BODY, deps)).status, 401);
  assert.equal((await handleSendIssue(SECRET, BODY, deps)).status, 401); // no "Bearer "
  assert.equal((await handleSendIssue(AUTH, BODY, { ...deps, secret: undefined })).status, 503);
  assert.equal((await handleSendIssue(AUTH, BODY, { ...deps, secret: '' })).status, 503);
  assert.equal(log.one.length + log.batches.length, 0);
});

test('refuses a bad mode, a missing issue, a bad date, and an issue without the unsubscribe placeholder', async () => {
  const { deps, log } = stub();
  assert.equal((await handleSendIssue(AUTH, { ...BODY, mode: 'all' }, deps)).status, 400);
  assert.equal((await handleSendIssue(AUTH, { ...BODY, issue: '' }, deps)).status, 400);
  assert.equal((await handleSendIssue(AUTH, { ...BODY, issueDate: '15 Nov' }, deps)).status, 400);
  assert.equal((await handleSendIssue(AUTH, { ...BODY, issue: ISSUE.replace('{{unsubscribe_url}}', 'x') }, deps)).status, 400);
  assert.equal((await handleSendIssue(AUTH, null, deps)).status, 400);
  assert.equal(log.one.length + log.batches.length, 0);
});

test('preview sends nothing and returns the HTML, the count and whether the sent check works', async () => {
  const { deps, log } = stub({ sentSubjects: async () => { throw new Error('Resend list answered 401'); } });
  const r = await handleSendIssue(AUTH, { ...BODY, mode: 'preview' }, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.recipients, 2);
  assert.equal(r.body.sent, 0);
  assert.match(String(r.body.sentCheck), /^unavailable/);
  assert.ok(!String(r.body.html).includes('{{unsubscribe_url}}'));
  assert.ok(!JSON.stringify(r.body).includes('a@example.org'), 'no address in a preview');
  assert.equal(log.one.length + log.batches.length, 0);
});

test('test sends one email, to contact@opengovt.uk only, whatever the request says', async () => {
  const { deps, log } = stub();
  const r = await handleSendIssue(AUTH, { ...BODY, mode: 'test', to: 'someone@example.org' }, deps);
  assert.equal(r.status, 200);
  assert.equal(log.one.length, 1);
  assert.equal(log.batches.length, 0);
  assert.equal(log.one[0].to, TEST_ADDRESS);
  assert.match(log.one[0].subject, /^\[TEST\] /);
});

test('send goes to confirmed subscribers only, each with their own unsubscribe link and headers', async () => {
  const { deps, log } = stub();
  const r = await handleSendIssue(AUTH, BODY, deps);
  assert.equal(r.status, 200);
  assert.equal(r.body.sent, 2);
  assert.equal(log.batches.length, 1);
  assert.equal(log.batches[0].key, 'opengovt-weekly-2026-11-15-batch-1');
  for (const [i, s] of [['a@example.org', '11111111-1111-1111-1111-111111111111'], ['b@example.org', '22222222-2222-2222-2222-222222222222']].entries()) {
    const e = log.batches[0].emails[i];
    assert.equal(e.to, s[0]);
    assert.ok(e.html.includes(unsubscribeUrl(s[1])) && e.text.includes(unsubscribeUrl(s[1])));
    assert.equal(e.headers['List-Unsubscribe'], `<${unsubscribeUrl(s[1])}>`);
    assert.equal(e.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
    const other = i === 0 ? '22222222' : '11111111';
    assert.ok(!e.html.includes(other), 'no other subscriber’s link');
  }
});

test('send is refused if the issue already went out, or if that cannot be checked', async () => {
  const sent = stub({ sentSubjects: async () => ['[TEST] A test issue', 'A test issue'] });
  assert.equal((await handleSendIssue(AUTH, BODY, sent.deps)).status, 409);
  const onlyTest = stub({ sentSubjects: async () => ['[TEST] A test issue'] });
  assert.equal((await handleSendIssue(AUTH, BODY, onlyTest.deps)).status, 200, 'a test email does not block the send');
  const down = stub({ sentSubjects: async () => { throw new Error('down'); } });
  assert.equal((await handleSendIssue(AUTH, BODY, down.deps)).status, 503);
  assert.equal(sent.log.batches.length + down.log.batches.length, 0);
});

test('send is refused over the daily limit, and batches are 100 with their own keys', async () => {
  const many = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => ({ email: `p${i}@example.org`, token: `t${i}` }));
  const over = stub({}, many);
  assert.equal((await handleSendIssue(AUTH, BODY, over.deps)).status, 422);
  assert.equal(over.log.batches.length, 0);
});

test('renderer: quote box keeps each field on its own line, quotes render as quotes, links kept', () => {
  const issue = parseIssue(ISSUE);
  assert.equal(issue.subject, 'A test issue');
  assert.equal(issue.preview, 'The preview line');
  const { html, text } = render(issue.body);
  const box = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/)?.[1] ?? '';
  assert.ok(box.includes('<strong>Ministry of Defence</strong>'));
  assert.ok(box.includes('<li style="margin:0 0 6px">Asked by: An MP, 19 October</li>'));
  assert.ok(box.includes('<li style="margin:0 0 6px">Answer due: 21 October</li>'));
  assert.ok(box.includes('href="https://questions-statements.parliament.uk/x"'));
  assert.equal((html.match(/<blockquote/g) ?? []).length, 2);
  assert.ok(html.includes('&quot;A quoted sentence.&quot;'));
  assert.ok(html.includes('href="https://www.opengovt.uk/a"'));
  assert.ok(text.includes('> - Asked by: An MP, 19 October'));
  assert.ok(text.includes('a link (https://www.opengovt.uk/a)'));
});

test('renderer: a javascript: link is not made a link', () => {
  const { html } = render('[x](javascript:alert(1))');
  assert.ok(!html.includes('href="javascript'));
});

test('preview reports whether the web copy is live, and the link appears only then', async () => {
  const off = stub();
  const r1 = await handleSendIssue(AUTH, { ...BODY, mode: 'preview' }, off.deps);
  assert.match(String(r1.body.webCopy), /not live/);
  assert.ok(!String(r1.body.html).includes('View in your browser'));
  const on = stub({ exists: async () => true });
  const r2 = await handleSendIssue(AUTH, { ...BODY, mode: 'preview' }, on.deps);
  assert.equal(r2.body.webCopy, 'https://www.opengovt.uk/newsletter/issues/2026-11-15.html');
  assert.ok(String(r2.body.html).includes('View in your browser'));
});
