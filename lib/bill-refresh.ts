// Bill pages refreshed by their syncs (cache Stage 2a, part 2, owner, 30 Oct 2026). /bills/[id] and /bills/[id]/full
// keep their pages and Parliament answers for a week, so whatever writes a bill's data refreshes that bill: its two
// paths and the 'bill:<id>' tag (its publications and text, lib/bill-text.ts), and the page of each MP who sponsors it.
// Only bills whose stored data actually changed are refreshed, at most REFRESH_BATCH at a time.
import { revalidatePath, revalidateTag } from 'next/cache';

export const billTag = (id: number) => `bill:${id}`;
export const REFRESH_BATCH = 300;

// The MP whose page lists the bill as sponsored: bill.sponsor_member_id (app/mps/[id]/page.tsx reads bills by it).
// (bill.sponsors.items[].memberId is not used: the sponsors sync has always stored it as null.)
export const sponsorOf = (row: { sponsor_member_id?: number | null }): number[] => (typeof row.sponsor_member_id === 'number' ? [row.sponsor_member_id] : []);

// Refreshes the given bills and MPs; returns how many of each.
export function refreshBills(billIds: Iterable<number>, memberIds: Iterable<number> = []): { bills: number; mps: number } {
  const bills = [...new Set(billIds)].filter((n) => Number.isInteger(n) && n > 0);
  const mps = [...new Set(memberIds)].filter((n) => Number.isInteger(n) && n > 0);
  for (let i = 0; i < bills.length; i += REFRESH_BATCH) {
    for (const id of bills.slice(i, i + REFRESH_BATCH)) {
      revalidatePath(`/bills/${id}`);
      revalidatePath(`/bills/${id}/full`);
      revalidateTag(billTag(id), 'max');
    }
  }
  for (let i = 0; i < mps.length; i += REFRESH_BATCH) for (const id of mps.slice(i, i + REFRESH_BATCH)) revalidatePath(`/mps/${id}`);
  return { bills: bills.length, mps: mps.length };
}

// Stored JSON compared by value with the keys in a fixed order, so a re-read that only reorders keys is not a change.
// A null field and an absent one are the same (sponsors stored before 21 Oct 2026 have no organisation key; the API's
// copy has organisation: null), so only a real difference counts.
export function sameJson(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(canon)
      : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] != null).map((k) => [k, canon((v as Record<string, unknown>)[k])]))
      : v ?? null;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}
