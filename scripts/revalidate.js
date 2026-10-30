#!/usr/bin/env node
// Refresh cached pages on the live site after a database change (owner's approval, 29 Oct 2026, cache Stage 1).
// POSTs {"paths": [...], "tags": [...]} to /api/revalidate with the CRON_SECRET from .env.local (never printed).
//
//   node scripts/revalidate.js --tag editorials
//   node scripts/revalidate.js --path /mps/4527 --path /bills/2937
//   node scripts/revalidate.js --base http://127.0.0.1:3001 --tag editorials     (a local server, for tests)
//   node scripts/revalidate.js --paths-file lib/nightly-refresh-pages.json       (the "paths" list in a JSON file)
// A path with [brackets], such as /mps/[id], is a route pattern: every page of that route (cache Stage 2b).
// On a GitHub runner there is no .env.local: CRON_SECRET comes from the environment, and dotenv may not be installed.
//
// The site is NEXT_PUBLIC_SITE_URL or SITE_URL from .env.local if set, else https://www.opengovt.uk.
// After any editorial database sync, run: node scripts/revalidate.js --tag editorials

'use strict';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: `${__dirname}/../.env.local`, quiet: true });
} catch { /* no dotenv (a GitHub runner): the environment already has what is needed */ }

const args = process.argv.slice(2);
const paths = [];
const tags = [];
let base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.opengovt.uk';
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => { const v = args[++i]; if (!v) { console.error(`${a} needs a value`); process.exit(1); } return v; };
  if (a === '--path') paths.push(next());
  else if (a === '--tag') tags.push(next());
  else if (a === '--base') base = next();
  else if (a === '--paths-file') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const list = require(require('path').resolve(next())).paths;
    if (!Array.isArray(list)) { console.error(`${a}: the file has no "paths" list`); process.exit(1); }
    paths.push(...list);
  }
  else { console.error(`Unknown option ${a}. Use --path /a, --tag name, --paths-file file.json, --base URL.`); process.exit(1); }
}
if (paths.length + tags.length === 0) { console.error('Give at least one --path or --tag.'); process.exit(1); }
const secret = process.env.CRON_SECRET;
if (!secret) { console.error('CRON_SECRET is not set in .env.local.'); process.exit(1); }

(async () => {
  const url = `${base.replace(/\/+$/, '')}/api/revalidate`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', 'User-Agent': 'opengovt revalidate script' },
      body: JSON.stringify({ paths, tags }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    console.error(`Request to ${url} failed: ${e.message}`);
    process.exit(1);
  }
  const text = await res.text();
  let shown = text;
  try { shown = JSON.stringify(JSON.parse(text)); } catch { shown = text.slice(0, 300); }
  console.log(`${url} -> HTTP ${res.status} ${shown}`);
  process.exit(res.ok ? 0 : 1);
})();
