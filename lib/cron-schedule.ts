// The most recent time a five-field cron schedule (as in vercel.json, UTC) fired at or before a given time. Supports
// what vercel.json uses: *, numbers, comma lists and */n steps. Used by the freshness monitor to spot a cron that
// missed its run (owner's approval, 21 Oct 2026).

function fieldMatches(field: string, n: number): boolean {
  if (field === '*') return true;
  return field.split(',').some((p) => (p.startsWith('*/') ? n % Number(p.slice(2)) === 0 : Number(p) === n));
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
