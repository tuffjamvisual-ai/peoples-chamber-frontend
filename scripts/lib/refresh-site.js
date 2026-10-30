// After a script run by hand writes data the site shows: ask the live site to refresh the pages (owner, 30 Oct 2026,
// cache Stage 2a part 4; pages now keep for a week, so without this they would stay old up to a week). Uses
// CRON_SECRET from .env.local and never prints it. A failed refresh warns, and is recorded with the script's other
// refresh results in sync_heartbeat (route "/scripts/<name>"), where the freshness monitor alerts on it.
//
//   refreshCouncilPages()         the council league data and every council page (/councils/[slug], /schools, /sewage)
//   refreshMpPages(ids)           /mps/<id> for the given MPs, REFRESH_BATCH paths a request
//   recordRefresh(name, result)   writes { changed, sent, status } for the script to sync_heartbeat
// When the site refuses or cannot be reached (GitHub's runners are often refused by Vercel's bot protection), the
// refresh is queued in sync_cursor instead ('mp-refresh-queue' with the member ids, 'council-refresh-queue' for the
// council routes) and /api/refresh-nightly-pages carries it out at 05:15 UTC; the result is then 202 (queued).
const SITE = 'https://www.opengovt.uk';
const REFRESH_BATCH = 300;

async function post(path, body, log) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) { log('Site refresh skipped: CRON_SECRET is not set.'); return { sent: 0, status: 0 }; }
  try {
    const r = await fetch(`${SITE}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    return { sent: r.ok ? 1 : 0, status: r.status };
  } catch (e) {
    log(`Site refresh failed (${e.message}).`);
    return { sent: 0, status: 0 };
  }
}

function client() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
}

async function queue(route, cursor, log) {
  try {
    const { error } = await client().from('sync_cursor').upsert({ route, cursor, updated_at: new Date().toISOString() }, { onConflict: 'route' });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    log(`Could not queue the refresh either (${e.message}).`);
    return false;
  }
}

// The council league data and the council page patterns (app/api/revalidate-councils).
async function refreshCouncilPages(log = console.log) {
  const r = await post('/api/revalidate-councils', null, log);
  if (r.status === 200) { log('Site refresh: council league data and council pages will be rebuilt on their next visit.'); return { sent: 4, status: 200 }; }
  if (await queue('council-refresh-queue', { queued_at: new Date().toISOString() }, log)) {
    log(`Site refresh refused (HTTP ${r.status || 'no answer'}); queued for /api/refresh-nightly-pages at 05:15 UTC.`);
    return { sent: 1, status: 202 };
  }
  return { sent: 0, status: r.status };
}

// MP pages, REFRESH_BATCH paths a request (app/api/revalidate allows 300 items a call).
async function refreshMpPages(memberIds, log = console.log) {
  const ids = [...new Set(memberIds)].filter((n) => Number.isInteger(n) && n > 0);
  let sent = 0, status = 200;
  for (let i = 0; i < ids.length; i += REFRESH_BATCH) {
    const r = await post('/api/revalidate', { paths: ids.slice(i, i + REFRESH_BATCH).map((id) => `/mps/${id}`) }, log);
    if (r.status !== 200) { status = r.status; break; }
    sent += ids.slice(i, i + REFRESH_BATCH).length;
  }
  if (ids.length && status !== 200) {
    const { queueMpRefresh } = require('../mp-refresh-queue');
    try {
      log(`Site refresh of MP pages refused (HTTP ${status || 'no answer'}); ${await queueMpRefresh(client(), ids)}`);
      return { sent: ids.length, status: 202 };
    } catch (e) {
      log(`Could not queue the MP pages either (${e.message}).`);
      return { sent, status };
    }
  }
  if (ids.length) log(`Site refresh: ${sent} MP pages will be rebuilt on their next visit.`);
  return { sent, status: 200 };
}

// The script's refresh result in sync_heartbeat (columns from migration 2026-10-30i); never fails the script.
async function recordRefresh(name, { changed, sent, status }, log = console.log) {
  try {
    const db = client();
    const now = new Date().toISOString();
    const { error } = await db.from('sync_heartbeat').upsert({
      route: `/scripts/${name}`, last_ran_at: now, last_status: 200, last_rows: changed,
      last_changed: changed, last_refresh_sent: sent, last_refresh_status: status || 0, last_refresh_error: status === 200 || status === 202 ? null : `HTTP ${status || 'no answer'}`, last_refresh_at: now,
    }, { onConflict: 'route' });
    if (error) log(`Refresh result not recorded: ${error.message}`);
  } catch (e) {
    log(`Refresh result not recorded: ${e.message}`);
  }
}

module.exports = { refreshCouncilPages, refreshMpPages, recordRefresh, REFRESH_BATCH };
