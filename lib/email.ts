import { Resend } from 'resend';
import type { DatabaseSize } from '@/lib/database-size';

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

  try {
    const resend = new Resend(key);
    // Resend resolves (does not throw) on API-level rejections — e.g. an
    // unverified RESEND_FROM domain or an invalid recipient come back in
    // `error`, not as an exception. Inspect it so we never report a false
    // `sent: true`. `throw` is reserved for network/transport failures.
    const { data, error } = await resend.emails.send({
      from, to: SIGNUP_NOTIFY_TO, subject, text, html,
    });
    if (error) return { sent: false, reason: error.message, to: SIGNUP_NOTIFY_TO, from };
    return { sent: true, id: data?.id, to: SIGNUP_NOTIFY_TO, from };
  } catch (e) {
    return { sent: false, reason: (e as Error).message, to: SIGNUP_NOTIFY_TO, from };
  }
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

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to: BRIEFINGS_NOTIFY_TO,
      subject: `opengovt briefings for review: ${new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })} (${briefings.length})`,
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

export async function sendPasswordResetEmail(to: string, token: string, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
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
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

export async function sendVerificationEmail(to: string, token: string, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';
  const link = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      subject: 'Confirm your opengovt account',
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14100d">
        <p>Welcome to opengovt.</p>
        <p>Confirm your email address to start voting on bills and polls:</p>
        <p><a href="${link}" style="display:inline-block;background:#6b2417;color:#ffffff;padding:11px 20px;border-radius:4px;text-decoration:none">Confirm my email</a></p>
        <p style="font-size:14px;color:#555">Or paste this link into your browser:<br>${link}</p>
        <p style="font-size:14px;color:#555">If you did not create an account, you can ignore this email.</p>
      </div>`,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt data freshness: ${stale.length} source${stale.length === 1 ? '' : 's'} overdue`, text, html,
    });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`, text, html,
    });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({ from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`, text, html });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({ from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt: ${headline}`, text, html });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({ from, to: FRESHNESS_NOTIFY_TO, subject: `opengovt: ${headline}`, text, html });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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
    `Please confirm you want the opengovt weekly newsletter, sent on Sundays.\n\n` +
    `Confirm: ${confirm}\n\n` +
    `If you did not ask for this, ignore this email and you will not be added.\n` +
    `Unsubscribe at any time: ${unsubscribe}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14100d">
      <p>Please confirm you want the opengovt weekly newsletter, sent on Sundays.</p>
      <p><a href="${confirm}" style="display:inline-block;background:#7a1612;color:#ffffff;padding:10px 16px;text-decoration:none;font-weight:bold">Confirm my subscription</a></p>
      <p style="color:#555">If you did not ask for this, ignore this email and you will not be added.</p>
      <p style="color:#555;font-size:13px">Unsubscribe at any time: <a href="${unsubscribe}" style="color:#555">${unsubscribe}</a></p>
    </div>`;
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from, to, subject: 'Confirm your opengovt newsletter subscription', text, html,
      headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
    });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
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
  const where = sub.source === 'newsletter-page' ? 'Newsletter page' : sub.source === 'homepage' ? 'Homepage' : (sub.source || 'Not recorded');
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
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from, to: SIGNUP_NOTIFY_TO, subject: `New opengovt newsletter subscriber: ${sub.email}`, text, html,
    });
    if (error) return { sent: false, reason: error.message };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

