// Email link tokens (password reset, email confirmation) and password hashing settings
// (owner's approval, 22 Oct 2026). The raw token goes only into the emailed link; the database
// keeps its SHA-256 hash, so a copy of the users table cannot be used to reset a password or
// confirm an address.
import crypto from 'crypto';

export const BCRYPT_COST = 12;
export const VERIFY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // confirmation links last 7 days

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** A new random token: `raw` for the email link, `hash` for the database. */
export function newToken(): { raw: string; hash: string } {
  const raw = crypto.randomUUID();
  return { raw, hash: hashToken(raw) };
}
