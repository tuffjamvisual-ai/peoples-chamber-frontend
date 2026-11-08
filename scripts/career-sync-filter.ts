// Entry by entry validation for scripts/sync-career-parliament.ts (owner, PCL1, 8 Nov 2026): an entry that fails
// lib/career-timeline.ts validate() is left out on its own, with the raw API record it came from and the reason, and
// the MP keeps the rest of the timeline. Before this, one bad record in Parliament's data (a committee membership ending
// before it started) left out the MP's whole timeline. Every check in validate() is about one entry, so checking each
// entry alone finds the same problems as checking the array.
import { validate, type CareerEntry } from '../lib/career-timeline';

export type Built = { entry: CareerEntry; raw: unknown };
export type Excluded = { member_id: number; name: string; reason: string; entry: CareerEntry; raw: unknown };

// A run leaving out more than this many entries in total stops before writing anything.
export const MAX_EXCLUDED = 10;

export function keepValid(memberId: number, name: string, built: Built[]): { kept: CareerEntry[]; excluded: Excluded[] } {
  const kept: CareerEntry[] = [];
  const excluded: Excluded[] = [];
  for (const b of built) {
    const problems = validate([b.entry]);
    if (problems.length) excluded.push({ member_id: memberId, name, reason: problems.map((p) => p.replace(/^entry 1: /, '')).join('; '), entry: b.entry, raw: b.raw });
    else kept.push(b.entry);
  }
  return { kept, excluded };
}
