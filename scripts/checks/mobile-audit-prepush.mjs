// The pre-push check (owner, 4 Nov 2026): refuses a push if the fast mobile audit (375px, the 40 most visited page types,
// checks a, b and c) or the two reader journeys (owner, 5 Nov 2026: every fold of an MP page, Show more until done on
// /donors, in Chromium) fail on the commit being pushed. Run by scripts/git-hooks/pre-push; git passes the refs on stdin.
// It builds that commit in a temporary worktree, so the working tree and any running server are left alone, and takes
// several minutes. It only runs when a pushed commit changes what pages render (app, lib, public, next.config), and once
// per commit: pushing the same commit to main after work does not run it again.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const ZERO = /^0+$/;
const PAGE_CODE = ['app', 'lib', 'public', 'next.config.ts', 'next.config.js', 'next.config.mjs'];
const passedFile = path.join(git('rev-parse', '--git-dir'), 'mobile-audit-passed');

const refs = fs.readFileSync(0, 'utf8').trim().split('\n').filter(Boolean).map((l) => l.split(' '));
const shas = new Set();
for (const [, local, , remote] of refs) {
  if (ZERO.test(local)) continue; // deleting a branch
  let from = remote;
  if (ZERO.test(remote)) { try { from = git('merge-base', local, 'origin/main'); } catch { from = null; } }
  const changed = from ? git('diff', '--name-only', `${from}..${local}`, '--', ...PAGE_CODE) : 'unknown';
  if (changed) shas.add(local);
}
const passed = fs.existsSync(passedFile) ? fs.readFileSync(passedFile, 'utf8').trim() : '';
const todo = [...shas].filter((s) => s !== passed);
if (!todo.length) process.exit(0);

const sha = todo[0];
const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'opengovt-audit-'));
const repo = process.cwd();
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
let server = null, code = 1;
try {
  console.log(`mobile audit: building ${sha.slice(0, 8)} (several minutes)`);
  run('git', ['worktree', 'add', '-q', '--detach', wt, sha]);
  run('cp', [process.platform === 'darwin' ? '-cR' : '-R', 'node_modules', path.join(wt, 'node_modules')]);
  fs.copyFileSync('.env.local', path.join(wt, '.env.local'));
  const env = { ...process.env, EDITORIALS_FROM_DB: '1', RECOMMENDATIONS_PUBLIC: '1' };
  // npx next build, not npm run build: the prebuild step writes to the database.
  execFileSync('npx', ['next', 'build'], { cwd: wt, env, stdio: ['ignore', 'ignore', 'inherit'] });
  const port = 3198;
  server = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: wt, env, stdio: 'ignore', detached: true });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) { try { await fetch(`${base}/support`); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  try {
    run('node', ['scripts/checks/mobile-audit.mjs', '--fast', '--base', base, '--out', path.join(os.tmpdir(), 'opengovt-audit-fast')], { cwd: wt, env });
    run('node', ['scripts/checks/mobile-audit-deep.mjs', '--base', base, '--section', 'journeys', '--engines', 'chromium', '--journeys', 'e,g', '--out', path.join(os.tmpdir(), 'opengovt-audit-journeys')], { cwd: wt, env });
    code = 0;
    fs.writeFileSync(passedFile, sha);
  } catch {
    console.error('Push refused: the fast mobile audit (checks a, b or c) or a reader journey (e, g) failed, above. Fix them, commit and push again.');
  }
} catch (e) {
  console.error(`Push refused: the mobile audit could not run: ${e.message.split('\n')[0]}`);
} finally {
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  fs.rmSync(path.join(wt, '.env.local'), { force: true });
  try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo, stdio: 'ignore' }); execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'ignore' }); } catch { /* left for git worktree prune */ }
}
process.exit(code);
