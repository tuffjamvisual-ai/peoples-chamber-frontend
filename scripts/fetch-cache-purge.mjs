#!/usr/bin/env node
// Drops entries from a Next.js data cache folder (.next/cache/fetch-cache), for the saved copy check builds start from
// (~/opengovt-backup/fetch-cache-last, ENTRY 167). Cowork ENTRY 195 (T2): the saved copy kept biography reads from the
// morning, so check builds showed MPs without the biographies loaded since.
//   node scripts/fetch-cache-purge.mjs --tag table:mp_biography [--tag ...] [--dir <folder>]   after a database write:
//        drop the entries carrying any of these tags (each write ends with this for the tables it wrote)
//   node scripts/fetch-cache-purge.mjs --older-than-hours 24 [--dir <folder>]                  drop entries older than that
// The folder defaults to ~/opengovt-backup/fetch-cache-last. Prints what it dropped; never touches anything else.
import fs from 'fs';
import os from 'os';
import path from 'path';

export function purge(dir, { tags = [], olderThanHours = null, now = Date.now() } = {}) {
  let dropped = 0, kept = 0;
  if (!fs.existsSync(dir)) return { dropped, kept, missing: true };
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (!stat.isFile()) continue;
    let drop = olderThanHours != null && now - stat.mtimeMs > olderThanHours * 3600_000;
    if (!drop && tags.length) {
      try {
        const entryTags = JSON.parse(fs.readFileSync(file, 'utf8')).tags ?? [];
        drop = entryTags.some((t) => tags.includes(t));
      } catch { /* not a cache entry: keep */ }
    }
    if (drop) { fs.rmSync(file, { force: true }); dropped++; } else kept++;
  }
  return { dropped, kept, missing: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const argv = process.argv.slice(2);
  const tags = argv.flatMap((a, i) => (a === '--tag' ? [argv[i + 1]] : []));
  const hi = argv.indexOf('--older-than-hours');
  const di = argv.indexOf('--dir');
  const dir = di >= 0 ? argv[di + 1] : path.join(os.homedir(), 'opengovt-backup', 'fetch-cache-last');
  const olderThanHours = hi >= 0 ? Number(argv[hi + 1]) : null;
  if (!tags.length && olderThanHours == null) { console.error('give --tag <tag> (repeatable) and/or --older-than-hours <n>'); process.exit(2); }
  const r = purge(dir, { tags, olderThanHours });
  console.log(r.missing ? `fetch-cache purge: ${dir} does not exist; nothing to do` : `fetch-cache purge: ${r.dropped} entries dropped, ${r.kept} kept (${tags.length ? `tags ${tags.join(', ')}` : ''}${tags.length && olderThanHours != null ? '; ' : ''}${olderThanHours != null ? `older than ${olderThanHours} h` : ''})`);
}
