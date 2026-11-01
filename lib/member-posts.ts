// Government and opposition posts and committee memberships on mp_biography, as the Members API Biography gives them,
// and the rules for merging the live source into the stored arrays (used by /api/sync-member-biography). Moved here
// from the route on 1 Nov 2026 so the same code can be checked against current data without a run.
import { ukDate } from '@/lib/bio-review';

export interface Post {
  id: number;
  name: string;
  house?: number;
  startDate?: string | null;
  endDate?: string | null;
  additionalInfo?: string | null;
  additionalInfoLink?: string | null;
}

// One spell in a post (owner, 1 Nov 2026). A source post is the same spell as a stored post with the same post id whose
// start date is within SAME_SPELL_DAYS of it (the nearest, if more than one); it is handled as before and never added
// again. Only a start more than SAME_SPELL_DAYS from every stored spell of that post is a new spell, added as its own
// entry (15 such repeat spells were missing on 1 Nov 2026, such as Angela Rayner's return as Housing Secretary on
// 20 Jul 2026). A missing start date on either side counts as the same spell, so it never adds a second entry.
export const SAME_SPELL_DAYS = 31;
const day = (s: string | null | undefined) => (s ? Date.parse(`${s.slice(0, 10)}T00:00:00Z`) / 86_400_000 : NaN);
function daysApart(a: Post, b: Post): number {
  const x = day(a.startDate), y = day(b.startDate);
  return Number.isNaN(x) || Number.isNaN(y) ? 0 : Math.abs(x - y);
}
export function sameSpellIndex(stored: Post[], src: Post): number {
  let best = -1;
  for (let i = 0; i < stored.length; i++) {
    if (stored[i].id !== src.id) continue;
    const d = daysApart(stored[i], src);
    if (d <= SAME_SPELL_DAYS && (best < 0 || d < daysApart(stored[best], src))) best = i;
  }
  return best;
}

// Reconcile a stored array with the live source under the monotonic-close + override rules. Returns the merged array
// and whether anything actually changed.
export function reconcile(existing: Post[] | null, source: Post[], overridden: Set<number>): { merged: Post[]; changed: boolean } {
  const merged = [...(existing || [])];
  let changed = false;

  for (const src of source) {
    if (overridden.has(src.id)) continue; // never touch an overridden post (any spell of it)
    const i = sameSpellIndex(merged, src);
    if (i < 0) {
      merged.push(src); // genuinely new post, or a new spell in a post held before
      changed = true;
      continue;
    }
    const cur = merged[i];
    const hasEnd = cur.endDate != null && cur.endDate !== '';
    if (!hasEnd && src.endDate) {
      merged[i] = { ...cur, endDate: src.endDate }; // fill a null end date only
      changed = true;
    }
    // If cur already has an endDate, leave it (monotonic close, never reopen).
  }
  // Existing posts absent from the source are kept as-is (never deleted).
  return { merged, changed };
}

// Plain-English list of posts that started or ended between the stored array and the live source (same matching and
// override rules as reconcile), for the biography review flag.
export function postChanges(existing: Post[] | null, source: Post[], overridden: Set<number>): string[] {
  const stored = existing || [];
  const out: string[] = [];
  for (const src of source) {
    if (overridden.has(src.id)) continue;
    const i = sameSpellIndex(stored, src);
    const cur = i < 0 ? null : stored[i];
    if (!cur) {
      if (!src.endDate) out.push(`Started: ${src.name}${src.startDate ? ` (${ukDate(src.startDate)})` : ''}`);
    } else if (!(cur.endDate != null && cur.endDate !== '') && src.endDate) {
      out.push(`Ended: ${src.name} (${ukDate(src.endDate)})`);
    }
  }
  return out;
}
