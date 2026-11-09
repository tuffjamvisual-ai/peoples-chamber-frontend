// The freshness monitor's self heal budget (JF1c, audit JA1, 9 Nov 2026). /api/monitor-freshness has 300 seconds
// (maxDuration). It used to check a 240 second budget only before starting a heal, and each heal could run 180 seconds,
// so a heal begun near 240 seconds ran past 300: Vercel killed the function before the alert email and its own
// heartbeat were written, so the day a sync broke was the day the monitor went quiet. Now the alert is emailed first and
// the heals run last, each given at most the time left before HEAL_DEADLINE_MS (which leaves room to return and write the
// heartbeat), and none starts with less than MIN_HEAL_MS left.
export const MAX_DURATION_MS = 300_000;
export const HEAL_DEADLINE_MS = 270_000; // from the start of the run
export const HEAL_PER_ROUTE_MS = 180_000;
export const MIN_HEAL_MS = 15_000;

// How long the next heal may run, or null when too little time is left to start one.
export function healTimeout(startedAt: number, now: number): number | null {
  const left = startedAt + HEAL_DEADLINE_MS - now;
  if (left < MIN_HEAL_MS) return null;
  return Math.min(HEAL_PER_ROUTE_MS, left);
}
