// Checks the vercel.json cron schedule against job 79's rules (report 79, 27 Oct 2026):
//   - no two heavy syncs start in the same 10 minutes of the clock (:00 to :09, :10 to :19 and so on), on any day of
//     the week (job 79's rule);
//   - a slot added since job 79 (NEW below) is also at least 10 minutes from every other heavy start;
//   - no two crons share a minute;
//   - nothing starts on the hour;
//   - the minutes in KEEP_FREE stay free of heavy syncs (02:40 to 02:49 UTC, for the laws and treaties sync at 02:45);
//   - every path in vercel.json has a route file.
// Heavy: a sync that ran over half its time limit in the 14 days before 27 Oct, or whose limit is 300 s, plus the
// syncs added since (listed below with their job). Run: npx tsx scripts/checks/cron-schedule-check.ts [vercel.json]
import fs from 'fs';
import path from 'path';

const HEAVY = new Set([
  '/api/sync-reshuffle-tick', '/api/sync-press-releases', '/api/sync-commons-press-releases', '/api/check-press-release-liveness',
  '/api/sync-members-contributions', '/api/sync-bill-stages', '/api/sync-mp-contributions', '/api/sync-member-biography',
  '/api/sync-hansard-contributions', '/api/sync-electoral-commission-donations', '/api/sync-government-contracts',
  '/api/sync-mp-written-questions', '/api/sync-debates', '/api/sync-govuk-data', '/api/sync-petitions', '/api/sync-person-cache',
  '/api/sync-edms', '/api/sync-edms?retry=1', '/api/sync-claimant-count', '/api/sync-bill-commons-votes', '/api/sync-bill-sponsors',
  '/api/sync-commons-votes-api', '/api/sync-committees', '/api/sync-committee-memberships', '/api/monitor-freshness',
  '/api/sync-ministers-meetings', '/api/sync-agency-cache', '/api/sync-civil-service-salaries', '/api/check-hand-loaded-releases',
  '/api/recompute-activity-metrics', '/api/sync-standards-committee', '/api/sync-spad-transparency',
  '/api/send-member-digests',                                   // job 74
  '/api/sweep-electoral-commission-donations',                   // day job 27 Oct, Part 3
]);
const NEW = new Set(['/api/send-member-digests', '/api/sweep-electoral-commission-donations']);
const KEEP_FREE = [{ from: 2 * 60 + 40, to: 2 * 60 + 49 }];

function expand(field: string, lo: number, hi: number): number[] {
  const out = new Set<number>();
  for (const part of field.split(',')) {
    const [range, stepS] = part.split('/');
    const step = stepS ? Number(stepS) : 1;
    let a = lo, b = hi;
    if (range !== '*') { const [x, y] = range.split('-').map(Number); a = x; b = y ?? (stepS ? hi : x); }
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return [...out];
}

// Every start in a week, as minutes from Sunday 00:00. A day of month field other than * is treated as any day.
function startsInWeek(schedule: string): number[] {
  const [m, h, , , dow] = schedule.trim().split(/\s+/);
  const days = dow === '*' ? [0, 1, 2, 3, 4, 5, 6] : expand(dow, 0, 6).map((d) => d % 7);
  const out: number[] = [];
  for (const d of days) for (const hh of expand(h, 0, 23)) for (const mm of expand(m, 0, 59)) out.push(d * 1440 + hh * 60 + mm);
  return out;
}

const file = process.argv[2] ?? 'vercel.json';
const crons = (JSON.parse(fs.readFileSync(file, 'utf8')).crons ?? []) as { path: string; schedule: string }[];
const problems: string[] = [];
const WEEK = 7 * 1440;
const starts: { path: string; at: number; heavy: boolean }[] = [];
for (const c of crons) {
  for (const at of startsInWeek(c.schedule)) starts.push({ path: c.path, at, heavy: HEAVY.has(c.path) });
  if (c.schedule.trim().split(/\s+/)[0].split(',').some((x) => x === '0' || x === '*' || x.startsWith('*/') || x.startsWith('0-'))) problems.push(`${c.path} (${c.schedule}) starts on the hour`);
  const routeFile = path.join('app', c.path.split('?')[0], 'route.ts');
  if (!fs.existsSync(routeFile)) problems.push(`${c.path}: no ${routeFile}`);
}
const fmt = (at: number) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Math.floor(at / 1440)]} ${String(Math.floor((at % 1440) / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`;
starts.sort((a, b) => a.at - b.at);
const seen = new Set<string>();
for (let i = 0; i < starts.length; i++) {
  for (let j = i + 1; j < starts.length + 1; j++) {
    const b = starts[j % starts.length];
    const gap = (b.at - starts[i].at + WEEK) % WEEK;
    if (j >= starts.length && gap > 10) break;
    if (j < starts.length && gap > 10) break;
    if (b === starts[i]) continue;
    const a = starts[i];
    if (a.path === b.path) continue;
    const key = [a.path, b.path].sort().join(' & ');
    if (gap === 0 && !seen.has('m' + key)) { problems.push(`same minute: ${key} at ${fmt(a.at)}`); seen.add('m' + key); }
    else if (a.heavy && b.heavy && Math.floor(a.at / 10) === Math.floor(b.at / 10) && !seen.has('h' + key)) { problems.push(`heavy in the same 10 minutes: ${key} (${fmt(a.at)} and ${fmt(b.at)})`); seen.add('h' + key); }
    else if (a.heavy && b.heavy && gap < 10 && (NEW.has(a.path) || NEW.has(b.path)) && !seen.has('n' + key)) { problems.push(`new slot within 10 minutes of a heavy sync: ${key} (${fmt(a.at)} and ${fmt(b.at)})`); seen.add('n' + key); }
  }
}
for (const s of starts) {
  const t = s.at % 1440;
  if (s.heavy && KEEP_FREE.some((k) => t >= k.from && t <= k.to)) problems.push(`${s.path} starts at ${fmt(s.at)}, in a slot kept free`);
}
const heavyNotListed = crons.filter((c) => !HEAVY.has(c.path)).length;
console.log(`${crons.length} schedules, ${starts.length} starts a week, ${crons.length - heavyNotListed} heavy`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('schedule ok: no two heavy syncs in the same 10 minutes, new slots 10 minutes clear, no shared minute, nothing on the hour, kept free slots free, every route exists');
