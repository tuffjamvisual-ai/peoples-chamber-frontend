// Weekly top up of each MP's spoken contribution totals (T1-MPINCR, owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 125):
// instead of re-reading every MP's whole record since 4 July 2024, one weekly run reads only the Commons contributions
// dated since the last count (Hansard search/contributions/Spoken.json with queryParameters.startDate, endDate and
// house=Commons, all MPs at once, 100 a page) and adds them to the stored totals.
//
// "Counted through": an MP's stored total covers sitting days up to the day before its spoken_synced_at (the per-MP
// count reads startDate 2024-07-04 to yesterday; lib/mp-contributions-sync.ts). The window starts OVERLAP_DAYS before
// the earliest of those, because Hansard can publish a day's speeches late. A contribution dated after an MP's counted-
// through day is new. One dated in the overlap is new only if its ContributionExtId was not seen by the last weekly run,
// whose overlap ids are kept in the cursor; without that list (the first weekly run) only later days count, so nothing
// is ever counted twice.

import { countWords } from '@/lib/mp-contributions-sync';

export const OVERLAP_DAYS = 2;
export const INCREMENTAL_CURSOR = '/api/sync-mp-contributions:incremental';
export type IncrementalCursor = { through: string; ids: string[] };
export type Contribution = { memberId: number; extId: string; day: string; text: string };

export const dayBefore = (iso: string, days = 1) => new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
// The last sitting day an MP's stored total covers: the day before it was counted.
export const countedThrough = (spokenSyncedAt: string) => dayBefore(spokenSyncedAt.slice(0, 10));

export function windowStart(through: Iterable<string>): string | null {
  let min: string | null = null;
  for (const d of through) if (!min || d < min) min = d;
  return min ? dayBefore(min, OVERLAP_DAYS - 1) : null;
}

// What to add to each MP, and the ids to keep for the next run's overlap.
export function applyWindow(
  items: Contribution[],
  through: Map<number, string>,
  seenBefore: Set<string> | null,
  windowEnd: string,
): { add: Map<number, { n: number; words: number }>; keepIds: string[]; counted: number; skippedSeen: number } {
  const add = new Map<number, { n: number; words: number }>();
  const keep = new Set<string>();
  const keepFrom = dayBefore(windowEnd, OVERLAP_DAYS - 1);
  const seenNow = new Set<string>();
  let counted = 0, skippedSeen = 0;
  for (const c of items) {
    if (seenNow.has(c.extId)) continue; // a page boundary can repeat a row
    seenNow.add(c.extId);
    if (c.day >= keepFrom) keep.add(c.extId);
    const ct = through.get(c.memberId);
    if (!ct) continue; // no stored total yet: the per-MP count takes that MP
    const isNew = c.day > ct || (seenBefore !== null && c.day > dayBefore(ct, OVERLAP_DAYS) && !seenBefore.has(c.extId));
    if (!isNew) { skippedSeen++; continue; }
    const a = add.get(c.memberId) ?? { n: 0, words: 0 };
    a.n++; a.words += countWords(c.text);
    add.set(c.memberId, a);
    counted++;
  }
  return { add, keepIds: [...keep], counted, skippedSeen };
}
