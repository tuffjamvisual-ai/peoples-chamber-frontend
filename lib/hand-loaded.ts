// Period keys for the hand-loaded datasets check (migration 2026-10-21r). A period is compared by the first thing in
// it: an ISO date ("2026-02-23") as text, then a month ("2026-07", or "202607" as Stat-Xplore writes it) as
// "YYYY-MM" text, otherwise its first four-digit year ("2026-27" -> 2026, "mid-2025" -> 2025, "2024 to 2025" -> 2024).
export type PeriodKey = string | number;

export function periodKey(text: string): PeriodKey | null {
  const date = /\b(20\d\d-\d\d-\d\d)\b/.exec(text);
  if (date) return date[1];
  const month = /\b(20\d\d)-?(0[1-9]|1[0-2])\b(?!-\d)/.exec(text);
  if (month) return `${month[1]}-${month[2]}`;
  const year = /\b(20\d\d)\b/.exec(text);
  return year ? Number(year[1]) : null;
}

export function isNewer(found: PeriodKey, held: PeriodKey): boolean {
  return typeof found === typeof held && found > held;
}

// The newest period matching pattern in a page's text (the first capture group of each match), or null.
export function newestPeriod(body: string, pattern: string): { key: PeriodKey; text: string } | null {
  let best: { key: PeriodKey; text: string } | null = null;
  for (const m of body.matchAll(new RegExp(pattern, 'g'))) {
    const key = periodKey(m[1] ?? m[0]);
    if (key != null && (!best || isNewer(key, best.key))) best = { key, text: m[0] };
  }
  return best;
}
