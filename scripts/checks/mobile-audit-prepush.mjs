// The pre-push check (owner, 4 Nov 2026): refuses a push if the fast mobile audit (375px, the page types and pages in
// mobile-audit-fast.txt, checks a, b, c and h: nothing over 10,000px; over 9,000px is printed as a warning) or the two reader journeys (owner, 5 Nov 2026: every fold of an MP page, Show more until done on
// /donors, in Chromium) or the sitemap dates check (owner, 7 Nov 2026: no lastmod before 1970 or in the future) fail on the commit being pushed. Run by scripts/git-hooks/pre-push; git passes the refs on stdin.
// It builds that commit in a temporary worktree, so the working tree and any running server are left alone, and takes
// several minutes. It only runs when a pushed commit changes what pages render (app, lib, public, next.config), and once
// per commit: pushing the same commit to main after work does not run it again.
// 11 Nov 2026 (owner approved): a push whose changes are only under app/api/, scripts/ or data files is not checked (app/api
// is left out of PAGE_CODE below; scripts and data files were never in it); anything else under app, lib, public or
// next.config still runs the full check. The build reuses the main checkout's .next/cache/turbopack (the build cache only,
// never .next/cache/fetch-cache, which can hold old database answers), and the rendered checks run with --push (A6 at
// 375 x 812 and 1280 x 720, no first-visit banner pass, no council tab opening); the full rendered checks run daily
// against the live site (scripts/checks/qa/rendered-checks-daily.mjs).
// T1-VR (owner, 12 Nov 2026: 'one step forward and two steps back'; Cowork 12 Nov: under 5 minutes): then the before and
// after comparison of the ten most visited pages and the page types this push's code changes, the live site against this
// build, whole pages at 375 x 812 and 1280 x 720 (scripts/checks/qa/visual-compare.mjs; the full sample runs nightly).
// A page that differs and is not named by the job (a 'VR-pages:' line in a commit message of the push) stops the push for
// Cowork, with a report and side by side pictures; after Cowork's review, VR_ACCEPT=<first 8 of the hash> lets it through.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { checkRange } from './layout-lock.mjs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const ZERO = /^0+$/;
const PAGE_CODE = ['app', 'lib', 'public', 'next.config.ts', 'next.config.js', 'next.config.mjs', ':(exclude)app/api'];
const passedFile = path.join(git('rev-parse', '--git-dir'), 'mobile-audit-passed');

const refs = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split(' '));
const shas = new Set();
const fromOf = new Map();
for (const [, local, , remote] of refs) {
  if (ZERO.test(local)) continue; // deleting a branch
  let from = remote;
  if (ZERO.test(remote)) { try { from = git('merge-base', local, 'origin/main'); } catch { from = null; } }
  const changed = from ? git('diff', '--name-only', `${from}..${local}`, '--', ...PAGE_CODE) : 'unknown';
  if (changed) { shas.add(local); fromOf.set(local, from); }
}
// Layout lock (owner approved, 11 Nov 2026), on every push, before anything is skipped: a commit that changes a file in
// scripts/checks/layout-lock.txt needs "Layout change approved" and the JOBS.md job id in its message.
{
  const refused = [];
  for (const [, local, , remote] of refs) {
    if (ZERO.test(local)) continue;
    let from = remote;
    if (ZERO.test(remote)) { try { from = git('merge-base', local, 'origin/main'); } catch { from = null; } }
    refused.push(...checkRange(from, local));
  }
  if (refused.length) {
    for (const r of refused) console.error(`Layout lock: ${r}`);
    console.error('Push refused: a shared layout file changed (scripts/checks/layout-lock.txt). Put "Layout change approved" and the JOBS.md job id in that commit\'s message once the change is approved.');
    process.exit(1);
  }
}
const passed = fs.existsSync(passedFile) ? fs.readFileSync(passedFile, 'utf8').trim() : '';
const todo = [...shas].filter((s) => s !== passed);
if (!todo.length) process.exit(0);

const sha = todo[0];
const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'opengovt-audit-'));
// The server's own output, kept so a page that fails shows why (owner, 7 Nov 2026, AA1: /questions returned HTTP 500 twice
// with nothing recorded). On the SSD when it is mounted, else beside the other audit output. AUDIT_LOG_DIR overrides it.
const SSD_LOGS = '/Volumes/GoliathSSD/opengovt-work/claude-tmp/push-check-logs';
const logDir = process.env.AUDIT_LOG_DIR || (fs.existsSync(path.dirname(SSD_LOGS)) ? SSD_LOGS : os.tmpdir());
fs.mkdirSync(logDir, { recursive: true });
const serverLog = path.join(logDir, `server-${sha.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
// The error lines of the server log (Next's "⨯" lines, errors, timeouts), never the environment.
const errorLines = () => {
  try {
    return fs.readFileSync(serverLog, 'utf8').split('\n').filter((l) => /⨯|error|timeout|failed|digest/i.test(l)).slice(-40);
  } catch { return []; }
};
const repo = process.cwd();
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
let server = null, code = 1, vrStopped = false;
try {
  console.log(`mobile audit: building ${sha.slice(0, 8)} (several minutes)`);
  run('git', ['worktree', 'add', '-q', '--detach', wt, sha]);
  run('cp', [process.platform === 'darwin' ? '-cR' : '-R', 'node_modules', path.join(wt, 'node_modules')]);
  fs.copyFileSync('.env.local', path.join(wt, '.env.local'));
  // The build cache only (owner approved, 11 Nov 2026); a copy, so the check's build never changes the main checkout's.
  if (fs.existsSync('.next/cache/turbopack')) {
    fs.mkdirSync(path.join(wt, '.next/cache'), { recursive: true });
    run('cp', [process.platform === 'darwin' ? '-cR' : '-R', '.next/cache/turbopack', path.join(wt, '.next/cache/turbopack')]);
  }
  const env = { ...process.env, RECOMMENDATIONS_PUBLIC: '1' };
  execFileSync('npx', ['next', 'build'], { cwd: wt, env, stdio: ['ignore', 'ignore', 'inherit'] });
  const port = 3198;
  const out = fs.openSync(serverLog, 'a');
  server = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: wt, env, stdio: ['ignore', out, out], detached: true });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) { try { await fetch(`${base}/support`); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  try {
    run('node', ['scripts/checks/mobile-audit.mjs', '--fast', '--base', base, '--out', path.join(os.tmpdir(), 'opengovt-audit-fast')], { cwd: wt, env });
    run('node', ['scripts/checks/mobile-audit-deep.mjs', '--base', base, '--section', 'journeys', '--engines', 'chromium', '--journeys', 'e,g', '--out', path.join(os.tmpdir(), 'opengovt-audit-journeys')], { cwd: wt, env });
    run('node', ['scripts/checks/sitemap-dates-check.mjs', '--base', base], { cwd: wt, env });
    // QA1 (owner approved, 9 Nov 2026): A2 time words, A3 phone length 2,500px, A6 first screen, A9 only sources link outside (T1-5c); only new problems fail (A9 always).
    run('node', ['scripts/checks/qa/rendered-checks.mjs', '--base', base, '--push'], { cwd: wt, env });
    // T1-VR: the pages the job names, from 'VR-pages:' lines in the pushed commits' messages.
    const from = fromOf.get(sha);
    const messages = from ? git('log', '--format=%B', `${from}..${sha}`) : git('log', '-1', '--format=%B', sha);
    const named = [...messages.matchAll(/^VR-pages:\s*(.+)$/gim)].map((m) => m[1]).join(',');
    try {
      run('node', ['scripts/checks/qa/visual-compare.mjs', '--base', base, '--sha', sha, ...(from ? ['--from', from] : []), '--job-pages', named], { cwd: wt, env });
    } catch {
      vrStopped = true;
      throw new Error('visual comparison');
    }
    code = 0;
    fs.writeFileSync(passedFile, sha);
  } catch {
    if (vrStopped) throw new Error('stopped for Cowork by the visual comparison (T1-VR): pages not named by the job look different, see the report above');
    console.error('Push refused: the fast mobile audit (checks a, b, c or h), a reader journey (e, g), the sitemap dates check or the QA1 rendered checks (A2, A3, A4, A6) failed, above. Fix them, commit and push again.');
    const lines = errorLines();
    console.error(`Server log: ${serverLog}${lines.length ? `; its error lines:\n  ${lines.join('\n  ')}` : ' (no error lines)'}`);
  }
} catch (e) {
  if (vrStopped) console.error(`Push ${e.message}.`);
  else console.error(`Push refused: the mobile audit could not run: ${e.message.split('\n')[0]}`);
} finally {
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  fs.rmSync(path.join(wt, '.env.local'), { force: true });
  try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo, stdio: 'ignore' }); execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'ignore' }); } catch { /* left for git worktree prune */ }
}
process.exit(code);
