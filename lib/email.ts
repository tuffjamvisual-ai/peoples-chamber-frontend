import { Resend } from 'resend';

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
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'opengovt <onboarding@resend.dev>';

  const when = user.createdAt ? new Date(user.createdAt) : new Date();
  const timestamp = when.toLocaleString('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const username = user.username?.trim() || '— not provided';
  const status = user.emailVerified ? 'auto-verified (email confirmation off)' : 'pending email confirmation';

  const text =
    `New user registered on opengovt.\n\n` +
    `Email:      ${user.email}\n` +
    `Username:   ${username}\n` +
    `Verified:   ${status}\n` +
    `Signed up:  ${timestamp} (UK time)\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">New user registered on opengovt.</p>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:2px 14px 2px 0;color:#555">Email</td><td>${user.email}</td></tr>
        <tr><td style="padding:2px 14px 2px 0;color:#555">Username</td><td>${username}</td></tr>
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
      from, to: SIGNUP_NOTIFY_TO, subject: `New opengovt signup: ${user.email}`, text, html,
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
    : 'These are DRAFTS — not public, not listed, not indexed. Review every claim, then flip is_published to true to publish.';

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
      subject: `opengovt briefings for review — ${new Date().toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })} (${briefings.length})`,
      text,
      html,
    });
    return { sent: true };
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
        <p style="font-size:13px;color:#555">Or paste this link into your browser:<br>${link}</p>
        <p style="font-size:13px;color:#555">If you did not create an account, you can ignore this email.</p>
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
    return `${s.page} is serving stale data: ${s.label} — ${age}${last}.`;
  };

  const lines = stale.map(fmt);
  const text = `Data freshness alert — ${stale.length} source${stale.length === 1 ? '' : 's'} overdue.\n\n${lines.join('\n')}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#14100d">
      <p style="margin:0 0 12px;font-weight:bold">Data freshness alert — ${stale.length} source${stale.length === 1 ? '' : 's'} overdue.</p>
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
