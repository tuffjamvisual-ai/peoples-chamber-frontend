// Entry by entry validation for scripts/sync-career-parliament.ts (owner, PCL1, 8 Nov 2026): an entry that fails
// lib/career-timeline.ts validate() is left out on its own, with the raw API record it came from and the reason, and
// the MP keeps the rest of the timeline. Before this, one bad record in Parliament's data (a committee membership ending
// before it started) left out the MP's whole timeline. Every check in validate() is about one entry, so checking each
// entry alone finds the same problems as checking the array.
import { validate, contestTitle, type CareerEntry } from '../lib/career-timeline';

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

// Elections contested and lost (owner, PCL2, 8 Nov 2026): one elections entry per Members API Biography electionsContested
// record, dated to the election day, "Contested <constituency>, <date>, not elected", sourced to the MP's career page. The
// record names no party; its additionalInfo, when Parliament gives one, is kept as the detail. A contest that is already a
// win in representations (same constituency and the same day) is skipped, not shown twice.
export type ContestRecord = { house: number; name: string; id: number; startDate: string | null; endDate?: string | null; additionalInfo?: string | null };
export type Seat = { name: string; startDate: string | null };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function contestEntries(memberId: number, contested: ContestRecord[] | null | undefined, representations: Seat[] | null | undefined): { built: Built[]; skipped: number } {
  const src = { title: 'UK Parliament: Members API, career', url: `https://members.parliament.uk/member/${memberId}/career` };
  const wins = new Set((representations ?? []).map((r) => `${norm(r.name)}|${(r.startDate ?? '').slice(0, 10)}`));
  const built: Built[] = [];
  let skipped = 0;
  for (const c of contested ?? []) {
    const day = c.startDate ? c.startDate.slice(0, 10) : null;
    if (wins.has(`${norm(c.name)}|${day ?? ''}`)) { skipped++; continue; }
    built.push({
      raw: c,
      entry: {
        group: 'elections', start: day, end: day,
        title: day ? contestTitle(c.name, day) : `Contested ${c.name.trim()}, not elected`,
        organisation: c.house === 2 ? 'House of Lords' : 'House of Commons',
        detail: c.additionalInfo?.trim() || null, source: src,
      },
    });
  }
  return { built, skipped };
}
