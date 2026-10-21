// After a script writes council data: ask the live site to rebuild its cached council league data
// (app/api/revalidate-councils) instead of waiting up to 6 hours. Uses CRON_SECRET from .env.local and never prints
// it. A failure only warns: the data is already written and the cache refreshes on its own within 6 hours.
async function refreshCouncilPages(log = console.log) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) { log('Site refresh skipped: CRON_SECRET is not set. The council pages refresh within 6 hours.'); return; }
  try {
    const r = await fetch('https://www.opengovt.uk/api/revalidate-councils', { method: 'POST', headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(30000) });
    log(r.ok ? 'Site refresh: council league data will be rebuilt on the next visit.' : `Site refresh failed (HTTP ${r.status}); the council pages refresh within 6 hours.`);
  } catch (e) {
    log(`Site refresh failed (${e.message}); the council pages refresh within 6 hours.`);
  }
}
module.exports = { refreshCouncilPages };
