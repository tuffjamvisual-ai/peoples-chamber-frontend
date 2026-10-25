// Account settings safe to use in the browser as well as on the server (25 Oct 2026, report 70). lib/auth-tokens.ts
// uses these with Node's crypto, which the browser bundle must not import.

export const VERIFY_TOKEN_TTL_DAYS = 7; // email confirmation links last 7 days
export const VERIFY_TOKEN_TTL_MS = VERIFY_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/** "j***@example.org": the first character of an address, then the domain, so a page can show where a link went. */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split('@');
  if (!local || !domain) return '';
  return `${local[0]}***@${domain}`;
}
