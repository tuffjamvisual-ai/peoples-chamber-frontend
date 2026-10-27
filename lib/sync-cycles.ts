// How long each scheduled sync may take to finish a full pass (job 79, report 79, 27 Oct 2026). A run stopped by its
// time budget or a rate limit returns 200 with partial: true and carries on next run; lib/sync-heartbeat.ts records,
// in sync_cursor under "cycle:<route>", when the sync last finished a pass and since when its runs have been partial.
// The freshness monitor counts partial runs as healthy until the partial streak is older than the route's period here,
// then alerts: the sync is not getting through its work.
//
// What "a full pass" means for each sync is set by the sync itself (its partial flag): for a sync that works through a
// queue a slice at a time by design (sync-mp-contributions, sync-bill-stages), partial means work is still overdue
// after the run; for the others it means the run stopped before finishing what was due.

const DAY_H = 24;

export const CYCLE_HOURS: Record<string, number> = {
  '/api/sync-press-releases': 1 * DAY_H,
  '/api/sync-commons-press-releases': 1 * DAY_H,
  '/api/check-press-release-liveness': 2 * DAY_H,
  '/api/sync-members-contributions': 2 * DAY_H,
  '/api/sync-committees': 2 * DAY_H,
  '/api/sync-edms': 3 * DAY_H,
  '/api/sync-government-contracts': 3 * DAY_H,
  '/api/sync-member-biography': 3 * DAY_H,
  '/api/sync-committee-memberships': 3 * DAY_H,
  '/api/sync-hansard-contributions': 3 * DAY_H,
  '/api/sync-person-cache': 3 * DAY_H,
  '/api/sync-electoral-commission-donations': 4 * DAY_H,
  '/api/sync-mp-contributions': 7 * DAY_H,
  '/api/sync-bill-stages': 7 * DAY_H,
  '/api/sync-bill-commons-votes': 7 * DAY_H,
  '/api/sync-bill-sponsors': 7 * DAY_H,
  '/api/sync-ministers-meetings': 8 * DAY_H,
  '/api/sync-standards-committee': 8 * DAY_H,
};

// Any other route (one stopped by a rate limit through withHeartbeat): three days for a daily or more frequent
// schedule, eight for a weekly one, 35 for a monthly one.
export function cycleHours(route: string, schedule: string | undefined): number {
  if (CYCLE_HOURS[route]) return CYCLE_HOURS[route];
  const [, , dom, , dow] = (schedule ?? '').split(' ');
  if (dom && dom !== '*') return 35 * DAY_H;
  if (dow && dow !== '*') return 8 * DAY_H;
  return 3 * DAY_H;
}
