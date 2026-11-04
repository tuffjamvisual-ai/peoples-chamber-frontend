#!/usr/bin/env node
// One folder of the weekly copy from EDGE_SSD to GoliathSSD (scripts/launchd/opengovt.archive-backup.sh). Under launchd
// macOS refuses rsync, cp and mv on GoliathSSD but allows Node, tested 4 Nov 2026, so Node does the copy.
// Adds and updates files; never deletes anything on the destination. A file is copied when it is missing or its size or
// modification time differs, to a temporary name and then renamed, so a finished name always means a finished file.
// Afterwards every source file is checked on the destination: file count, total bytes and modification times. Prints
// one line. Exit 0 if all match; exit 1 with "FAILED" and the first differences if not.
//   node archive-copy.mjs <source folder> <destination folder>
import fs from 'node:fs';
import path from 'node:path';

const [src, dst] = process.argv.slice(2);
const label = path.basename(src);
// Times count as the same when under a second apart: the first copies were made by openrsync, which kept whole seconds
// only (EDGE_SSD 12:00:00.000, GoliathSSD 12:00:00.566 for one file), and Node sets times to the millisecond.
const MTIME_TOLERANCE_MS = 1000;

// Every regular file under a folder, relative path to size and modification time. Links are counted, not followed.
function walk(root) {
  const files = new Map();
  let links = 0;
  const visit = (rel) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) visit(r);
      else if (e.isFile()) { const s = fs.statSync(path.join(root, r)); files.set(r, { size: s.size, mtimeMs: s.mtimeMs }); }
      else links++;
    }
  };
  if (fs.existsSync(root)) visit('');
  return { files, links };
}
const same = (a, b) => !!b && a.size === b.size && Math.abs(a.mtimeMs - b.mtimeMs) < MTIME_TOLERANCE_MS;
const total = (files) => [...files.values()].reduce((n, f) => n + f.size, 0);

function copyOne(rel) {
  const from = path.join(src, rel);
  const to = path.join(dst, rel);
  const tmp = path.join(path.dirname(to), `.${path.basename(to)}.copying`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const before = fs.statSync(from);
  fs.copyFileSync(from, tmp);
  fs.utimesSync(tmp, before.atime, before.mtime);
  fs.renameSync(tmp, to);
}

// Two passes: a file the live archive changes during the first is copied again in the second.
let copied = 0;
const copyErrors = [];
for (let pass = 0; pass < 2; pass++) {
  const { files } = walk(src);
  const have = walk(dst).files;
  for (const [rel, f] of files) {
    if (same(f, have.get(rel))) continue;
    try { copyOne(rel); copied++; } catch (e) { copyErrors.push(`${rel}: ${e.code || e.message}`); }
  }
}

// The check, from a fresh read of both folders.
const source = walk(src);
const dest = walk(dst).files;
const missing = [...source.files.keys()].filter((rel) => !dest.has(rel));
const sizeDiff = [...source.files].filter(([rel, f]) => dest.has(rel) && dest.get(rel).size !== f.size).map(([rel]) => rel);
const timeDiff = [...source.files].filter(([rel, f]) => dest.has(rel) && dest.get(rel).size === f.size && !same(f, dest.get(rel))).map(([rel]) => rel);
const matched = [...source.files.keys()].filter((rel) => same(source.files.get(rel), dest.get(rel)));
const destBytes = matched.reduce((n, rel) => n + dest.get(rel).size, 0);
const extra = [...dest.keys()].filter((rel) => !source.files.has(rel)).length; // kept: this copy never deletes
const sourceBytes = total(source.files);
const figures = `${source.files.size} files, ${sourceBytes} bytes on source; ${matched.length} files, ${destBytes} bytes matching on destination; ${copied} copied; ${extra} only on destination; ${source.links} links not copied`;

if (copyErrors.length || missing.length || sizeDiff.length || timeDiff.length) {
  const show = (name, list) => (list.length ? ` ${name} ${list.length} (first: ${list.slice(0, 3).join(', ')})` : '');
  console.log(`FAILED ${label}: ${figures};${show('copy errors', copyErrors)}${show('missing', missing)}${show('size differs', sizeDiff)}${show('modified time differs', timeDiff)}`);
  process.exit(1);
}
console.log(`copied ${label}: ${figures}`);
