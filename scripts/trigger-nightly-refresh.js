#!/usr/bin/env node
// The last step of each GitHub nightly sync (JF1d, 9 Nov 2026): asks the site to run its nightly page refresh now
// (/api/refresh-nightly-pages?trigger=<workflow>), so the pages the sync changed are refreshed when it ends rather than
// at the next 05:15 UTC. Vercel's bot protection can refuse a request from a GitHub runner (403 or 429): that is a
// warning, not a failure, as the 05:15 run then refreshes them (it does nothing only on a day a trigger got through).
//   node scripts/trigger-nightly-refresh.js <workflow-name>      needs CRON_SECRET (never printed)
'use strict';
const name = process.argv[2];
if (!name || !/^[A-Za-z0-9._-]{1,60}$/.test(name)) { console.error('usage: trigger-nightly-refresh.js <workflow-name>'); process.exit(2); }
const secret = process.env.CRON_SECRET;
const base = (process.env.REFRESH_BASE || 'https://www.opengovt.uk').replace(/\/+$/, '');
(async () => {
  if (!secret) { console.log('::warning::CRON_SECRET is not set; the 05:15 UTC run refreshes the pages instead.'); return; }
  let res;
  try {
    res = await fetch(`${base}/api/refresh-nightly-pages?trigger=${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${secret}`, 'User-Agent': 'opengovt sync refresh' },
      signal: AbortSignal.timeout(240000),
    });
  } catch (e) {
    console.log(`::warning::nightly page refresh not reached (${e.message}); the 05:15 UTC run refreshes the pages instead.`);
    return;
  }
  if (res.status === 403 || res.status === 429) { console.log(`::warning::nightly page refresh refused by bot protection (HTTP ${res.status}); the 05:15 UTC run refreshes the pages instead.`); return; }
  const body = await res.text();
  if (!res.ok) { console.error(`nightly page refresh failed: HTTP ${res.status} ${body.slice(0, 300)}`); process.exit(1); }
  let j = {};
  try { j = JSON.parse(body); } catch { /* not JSON */ }
  console.log(`nightly page refresh triggered by ${name}: ${j.rows_written ?? '?'} paths; bill queue ${JSON.stringify(j.bill_queue ?? null)}; MPs ${JSON.stringify(j.mps ?? null)}`);
})();
