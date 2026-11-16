// The homepage's four featured reports for a day (moved here from app/page.tsx, 16 Nov 2026, COWORK-TO-T1 ENTRY 140, so
// the same rule runs in the browser: app/components/HomeFeatured.tsx). All 4 slots rotate daily through the 16 most
// recent reports, so newer stories cycle through every position; a chosen report can hold the lead (owner, 5 Nov 2026).
// No server code here.
export type FeaturedItem = { slug: string; headline: string; label: string; summary: string; lede: string | null };

/** The pool (newest first, at most 16) in today's order, with the held lead first when there is one. */
export function rotate<T extends { slug: string }>(pool: T[], day: number, leadSlug: string, lead: T | null): T[] {
  const shuffled = [...pool];
  let seed = day;
  for (let idx = shuffled.length - 1; idx > 0; idx--) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const pick = seed % (idx + 1);
    [shuffled[idx], shuffled[pick]] = [shuffled[pick], shuffled[idx]];
  }
  // The held lead swaps places with whichever report the rotation put first, so every other position stays as the
  // rotation set it; a held lead older than the pool replaces the first.
  const at = shuffled.findIndex((e) => e.slug === leadSlug);
  if (at > 0) [shuffled[0], shuffled[at]] = [shuffled[at], shuffled[0]];
  else if (at < 0 && lead) shuffled[0] = lead;
  return shuffled;
}
