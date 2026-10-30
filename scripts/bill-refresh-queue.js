// Refresh the pages of bills a GitHub script changed (owner, 30 Oct 2026, cache Stage 2a part 2). Bill pages keep for a
// week, so sync-bills-incremental.js and scripts/sync-bill-divisions.js pass the bill ids they changed: first to the
// site (POST /api/revalidate-bills with {"ids": [...]}, at most 300 a call), and, when that call is refused or fails
// (Vercel's bot protection often refuses GitHub's runners) or CRON_SECRET is not set, into bill_refresh_queue
// (migration 2026-10-30h), which /api/refresh-nightly-pages empties at 05:15 UTC from inside the site.
const SITE = 'https://www.opengovt.uk/api/revalidate-bills';
const BATCH = 300;

async function refreshOrQueue(supabase, billIds, source) {
  const ids = [...new Set(billIds)].filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return 'no bills to refresh';
  let reason = 'CRON_SECRET not set';
  const secret = process.env.CRON_SECRET;
  if (secret) {
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const res = await fetch(SITE, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', 'User-Agent': 'opengovt.uk nightly bill sync' },
          body: JSON.stringify({ ids: ids.slice(i, i + BATCH) }),
          signal: AbortSignal.timeout(20000),
        });
        if (res.status !== 200) throw new Error(`the site answered HTTP ${res.status}`);
      }
      return `refreshed ${ids.length} bills on the site`;
    } catch (e) {
      reason = e.message;
    }
  }
  const now = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await supabase.from('bill_refresh_queue').upsert(ids.slice(i, i + 500).map((bill_id) => ({ bill_id, source, queued_at: now })), { onConflict: 'bill_id' });
    if (error) throw new Error(`bill_refresh_queue: ${error.message}`);
  }
  return `queued ${ids.length} bills for /api/refresh-nightly-pages (${reason})`;
}

module.exports = { refreshOrQueue };
