// The nightly page refresh, started by the syncs (JF1d, audit JA1, 9 Nov 2026). /api/refresh-nightly-pages ran only at
// 05:15 UTC, assuming the GitHub nightly syncs had finished, but GitHub starts them hours late (daily-context-update
// ended 05:52 on 5 Nov, daily-sync starts 08:32 to 09:56), so their pages waited a day. Each nightly sync now calls
// the route with ?trigger=<workflow> as its last step. The route notes each trigger that reaches it in sync_cursor
// MARKER_ROUTE for the day (UTC); the 05:15 clock run stays as the fallback and does nothing when a sync has already
// triggered the refresh that day. A trigger refused by Vercel's bot protection never reaches the route, so then the clock
// run refreshes as before.
export const MARKER_ROUTE = 'refresh-nightly-pages:triggered';
export type TriggerMarker = { date: string; by: string[]; at: string };

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

// The marker after a trigger from `by` at `now`: a new day starts a new list.
export function withTrigger(marker: TriggerMarker | null, by: string, now: Date): TriggerMarker {
  const today = utcDay(now);
  const list = marker && marker.date === today ? marker.by : [];
  return { date: today, by: list.includes(by) ? list : [...list, by], at: now.toISOString() };
}

// For the clock run: the reason to do nothing, or null to refresh.
export function clockSkip(marker: TriggerMarker | null, now: Date): string | null {
  if (!marker || marker.date !== utcDay(now) || !marker.by.length) return null;
  return `already refreshed today, triggered by ${marker.by.join(', ')} (last at ${marker.at.slice(11, 16)} UTC)`;
}

// A trigger name from the address: a workflow file name, letters, digits, dots, hyphens and underscores only.
export const triggerName = (v: string | null) => (v && /^[A-Za-z0-9._-]{1,60}$/.test(v) ? v : null);
