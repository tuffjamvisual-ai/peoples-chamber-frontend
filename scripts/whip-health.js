// The Data Health Check's whip rule (JF1a, audit JA1, 9 Nov 2026). The party whip figures (party_division_splits) are
// rebuilt by /api/sync-commons-votes-api only when it applies parties to a Commons division (refresh_whip_views after
// apply_division_parties). The Commons does not vote Friday to Sunday or in recess, so the age of the rebuild alone failed
// the check most Sundays and Mondays and through every recess although nothing was stale. The figures are stale only when
// a division had its parties applied after the last rebuild; a sync that has applied them but not yet rebuilt gets an hour.
'use strict';

const GRACE_MS = 60 * 60 * 1000;

// refreshedAt: party_division_splits.refreshed_at; newestAppliedAt: the newest commons_division_totals.parties_applied_at.
function whipVerdict({ refreshedAt, newestAppliedAt, now }) {
  const day = (d) => d.toISOString().slice(0, 10);
  if (!refreshedAt) return { ok: false, detail: 'never rebuilt' };
  const rebuilt = new Date(refreshedAt);
  const newest = newestAppliedAt ? new Date(newestAppliedAt) : null;
  if (newest && newest > rebuilt && now - newest > GRACE_MS) {
    return { ok: false, detail: `a division arrived ${day(newest)} after the last rebuild (${day(rebuilt)})` };
  }
  const days = Math.floor((now - rebuilt) / 86400000);
  return { ok: true, detail: `rebuilt ${days} day${days === 1 ? '' : 's'} ago; no division since${newest ? ` (newest ${day(newest)})` : ''}` };
}

module.exports = { whipVerdict, GRACE_MS };
