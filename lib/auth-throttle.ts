// Failure backoff for sign-in and password change (security review M3 and L4, owner approved 14 Nov 2026,
// COWORK-TO-T1 ENTRY 59). Before: no limit, so a password could be guessed without pause.
//  - Per account: 5 failed attempts within 15 minutes -> that account is refused for 15 minutes.
//  - Per IP: 20 failed attempts within 15 minutes -> that IP is refused for 15 minutes.
// A successful sign-in clears the account's failures. Counted in each server instance's memory: a best-effort limit, as
// a shared one would need a database table (a database change, for the owner). The refusal says the same whether or
// not the account exists.
// L4: sign-in compares a password even when no account has the address (DUMMY_HASH), so both answers take as long.
export const WINDOW_MS = 15 * 60 * 1000;
export const ACCOUNT_MAX = 5;
export const IP_MAX = 20;
export const DUMMY_HASH = '$2b$12$PW9ClwE5OsitXb6xwVDMaeZwguXSTHl5yjlBKvrYoI/6P6NHjsoI6'; // a random password, cost 12
export const TOO_MANY = 'Too many attempts. Please wait 15 minutes and try again.';

const fails = new Map<string, number[]>();
const recentOf = (key: string, now: number) => (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
export function blocked(email: string, ip: string, now = Date.now()): boolean {
  return recentOf(`a|${email}`, now).length >= ACCOUNT_MAX || recentOf(`i|${ip}`, now).length >= IP_MAX;
}
export function noteFailure(email: string, ip: string, now = Date.now()): void {
  if (fails.size > 10000) for (const [k] of fails) if (!recentOf(k, now).length) fails.delete(k);
  for (const key of [`a|${email}`, `i|${ip}`]) fails.set(key, [...recentOf(key, now), now]);
}
export function clearAccount(email: string): void { fails.delete(`a|${email}`); }
