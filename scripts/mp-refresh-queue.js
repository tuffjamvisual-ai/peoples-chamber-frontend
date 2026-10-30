// MP pages the nightly GitHub scripts changed (owner, 30 Oct 2026, cache Stage 2a part 3). MP pages keep for a week;
// a script that changed some MPs' data adds their member ids here (sync_cursor, route 'mp-refresh-queue', cursor
// {"ids": [...]}), and /api/refresh-nightly-pages (05:15 UTC, inside the site) refreshes those pages and empties it.
// The outside earnings step in .github/workflows/daily-context-update.yml adds to the same list in SQL.
const ROUTE = 'mp-refresh-queue';

async function queueMpRefresh(db, memberIds) {
  const add = [...new Set(memberIds)].filter((n) => Number.isInteger(n) && n > 0);
  if (!add.length) return 'no MP pages to refresh';
  const { data, error } = await db.from('sync_cursor').select('cursor').eq('route', ROUTE).maybeSingle();
  if (error) throw new Error(`sync_cursor read: ${error.message}`);
  const ids = [...new Set([...((data && data.cursor && data.cursor.ids) || []), ...add])];
  const { error: upErr } = await db.from('sync_cursor').upsert({ route: ROUTE, cursor: { ids }, updated_at: new Date().toISOString() }, { onConflict: 'route' });
  if (upErr) throw new Error(`sync_cursor write: ${upErr.message}`);
  return `queued ${add.length} MP pages (${ids.length} waiting) for /api/refresh-nightly-pages`;
}

module.exports = { queueMpRefresh, MP_REFRESH_ROUTE: ROUTE };
