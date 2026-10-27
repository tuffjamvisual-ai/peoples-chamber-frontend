import { Resend } from 'resend';
import type { DatabaseSize } from '@/lib/database-size';
import { VERIFY_TOKEN_TTL_DAYS } from '@/lib/auth-constants';

export interface BioReviewFlag {
  memberId: number;
  name: string;
  reason: string;
  flaggedAt: string;
}

// Email sending is "armed but inert" until RESEND_API_KEY is set. When it is
// absent, sendVerificationEmail is a no-op and signup auto-verifies accounts so
// nothing breaks. Once the key (and a verified RESEND_FROM domain) are added,
// new accounts must confirm their email before they can vote.
export const emailEnabled = !!process.env.RESEND_API_KEY;

// Every send goes through deliver() (25 Oct 2026, report 58). Resend does not throw when it refuses a message (an
// unverified sender domain, a bad recipient, a rate limit): the refusal comes back in `error`. Both that and a thrown
// network error are logged with console.error (the error's name, HTTP status and message, with any email address in
// the message replaced by [address]; never the recipient or a key) and returned as { sent: false, reason }, so no
// caller can report a failed send as sent.
type EmailPayload = Parameters<Resend['emails']['send']>[0];
export type SendResult = { sent: true; id?: string } | { sent: false; reason: string };
const ADDRESS = /[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/g;
const redact = (t: string) => t.replace(ADDRESS, '[address]');

async function deliver(kind: string, key: string, payload: EmailPayload): Promise<SendResult> {
  try {
    const { data, error } = await new Resend(key).emails.send(payload);
    if (error) {
      const reason = redact(error.message || 'unknown error');
      console.error(`[email] ${kind} not sent: ${error.name} (status ${error.statusCode ?? 'none'}): ${reason}`);
      return { sent: false, reason };
    }
    return { sent: true, id: data?.id };
  } catch (e) {
    const err = e as Error;
    const reason = redact(err?.message || String(e));
    console.error(`[email] ${kind} not sent: ${err?.name || 'Error'} (status none): ${reason}`);
    return { sent: false, reason };
  }
}

// Admin notification: fires on every successful new-user registration to the
// contact inbox. Reuses the same Resend key/sender as verification email and
// is inert (no-op) until RESEND_API_KEY is set, matching the pattern above.
// Never throws — the caller treats it as fire-and-forget so a notification
// failure can't break signup.
const SIGNUP_NOTIFY_TO = 'contact@opengovt.uk';

export async function sendSignupNotification(user: {
  email: string;
  username?: string | null;
  emailVerified: boolean;
  createdAt?: string | null;
  newsletterOptIn?: boolean;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';

  const when = user.createdAt ? new Date(user.createdAt) : new Date();
  const timestamp = when.toLocaleString('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const username = user.username?.trim() || 'Not provided';
  const status = user.emailVerified ? 'auto-verified (email confirmation off)' : 'pending email confirmation';
  const newsletter = user.newsletterOptIn ? 'Yes, opted in' : 'No';
  const subject = user.newsletterOptIn
    ? `New opengovt signup (newsletter): ${user.email}`
    : `New opengovt signup: ${user.email}`;

  const text =
    `New user registered on opengovt.\n\n` +
    `Email:      ${user.email}\n` +
    `Username:   ${username}\n` +
    `Newsletter: ${newsletter}\n` +
    `Verified:   ${status}\n` +
    `Signed up:  ${timestamp} (UK time)\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">New user registered on opengovt.</p>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:2px 14px 2px 0;color:#555">Email</td><td>${user.email}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Username</td><td>${username}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Newsletter</td><td style="font-weight:${user.newsletterOptIn ? 'bold' : 'normal'};color:${user.newsletterOptIn ? '#2a6e1f' : 'inherit'}">${newsletter}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Verified</td><td>${status}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Signed up</td><td>${timestamp} (UK time)</td></tr>
      </table>
    </div>`;

  return { ...(await deliver('sign up notification', key, {
    from, to: SIGNUP_NOTIFY_TO, subject, text, html,
  })), to: SIGNUP_NOTIFY_TO, from };
}

// Fires from the daily-briefings cron once the three drafts are saved. Lists the
// headlines with direct links so they can be reviewed and published from the
// email. Inert (no-op) until RESEND_API_KEY is set. Never throws.
const BRIEFINGS_NOTIFY_TO = 'contact@opengovt.uk';

export async function sendBriefingNotification(
  briefings: { headline: string; slug: string }[],
  opts?: { published?: boolean },
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const base = 'https://www.opengovt.uk';
  const state = opts?.published
    ? 'These are PUBLISHED and live.'
    : 'These are DRAFTS: not public, not listed, not indexed. Review every claim, then flip is_published to true to publish.';

  const lines = briefings.map((b, i) => `${i + 1}. ${b.headline}\n   ${base}/briefings/${b.slug}`).join('\n\n');
  const text = `opengovt daily briefings ready for review.\n\n${state}\n\n${lines}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 8px;font-weight:bold">opengovt daily briefings ready for review.</p>
      <p style="margin:0 0 16px;color:#7a1612">${state}</p>
      <ol style="margin:0;padding-left:18px">
        ${briefings.map((b) => `<li style="margin:0 0 12px"><a href="${base}/briefings/${b.slug}" style="color:#14100d">${b.headline}</a></li>`).join('')}
      </ol>
    </div>`;

  return deliver('briefings notification', key, {
    from,
    to: BRIEFINGS_NOTIFY_TO,
    subject: `opengovt briefings for review: ${new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })} (${briefings.length})`,
    text,
    html,
  });
}

export async function sendPasswordResetEmail(to: string, token: string, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return deliver('password reset', key, {
    from,
    to,
    subject: 'Reset your opengovt password',
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14100d">
      <p>You requested a password reset for your opengovt account.</p>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${link}" style="display:inline-block;background:#6b2417;color:#ffffff;padding:11px 20px;border-radius:4px;text-decoration:none">Reset my password</a></p>
      <p style="font-size:14px;color:#555">Or paste this link into your browser:<br>${link}</p>
      <p style="font-size:14px;color:#555">If you did not request a reset, you can ignore this email. Your password has not changed.</p>
    </div>`,
  });
}

// The confirmation email (wording and plain text version, 25 Oct 2026, report 70): one large button that works as an
// ordinary link on any phone's mail app, the same link written out, the expiry, and a plain text part for mail apps
// that do not show HTML.
export async function sendVerificationEmail(to: string, token: string, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const link = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const text =
    `Welcome to Open Govt.\n\n` +
    `Confirm your email address to start voting on bills and polls. Open this link:\n${link}\n\n` +
    `You will be signed in and taken back to the page you were on. The link expires after ${VERIFY_TOKEN_TTL_DAYS} days.\n\n` +
    `If you did not create an account, you can ignore this email.\n`;
  return deliver('confirmation', key, {
    from,
    to,
    subject: 'Confirm your Open Govt account',
    text,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#14100d;max-width:560px">
      <p>Welcome to Open Govt.</p>
      <p>Confirm your email address to start voting on bills and polls:</p>
      <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#6b2417;color:#ffffff;padding:14px 24px;border-radius:4px;text-decoration:none;font-size:17px;font-weight:bold">Confirm my email</a></p>
      <p style="font-size:15px;color:#333">You will be signed in and taken back to the page you were on. The link expires after ${VERIFY_TOKEN_TTL_DAYS} days.</p>
      <p style="font-size:14px;color:#555">If the button does not work, copy this link into your browser:<br><a href="${link}" style="color:#6b2417;word-break:break-all">${link}</a></p>
      <p style="font-size:14px;color:#555">If you did not create an account, you can ignore this email.</p>
    </div>`,
  });
}

// Data freshness alert — fired by /api/monitor-freshness when one or more
// syncs have not run within their expected cadence. Names the affected PAGE,
// not just the table, and includes the last successful run detail so the alert
// is actionable at a glance. Inert until RESEND_API_KEY is set. Never throws.
const FRESHNESS_NOTIFY_TO = 'contact@opengovt.uk';

export interface StaleSource {
  label: string;      // "Departmental budgets"
  page: string;       // "/spending"
  route: string | null;
  ageDays: number | null;   // days since last run (null = never ran / no heartbeat)
  lastRanAt: string | null; // ISO
  lastRows: number | null;
  lastStatus: number | null;
  reason?: string;          // when set, the alert line says this instead of "serving stale data"
}

export async function sendFreshnessAlert(stale: StaleSource[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  if (stale.length === 0) return { sent: false, reason: 'nothing_stale' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';

  const fmt = (s: StaleSource) => {
    const ran = s.lastRanAt
      ? new Date(s.lastRanAt).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric' })
      : 'never';
    const age = s.ageDays == null ? 'no successful run on record' : `sync last ran ${s.ageDays} day${s.ageDays === 1 ? '' : 's'} ago`;
    const last = s.lastRanAt ? ` (last run wrote ${s.lastRows ?? '?'} rows on ${ran}, HTTP ${s.lastStatus ?? '?'})` : '';
    if (s.reason) return `${s.label}: ${s.reason}${last}.`;
    return `${s.page} is serving stale data: ${s.label}, ${age}${last}.`;
  };

  const lines = stale.map(fmt);
  const text = `Data freshness alert: ${stale.length} source${stale.length === 1 ? '' : 's'} overdue.\n\n${lines.join('\n')}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">Data freshness alert: ${stale.length} source${stale.length === 1 ? '' : 's'} overdue.</p>
      <ul style="margin:0;padding-left:18px">${lines.map((l) => `<li style="margin:0 0 6px">${l}</li>`).join('')}</ul>
    </div>`;

  return deliver('freshness alert', key, {
    from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt data freshness: ${stale.length} source${stale.length === 1 ? '' : 's'} overdue`, text, html,
  });
}

// Database disk warning — fired by /api/monitor-freshness when disk use (database
// + WAL) passes WARNING_GB or URGENT_GB (lib/database-size.ts). Repeats once a day
// while it stays over. Same recipient as the freshness alert. Inert until
// RESEND_API_KEY is set. Never throws.
export async function sendDatabaseSizeAlert(size: DatabaseSize) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  if (size.level === 'ok') return { sent: false, reason: 'below_threshold' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';

  const urgent = size.level === 'urgent';
  const gb = (n: number) => `${n.toFixed(2)} GB`;
  const headline = urgent
    ? `URGENT: database disk at ${gb(size.usedGb)} of ${gb(size.limitGb)}`
    : `Database disk at ${gb(size.usedGb)} of ${gb(size.limitGb)}`;
  const lines = [
    `Disk used: ${gb(size.usedGb)} of ${gb(size.limitGb)} (${size.usedPct}%).`,
    `Database: ${gb(size.databaseGb)}. WAL: ${size.walGb == null ? 'could not be read' : gb(size.walGb)}.`,
    `Supabase switches the project to read-only at ${gb(size.readOnlyAtGb)}, when every sync stops saving data.`,
    `Room left before that: ${gb(Math.max(0, size.headroomGb))}.`,
    urgent
      ? 'Action needed now: free up space or raise the disk limit in Supabase.'
      : 'No action needed yet, but plan to free up space or raise the disk limit.',
  ];
  const text = `${headline}\n\n${lines.join('\n')}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold;color:${urgent ? '#7a1612' : '#14100d'}">${headline}</p>
      <ul style="margin:0;padding-left:18px">${lines.map((l) => `<li style="margin:0 0 6px">${l}</li>`).join('')}</ul>
    </div>`;

  return deliver('database size alert', key, {
    from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`, text, html,
  });
}

// New storm overflow return — fired by /api/monitor-freshness when data.gov.uk
// lists an Environment Agency annual return for a later year than the one in
// sewage_overflows. Repeats daily until the new year is imported (the import is
// run by hand: node scripts/import-sewage.js, then --write). Same recipient as the
// freshness alert. Inert until RESEND_API_KEY is set. Never throws.
export async function sendSewageReleaseAlert(newYear: number, storedYear: number | null, fileUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const headline = `New storm overflow figures: Environment Agency ${newYear} return published`;
  const lines = [
    `data.gov.uk now lists the Environment Agency's storm overflow annual return for ${newYear}.`,
    `The site currently shows ${storedYear ?? 'no'} figures for England.`,
    `File: ${fileUrl}`,
    `To load it: update EA_YEAR and EA_ZIP in scripts/import-sewage.js, run the dry run, check the report, then run it with --write.`,
  ];
  const text = `${headline}\n\n${lines.join('\n')}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">${headline}</p>
      <ul style="margin:0;padding-left:18px">${lines.map((l) => `<li style="margin:0 0 6px">${l}</li>`).join('')}</ul>
    </div>`;
  return deliver('sewage release alert', key, { from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`, text, html });
}

// New-release alert for datasets loaded by hand — fired by /api/check-hand-loaded-releases (weekly) when a source
// page shows a release newer than the one held, or in a reminder dataset's month. Same recipient as the freshness
// alert. Inert until RESEND_API_KEY is set. Never throws.
export interface HandLoadedRelease {
  key: string; label: string; held: string; newer: string | null; sourcePage: string; expectedRelease: string;
}

export async function sendHandLoadedReleaseAlert(items: HandLoadedRelease[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  if (items.length === 0) return { sent: false, reason: 'nothing new' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const headline = `${items.length} hand-loaded dataset${items.length === 1 ? '' : 's'} to update`;
  const lines = items.map((i) => i.newer
    ? `${i.label}: the source now shows ${i.newer}; the site holds ${i.held}. Source: ${i.sourcePage}`
    : `${i.label}: time to check for a new release (${i.expectedRelease}); the site holds ${i.held}. Source: ${i.sourcePage}`);
  const text = `${headline}\n\n${lines.join('\n')}\n\nNothing has been imported; each needs its import script run by hand.\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">${headline}</p>
      <ul style="margin:0 0 12px;padding-left:18px">${lines.map((l) => `<li style="margin:0 0 6px">${l}</li>`).join('')}</ul>
      <p style="margin:0">Nothing has been imported; each needs its import script run by hand.</p>
    </div>`;
  return deliver('hand loaded release alert', key, { from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt: ${headline}`, text, html });
}

// Biography review alert — fired by /api/monitor-freshness when the nightly syncs
// have flagged written MP biographies for review in the last 24 hours (party
// change, a post starting or ending, an MP leaving, a new MP with no biography).
// Same recipient as the freshness alert. Inert until RESEND_API_KEY is set. Never throws.
export async function sendBioReviewAlert(flags: BioReviewFlag[], outstanding: number) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  if (flags.length === 0) return { sent: false, reason: 'nothing_new' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const line = (f: BioReviewFlag) => `${f.name}: ${f.reason} (https://www.opengovt.uk/mps/${f.memberId})`;
  const headline = `${flags.length} MP biograph${flags.length === 1 ? 'y needs' : 'ies need'} review`;
  const text = `${headline} (${outstanding} outstanding in total).\n\n${flags.map(line).join('\n')}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">${headline} (${outstanding} outstanding in total).</p>
      <ul style="margin:0;padding-left:18px">${flags.map((f) => `<li style="margin:0 0 6px"><a href="https://www.opengovt.uk/mps/${f.memberId}">${esc(f.name)}</a>: ${esc(f.reason)}</li>`).join('')}</ul>
    </div>`;
  return deliver('biography review alert', key, { from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt: ${headline}`, text, html });
}

// Newsletter confirmation (double opt-in) for the email-only sign-up. The address is only
// added to the list when its owner clicks the link. Never throws.
export async function sendNewsletterConfirmation(to: string, token: string, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const confirm = `${baseUrl}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const unsubscribe = `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  const text =
    `Please confirm you want Open Govt Weekly: the week's investigations, overlooked documents and public spending stories, in one email.\n\n` +
    `Confirm: ${confirm}\n\n` +
    `If you did not ask for this, ignore this email and you will not be added.\n` +
    `Unsubscribe at any time: ${unsubscribe}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14100d">
      <p>Please confirm you want Open Govt Weekly: the week's investigations, overlooked documents and public spending stories, in one email.</p>
      <p><a href="${confirm}" style="display:inline-block;background:#7a1612;color:#ffffff;padding:10px 16px;text-decoration:none;font-weight:bold">Confirm my subscription</a></p>
      <p style="color:#555">If you did not ask for this, ignore this email and you will not be added.</p>
      <p style="color:#555;font-size:13px">Unsubscribe at any time: <a href="${unsubscribe}" style="color:#555">${unsubscribe}</a></p>
    </div>`;
  return deliver('newsletter confirmation', key, {
    from, to, subject: 'Confirm your opengovt newsletter subscription', text, html,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
  });
}

// Where a newsletter sign up came from, in words, for the owner notification (owner, 27 Oct 2026). Data pages send
// "data-<page>". A code not listed here is shown as it is.
const SIGNUP_SOURCES: Record<string, string> = {
  homepage: 'Homepage',
  'newsletter-page': 'Newsletter page',
  strip: 'Newsletter strip at the bottom of the screen',
  'article-end-editorials': 'End of article: investigations and editorials',
  'article-end-briefings': 'End of article: briefings',
  'article-end-briefings-db': 'End of article: daily briefings',
  'article-end-news': 'End of article: news',
};
const DATA_PAGES: Record<string, string> = {
  'special-advisers': 'special advisers',
  parties: 'parties',
  councils: 'councils',
  'mp-profile': 'MP profile',
  spending: 'spending',
  expenses: 'expenses',
  'league-table': 'council league table',
  'council-page': 'council page',
};
export function signupSourceName(source: string | null | undefined): string {
  if (!source) return 'Not recorded';
  if (SIGNUP_SOURCES[source]) return SIGNUP_SOURCES[source];
  const data = source.startsWith('data-') ? DATA_PAGES[source.slice(5)] : undefined;
  return data ? `Data page: ${data}` : source;
}

// Owner notification: fires when someone CONFIRMS a newsletter subscription (the click in the
// confirmation email), so unconfirmed or mistyped sign-ups do not notify. Requested by the
// owner, 16 Oct 2026. Never throws; the caller treats it as fire-and-forget.
export async function sendNewsletterSubscriberNotification(sub: {
  email: string;
  source?: string | null;
  confirmedAt: string;
  totalConfirmed?: number | null;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const when = new Date(sub.confirmedAt).toLocaleString('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const where = signupSourceName(sub.source);
  const total = typeof sub.totalConfirmed === 'number' ? String(sub.totalConfirmed) : 'Not available';
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text =
    `New newsletter subscriber (confirmed)\n\n` +
    `Email: ${sub.email}\nSigned up from: ${where}\nConfirmed: ${when} (UK time)\nConfirmed subscribers in total: ${total}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14100d">
      <p style="margin:0 0 10px;font-weight:bold">New newsletter subscriber (confirmed)</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:2px 14px 2px 0;color:#555">Email</td><td>${esc(sub.email)}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Signed up from</td><td>${esc(where)}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Confirmed</td><td>${when} (UK time)</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Confirmed subscribers in total</td><td>${total}</td></tr>
      </table>
    </div>`;
  return deliver('newsletter subscriber notification', key, {
    from, to: SIGNUP_NOTIFY_TO, subject: `New opengovt newsletter subscriber: ${sub.email}`, text, html,
  });
}


// Commission research requests (owner's brief, 24 Oct 2026): the request from /commission, in plain text, to the
// contact inbox, with reply-to set to the client so a reply goes straight to them. The client is not emailed. Uses the
// same key and sender as the emails above; returns { sent: false, reason: 'no_api_key' } when RESEND_API_KEY is
// missing (the route answers 503 before calling this). Never throws.
const COMMISSION_TO = 'contact@opengovt.uk';

export async function sendCommissionRequest(r: {
  name: string;
  email: string;
  organisation: string;
  question: string;
  deadline: string;
  publish: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const received = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const text =
    `Research request from opengovt.uk/commission\n\n` +
    `Name:          ${r.name}\n` +
    `Email:         ${r.email}\n` +
    `Organisation:  ${r.organisation || 'Not given'}\n` +
    `Deadline:      ${r.deadline || 'None given'}\n` +
    `Publishing:    ${r.publish}\n` +
    `Terms read:    Yes\n` +
    `Received:      ${received} (UK time)\n\n` +
    `Question:\n${r.question}\n\n` +
    `Reply to this email to answer the client directly.\n`;

  return deliver('commission request', key, {
    from,
    to: COMMISSION_TO,
    replyTo: r.email,
    subject: `Research request from ${r.name}`,
    text,
  });
}

// Members' weekly digest (job 74). Its own function and its own log (alert_log, lib/member-digest.ts), so the daily
// cap of 60 digests only ever counts digests: confirmation, password reset, commission request and owner emails never
// go through here and are never held back by it. Carries a one click unsubscribe (List-Unsubscribe with
// List-Unsubscribe-Post) and a plain text part. Never throws.
export async function sendMemberDigest(msg: { to: string; subject: string; text: string; html: string; unsubscribeUrl: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  return deliver('member digest', key, {
    from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html,
    headers: { 'List-Unsubscribe': `<${msg.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
}
