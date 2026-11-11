// T1-DF (c), 11 Nov 2026 (Cowork): the time from which a cron's current schedule is checked by the freshness monitor. A due
// time earlier than the cron's last schedule change belongs to the old schedule (or to before the cron existed), so a
// "missed" run there is not a missed run. scripts/data/cron-schedules.json holds each cron's schedule and when it went
// live; a cron whose schedule there differs from vercel.json (changed or added, the file not yet updated) counts from the
// build that carries the change, so it never alerts for a window it could not have run in.
import schedules from '../scripts/data/cron-schedules.json';

type Entry = { schedule: string; since: string };
const RECORDED = (schedules as { crons: Record<string, Entry> }).crons;

// Set by next.config.ts when the build starts; outside a build (tests) the caller passes it.
export const BUILD_TIME = process.env.CRON_BUILD_TIME ?? null;

export function scheduleSince(route: string, schedule: string, buildTime: string | null = BUILD_TIME): Date | null {
  const e = RECORDED[route];
  if (e && e.schedule === schedule) return new Date(e.since);
  return buildTime ? new Date(buildTime) : null;
}

// The schedule the monitor checks for each route: the last vercel.json entry for a path without a query string (a route
// with several entries, such as sync-bill-sponsors, is checked against its last one, as the monitor always has).
export function checkedSchedules(crons: Array<{ path: string; schedule: string }>): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of crons) if (!c.path.includes('?')) m.set(c.path, c.schedule);
  return m;
}

// Every route whose checked schedule in vercel.json is not the one recorded (for the check).
export function unrecorded(crons: Array<{ path: string; schedule: string }>): string[] {
  return [...checkedSchedules(crons)].filter(([path, schedule]) => RECORDED[path]?.schedule !== schedule).map(([path]) => path);
}
