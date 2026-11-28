// Limits on the routes that email an address someone types in (security review M2, owner approved 14 Nov 2026,
// COWORK-TO-T1 ENTRY 59): the newsletter sign-up (/api/newsletter/subscribe) and the account sign-up (/api/auth/signup).
// Without them a script could make the site send confirmation emails to any addresses until Resend's free plan
// allowance (100 emails a UTC day) ran out, which would also stop the weekly issue and real readers' confirmations.
//  - Per IP: at most 5 an hour per route, as /api/feedback. Kept in each server instance's memory, so a best-effort
//    limit, not a shared one.
//  - Daily caps, shared: counted from the database for the current UTC day (Resend's day): newsletter confirmations
//    (newsletter_subscribers.last_sent_at) at most 30 a day; account sign-ups (users.verification_sent_at) at most 20 a
//    day (each sends two emails: the confirmation and the owner's notice). Together at most 70 a day, which leaves room
//    for the issue (4 confirmed subscribers on 15 Nov 2026) and tests. A cap that cannot be read counts as reached.
import type { SupabaseClient } from '@supabase/supabase-js';

export const IP_WINDOW_MS = 60 * 60 * 1000;
export const IP_MAX = 5;
export const DAILY_CAP = { newsletter: 30, signup: 20 } as const;

const recent = new Map<string, number[]>();
export function overIpLimit(route: string, ip: string, now = Date.now()): boolean {
  if (recent.size > 5000) for (const [k, v] of recent) if (!v.some((t) => now - t < IP_WINDOW_MS)) recent.delete(k);
  const key = `${route}|${ip}`;
  const times = (recent.get(key) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (times.length >= IP_MAX) { recent.set(key, times); return true; }
  recent.set(key, [...times, now]);
  return false;
}
export { clientIp } from './client-ip'; // ENTRY 795: one helper for every rate limit (lib/client-ip.ts)
export const utcDayStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

const TABLE = { newsletter: ['newsletter_subscribers', 'last_sent_at'], signup: ['users', 'verification_sent_at'] } as const;
export async function dailyCapReached(db: SupabaseClient, kind: keyof typeof DAILY_CAP, now = new Date()): Promise<boolean> {
  const [table, col] = TABLE[kind];
  const { count, error } = await db.from(table).select('id', { count: 'exact', head: true }).gte(col, utcDayStart(now));
  if (error || count === null) return true;
  return count >= DAILY_CAP[kind];
}
