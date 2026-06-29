import { Resend } from 'resend';

// Email sending is "armed but inert" until RESEND_API_KEY is set. When it is
// absent, sendVerificationEmail is a no-op and signup auto-verifies accounts so
// nothing breaks. Once the key (and a verified RESEND_FROM domain) are added,
// new accounts must confirm their email before they can vote.
export const emailEnabled = !!process.env.RESEND_API_KEY;

export async function sendVerificationEmail(to: string, token: string, baseUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_api_key' };
  const from = process.env.RESEND_FROM || 'Open Govt <onboarding@resend.dev>';
  const link = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      subject: 'Confirm your Open Govt account',
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#14100d">
        <p>Welcome to Open Govt.</p>
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
