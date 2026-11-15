// Sending one issue of opengovt Weekly from the live site (T1-NLSEND step 2, COWORK-TO-T1 ENTRY 53, owner approved
// 14 Nov 2026). The route app/api/newsletter/send-issue wires this to Resend and the subscriber table; the logic is
// here, with its outside calls passed in, so the tests can run it without sending anything.
//
// Modes:
//   preview  returns the HTML and plain text (with a dead sample unsubscribe link) and the recipient COUNT; sends nothing
//   test     sends ONE email, to contact@opengovt.uk only (the address is fixed here, not taken from the request)
//   send     sends to newsletter_subscribers with status = 'confirmed' only, each with their own unsubscribe link
// Protection: the request must carry "Authorization: Bearer <CRON_SECRET>", the server secret the scheduled jobs
// already use (no new setting). No double send, without a database change: before a 'send', Resend's own list of sent
// emails is read and the send is refused if this issue's subject already went out (not counting [TEST] emails);
// each batch also carries an Idempotency-Key naming the issue date and batch, so a repeat within Resend's 24 hours is
// not sent again. If Resend's list cannot be read, 'send' is refused (it fails closed); 'preview' reports whether the
// check works, so a problem shows before Sunday.
// Limits (Resend's documentation, read 14 Nov 2026): 10 requests a second per team, 100 emails per batch call, free
// plan 100 emails a day (UTC) and 3,000 a month. A send of more than MAX_RECIPIENTS is refused; batches are 1 s apart.
import { timingSafeEqual } from 'node:crypto';
import { DEAD_TOKEN, emailFor, parseIssue, ukToday, webCopyUrl, type IssueEmail } from '@/lib/newsletter-issue';
import type { Person } from '@/lib/newsletter-template';

export const TEST_ADDRESS = 'contact@opengovt.uk';
export const MAX_RECIPIENTS = 90; // under the free plan's 100 a day, leaving room for confirmation emails
const BATCH = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type Mode = 'preview' | 'test' | 'send';
export type Subscriber = { email: string; token: string };
export type OutEmail = IssueEmail & { to: string };
export type SendDeps = {
  secret: string | undefined;
  confirmedSubscribers: () => Promise<Subscriber[]>;
  tokenFor: (email: string) => Promise<string | null>; // a subscriber's token by address (any status), for the test email
  sendOne: (email: OutEmail) => Promise<{ id: string }>;
  sendBatch: (emails: OutEmail[], idempotencyKey: string) => Promise<{ ids: string[] }>;
  sentSubjects: () => Promise<string[]>; // subjects of emails Resend has sent recently; throws if it cannot be read
  pause: (ms: number) => Promise<void>;
  exists: (url: string) => Promise<boolean>; // is this page live on the site (for the web copy link)
};
export type Result = { status: number; body: Record<string, unknown> };

export function authorised(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleSendIssue(authHeader: string | null, input: unknown, deps: SendDeps): Promise<Result> {
  if (!deps.secret) return { status: 503, body: { error: 'not configured' } };
  if (!authorised(authHeader, deps.secret)) return { status: 401, body: { error: 'unauthorised' } };
  const req = (input ?? {}) as { mode?: unknown; issue?: unknown; issueDate?: unknown; allowUnchecked?: unknown };
  const mode = req.mode;
  if (mode !== 'preview' && mode !== 'test' && mode !== 'send') return { status: 400, body: { error: "mode must be 'preview', 'test' or 'send'" } };
  if (typeof req.issue !== 'string' || !req.issue.trim()) return { status: 400, body: { error: 'issue (the markdown) is required' } };
  if (typeof req.issueDate !== 'string' || !DATE_RE.test(req.issueDate)) return { status: 400, body: { error: 'issueDate (YYYY-MM-DD) is required' } };
  let issue;
  try { issue = parseIssue(req.issue); } catch (e) { return { status: 400, body: { error: (e as Error).message } }; }
  // People named in the issue with their Members API ids, for their caricatures (ENTRY 71); checked by the sender.
  const rawPeople = (input as { people?: unknown }).people ?? [];
  if (!Array.isArray(rawPeople) || rawPeople.length > 20 || !rawPeople.every((p) => p && typeof p.name === 'string' && p.name.length <= 80 && Number.isInteger(p.id) && p.id > 0)) {
    return { status: 400, body: { error: 'people must be a list of up to 20 { name, id }' } };
  }
  const people = rawPeople as Person[];
  const today = ukToday();
  // "View in your browser" only when the issue's web copy is live, so the link is never dead (ENTRY 80).
  const webUrl = webCopyUrl(req.issueDate);
  const opts = (await deps.exists(webUrl)) ? { webUrl } : {};

  if (mode === 'preview') {
    const subs = await deps.confirmedSubscribers();
    const sample = emailFor(issue, DEAD_TOKEN, '', today, people, opts);
    let sentCheck: string;
    try { await deps.sentSubjects(); sentCheck = 'ok'; } catch (e) { sentCheck = `unavailable: ${(e as Error).message}`; }
    return { status: 200, body: { mode, subject: sample.subject, html: sample.html, text: sample.text, headers: sample.headers, recipients: subs.length, sentCheck, webCopy: opts.webUrl ?? 'not live yet: no View in your browser link', sent: 0 } };
  }

  if (mode === 'test') {
    const token = (await deps.tokenFor(TEST_ADDRESS)) ?? DEAD_TOKEN;
    const e = emailFor(issue, token, '[TEST] ', today, people, opts);
    const { id } = await deps.sendOne({ ...e, to: TEST_ADDRESS });
    return { status: 200, body: { mode, sent: 1, to: TEST_ADDRESS, id, unsubscribeLink: token === DEAD_TOKEN ? 'dead test link (address not on the list)' : "that subscriber's own" } };
  }

  // send
  let subjects: string[];
  try { subjects = await deps.sentSubjects(); } catch (e) {
    // The site's Resend key cannot read Resend's list of sent emails (401, a sending-only key; 14 Nov 2026). A 'send'
    // then goes ahead only when the owner's command says so explicitly (allowUnchecked: true, the script's
    // --no-sent-check); each batch still carries its Idempotency-Key, so the same issue is not sent twice within
    // Resend's 24 hours. Without it the send is refused, as before.
    if (req.allowUnchecked !== true) {
      return { status: 503, body: { error: `cannot check whether this issue was already sent (${(e as Error).message}); nothing sent. Add --no-sent-check to send relying on Resend's 24 hour Idempotency-Key only` } };
    }
    subjects = [];
  }
  if (subjects.includes(issue.subject)) return { status: 409, body: { error: 'this issue was already sent; nothing sent' } };
  const subs = await deps.confirmedSubscribers();
  if (subs.length > MAX_RECIPIENTS) return { status: 422, body: { error: `${subs.length} recipients is over the ${MAX_RECIPIENTS} a day this plan allows; nothing sent` } };
  const ids: string[] = [];
  for (let i = 0; i < subs.length; i += BATCH) {
    const batch = subs.slice(i, i + BATCH).map((s) => ({ ...emailFor(issue, s.token, '', today, people, opts), to: s.email }));
    try {
      const r = await deps.sendBatch(batch, `opengovt-weekly-${req.issueDate}-batch-${i / BATCH + 1}`);
      ids.push(...r.ids);
    } catch (e) {
      return { status: 502, body: { error: `batch ${i / BATCH + 1}: ${(e as Error).message}`, sent: ids.length, recipients: subs.length } };
    }
    if (i + BATCH < subs.length) await deps.pause(1000);
  }
  return { status: 200, body: { mode, sent: ids.length, recipients: subs.length, ids } };
}
