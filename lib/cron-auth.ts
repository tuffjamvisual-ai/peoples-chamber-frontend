// One check for "Authorization: Bearer <CRON_SECRET>" on the scheduled and internal routes (security review L1 and L2,
// owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 59). It fails closed: with no secret set, nothing is authorised (some
// routes used to skip the check when CRON_SECRET was missing, and others compared with "Bearer undefined"). The
// comparison takes the same time however much of the header matches (crypto.timingSafeEqual on SHA-256 digests, so
// different lengths do not show either).
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (s: string) => createHash('sha256').update(s).digest();

export function bearerMatches(header: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret || !header) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
