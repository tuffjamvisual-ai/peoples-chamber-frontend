// Layout lock (owner approved, 11 Nov 2026): refuses commits that change a file in scripts/checks/layout-lock.txt (or the
// marked part of one) unless the commit message says "Layout change approved" with the JOBS.md job id. Called by the
// pre-push check (scripts/checks/mobile-audit-prepush.mjs) for every commit being pushed; by hand:
//   node scripts/checks/layout-lock.mjs <from> <to>
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JOBS = '/Volumes/GoliathSSD/opengovt-work/Claude outputs/JOBS.md';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] });
const show = (rev, file) => { try { return git('show', `${rev}:${file}`); } catch { return null; } };

export function lockList(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const [file, marker] = l.split('#');
    return { file, marked: !!marker };
  });
}

// The text between the markers, or null when the file has none.
export function markedText(src) {
  if (src == null) return null;
  const out = [];
  const re = /LAYOUT-LOCK START[\s\S]*?\*\/([\s\S]*?)\/\*\s*LAYOUT-LOCK END/g;
  for (let m; (m = re.exec(src)); ) out.push(m[1]);
  return out.length ? out.join('\n---\n') : null;
}

// "Layout change approved" with a job id (T1-768b, JF2a, NI2c ...). When JOBS.md can be read, the id must be in it.
export function approval(message, jobsText) {
  const m = /Layout change approved\W+([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)/.exec(message);
  if (!m) return { ok: false, why: 'no "Layout change approved" with a job id' };
  if (jobsText != null && !jobsText.includes(m[1])) return { ok: false, why: `job id ${m[1]} is not in JOBS.md` };
  return { ok: true, id: m[1] };
}

// Locked paths a commit changes (compared with its first parent).
export function lockedChanges(sha, locks) {
  const parent = (() => { try { return git('rev-parse', `${sha}^`).trim(); } catch { return null; } })();
  const changed = new Set(git('diff-tree', '--no-commit-id', '--name-only', '-r', '--root', sha).split('\n').filter(Boolean));
  const hits = [];
  for (const { file, marked } of locks) {
    if (!changed.has(file)) continue;
    // A file being created is not yet locked (the commit that adds the list or a new locked file).
    if (!parent || show(parent, file) == null) continue;
    if (!marked) { hits.push(file); continue; }
    const before = parent ? markedText(show(parent, file)) : null;
    // A file that had no markers before (they are being added) is not yet locked.
    if (before != null && before !== markedText(show(sha, file))) hits.push(`${file} (the marked layout rules)`);
  }
  return hits;
}

export function checkRange(from, to) {
  const locks = lockList(fs.readFileSync(path.join(ROOT, 'scripts/checks/layout-lock.txt'), 'utf8'));
  const jobs = fs.existsSync(JOBS) ? fs.readFileSync(JOBS, 'utf8') : null;
  const shas = git('rev-list', '--reverse', from ? `${from}..${to}` : to).split('\n').filter(Boolean);
  const refused = [];
  for (const sha of shas) {
    const hits = lockedChanges(sha, locks);
    if (!hits.length) continue;
    const a = approval(git('log', '-1', '--format=%B', sha), jobs);
    if (!a.ok) refused.push(`${sha.slice(0, 8)} changes ${hits.join(', ')}: ${a.why}`);
  }
  return refused;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [from, to = 'HEAD'] = process.argv.slice(2);
  const refused = checkRange(from, to);
  for (const r of refused) console.error(`Layout lock: ${r}`);
  if (!refused.length) console.log('layout lock: no locked layout file changed without approval');
  process.exit(refused.length ? 1 : 0);
}
