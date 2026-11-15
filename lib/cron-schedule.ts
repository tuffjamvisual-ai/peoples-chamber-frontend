// The most recent time a five-field cron schedule (as in vercel.json, UTC) fired at or before a given time. Supports
// what vercel.json uses: *, numbers, comma lists, */n steps, and ranges a-b and a-b/n (since 15 Nov 2026, T1-PRESSWEEKDAY:
// the press jobs run on days 1-5, and '16 1-23/2' was already in use; without ranges such a schedule never matched, so its
// missed runs went unseen). Used by the freshness monitor to spot a cron that missed its run (owner's approval, 21 Oct 2026).

function partMatches(p: string, n: number): boolean {
  const [range, stepText] = p.split('/');
  const step = stepText ? Number(stepText) : 1;
  if (range === '*') return n % step === 0;
  if (range.includes('-')) {
    const [a, b] = range.split('-').map(Number);
    return n >= a && n <= b && (n - a) % step === 0;
  }
  return Number(range) === n;
}

function fieldMatches(field: string, n: number): boolean {
  if (field === '*') return true;
  return field.split(',').some((p) => partMatches(p, n));
}

export function lastFireAtOrBefore(schedule: string, at: Date, lookbackDays = 40): Date | null {
  const [mi, h, dom, mo, dow] = schedule.trim().split(/\s+/);
  const t = new Date(at); t.setUTCSeconds(0, 0);
  const stop = at.getTime() - lookbackDays * 86_400_000;
  // Walk back hour by hour, then pick the latest matching minute inside the hour.
  for (let hour = new Date(t); hour.getTime() > stop; hour = new Date(hour.getTime() - 3_600_000)) {
    if (!fieldMatches(mo, hour.getUTCMonth() + 1) || !fieldMatches(dom, hour.getUTCDate()) || !fieldMatches(dow, hour.getUTCDay()) || !fieldMatches(h, hour.getUTCHours())) continue;
    const maxMinute = hour.getTime() === t.getTime() ? t.getUTCMinutes() : 59;
    for (let m = maxMinute; m >= 0; m--) {
      if (fieldMatches(mi, m)) { const d = new Date(hour); d.setUTCMinutes(m, 0, 0); return d; }
    }
  }
  return null;
}
