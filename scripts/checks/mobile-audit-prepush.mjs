// The pre-push check (owner, 4 Nov 2026): refuses a push if the fast mobile audit (375px, the page types and pages in
// mobile-audit-fast.txt, checks a, b, c and h: nothing over 10,000px; over 9,000px is printed as a warning) or the two reader journeys (owner, 5 Nov 2026: every fold of an MP page, Show more until done on
// /donors, in Chromium) or the sitemap dates check (owner, 7 Nov 2026: no lastmod before 1970 or in the future) fail on the commit being pushed. Run by scripts/git-hooks/pre-push; git passes the refs on stdin.
// It builds that commit in a temporary worktree, so the working tree and any running server are left alone, and takes
// several minutes. It only runs when a pushed commit changes what pages render (app, lib, public, next.config), and once
// per commit: pushing the same commit to main after work does not run it again.
// 11 Nov 2026 (owner approved): a push whose changes are only under app/api/, scripts/ or data files is not checked (app/api
// is left out of PAGE_CODE below; scripts and data files were never in it); anything else under app, lib, public or
// next.config still runs the full check. The build reuses the main checkout's .next/cache/turbopack (the build cache) and
// the last check build's .next/cache/fetch-cache (owner approved 16 Nov 2026, COWORK-TO-T1 ENTRY 167: a fresh folder
// otherwise re-reads every cached database answer, about 79 s of database time a build; the check's pages then show the
// data as of that copy, which does not matter for layout checks), and the rendered checks run with --push (A6 at
// 375 x 812 and 1280 x 720, no first-visit banner pass, no council tab opening); the full rendered checks run daily
// against the live site (scripts/checks/qa/rendered-checks-daily.mjs).
// T1-VR (owner, 12 Nov 2026: 'one step forward and two steps back'; Cowork 12 Nov: under 5 minutes): then the before and
// after comparison of the ten most visited pages and the page types this push's code changes, the live site against this
// build, whole pages at 375 x 812 and 1280 x 720 (scripts/checks/qa/visual-compare.mjs; the full sample runs nightly).
// A page that differs and is not named by the job (a 'VR-pages:' line in a commit message of the push) stops the push for
// Cowork, with a report and side by side pictures; after Cowork's review, VR_ACCEPT=<first 8 of the hash> lets it through.
// FAST LANE (owner approved, Cowork ENTRY 404; rule in scripts/checks/fast-lane.mjs and Claude outputs/audit/fastlane-404/
// RULE.md): after the layout lock and A16, which always run, a push whose every changed file is a share image route,
// helper or asset, an image named nowhere in the code, a newsletter issue, the by-election list or robots.txt is built
// and then checked only for its sample share images (200 image/png, 1200 x 630), its sample pages (200, og:image and
// twitter:image) and A2 and A3 on those pages; no journeys, audit or visual comparison (scripts/checks/fast-lane-after.mjs
// runs them against the live site once the push is live). Every other push prints 'FULL: <reason>' and runs the checks
// above unchanged. PUSH_FULL=1 forces the full check. The lane and its result are written to push-lane-<hash>.txt (one
// line) and push-lane-<hash>.json (the samples, for the after-check) in the server log folder; the path is printed.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { checkRange } from './layout-lock.mjs';
import { fileURLToPath } from 'url';

// This script's own folder (ENTRY 185): its helper scripts come from the code being pushed (scripts/git-hooks/pre-push runs
// this file from a worktree of the pushed commit), never from whatever branch the checkout is on.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.env.PUSH_CHECKS_DRY === '1';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const ZERO = /^0+$/;
// Owner approved 16 Nov 2026 (COWORK-TO-T1 ENTRY 204): package.json, package-lock.json and the checks themselves
// (scripts/checks) also run the full check, so a dependency upgrade (Next.js 16.4.2 to 16.4.5 changed only the two package
// files and was skipped) or a change to a check cannot go live without the build, journeys and visual compare.
const PAGE_CODE = ['app', 'lib', 'public', 'next.config.ts', 'next.config.js', 'next.config.mjs', 'package.json', 'package-lock.json', 'scripts/checks',
  // T2's gaps (ENTRY 212, 17 Nov 2026): the request proxy, CSS build, TypeScript settings, Vercel's routes and crons, the
  // build-skip script and the data files pages import.
  'proxy.ts', 'postcss.config.mjs', 'tsconfig.json', 'vercel.json', 'scripts/vercel-ignore-build.sh', 'data',
  ':(exclude)app/api'];
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
// A16 (owner rule, 15 Nov 2026, COWORK-TO-T1 ENTRY 129), on every push, before anything is skipped: no page or layout
// may set a revalidate timer, be force-dynamic, or read the database outside the tagged data cache, unless it is on the
// to-do list (scripts/checks/a16-baseline.json, which only shrinks) or the exceptions list. A commit that changes the
// exceptions list needs "A16 exception approved" (the owner's approval) in its message.
for (const [, local, , remote] of refs) {
  if (ZERO.test(local)) continue;
  let from = remote;
  if (ZERO.test(remote)) { try { from = git('merge-base', local, 'origin/main'); } catch { from = null; } }
  if (from) {
    for (const c of git('log', '--format=%H', `${from}..${local}`, '--', 'scripts/checks/a16-exceptions.json').split('\n').filter(Boolean)) {
      if (!/A16 exception approved/.test(git('log', '-1', '--format=%B', c))) {
        console.error(`Push refused: commit ${c.slice(0, 8)} changes scripts/checks/a16-exceptions.json without "A16 exception approved" (the owner's approval) in its message.`);
        process.exit(1);
      }
    }
  }
  console.log(`push checks: A16 from ${path.join(HERE, 'a16-cache-rule.mjs')}`);
  try { execFileSync('node', [path.join(HERE, 'a16-cache-rule.mjs'), '--sha', local], { stdio: 'inherit' }); }
  catch { process.exit(1); }
}
const passed = fs.existsSync(passedFile) ? fs.readFileSync(passedFile, 'utf8').trim() : '';
const todo = [...shas].filter((s) => s !== passed);
if (!todo.length) process.exit(0);

const sha = todo[0];
// The fast lane decision (ENTRY 404), against the commit the push starts from (origin/main for a branch pushed to main).
let lane;
if (process.env.PUSH_FULL === '1') lane = { fast: false, reasons: ['PUSH_FULL=1 (full check asked for)'], kinds: [], files: [], samples: {} };
else {
  try {
    const { eligibility } = await import(path.join(HERE, 'fast-lane.mjs'));
    lane = eligibility({ base: fromOf.get(sha) ?? 'origin/main', head: sha });
  } catch (e) { lane = { fast: false, reasons: [`the fast lane rule could not run (${String(e.message).split('\n')[0]})`], kinds: [], files: [], samples: {} }; }
}
const laneLine = lane.fast ? `FAST LANE: ${new Set(lane.files.map((f) => f.path)).size} files (${lane.kinds.join(', ')})` : `FULL: ${lane.reasons.join('; ')}`;
console.log(laneLine);
for (const n of lane.notes ?? []) console.log(`  fast lane note: ${n}`);
const t0 = Date.now();
const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'opengovt-audit-'));
// ENTRY 167: where the last check build's .next/cache/fetch-cache is kept between pushes.
const FETCH_CACHE_KEEP = process.env.FETCH_CACHE_KEEP || path.join(os.homedir(), 'opengovt-backup', 'fetch-cache-last');
// The server's own output, kept so a page that fails shows why (owner, 7 Nov 2026, AA1: /questions returned HTTP 500 twice
// with nothing recorded). On the SSD when it is mounted, else beside the other audit output. AUDIT_LOG_DIR overrides it.
const SSD_LOGS = '/Volumes/EDGE_SSD/opengovt-work/claude-tmp/push-check-logs';
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
const SHARED = (f) => /\.css$/.test(f) || f === 'app/layout.tsx' || f.startsWith('app/components/') || f === 'lib/phone-enhance.ts' || !/^(app|lib)\//.test(f);
async function mobileRulesRoutes(wt, from) {
  if (!from) return null;
  const all = git('diff', '--name-only', `${from}..${sha}`, '--', ...PAGE_CODE).split('\n').filter(Boolean);
  // T2 (03:28): a change to the rules check itself runs every page type; other check scripts change no page, so no run.
  if (all.some((f) => /^scripts\/checks\/mobile-rules[^/]*\.(mjs|json|sh)$/.test(f))) return null;
  const files = all.filter((f) => !f.startsWith('scripts/checks/'));
  if (!files.length) return [];
  if (files.some(SHARED)) return null;
  const { routesReached } = await import(path.join(HERE, 'qa', 'vr-pages.mjs'));
  const r = routesReached(wt, files);
  return r.length ? r : null;
}
let rulesRoutes;
function mobileRules(wt, base, env) {
  const outDir = fs.existsSync('/Volumes/EDGE_SSD/opengovt-work/Claude outputs/audit')
    ? path.join('/Volumes/EDGE_SSD/opengovt-work/Claude outputs/audit/mobile-rules-push', sha.slice(0, 8))
    : path.join(os.tmpdir(), 'opengovt-mobile-rules', sha.slice(0, 8));
  if (rulesRoutes && !rulesRoutes.length) { console.log('mobile rules: not run (only check scripts other than the rules check changed; no page changed)'); return; }
  try {
    console.log(`mobile rules (warning only): ${rulesRoutes ? `${rulesRoutes.length} page types this push reaches` : 'every page type (a shared file changed, or the changes reach no page type)'}`);
    run('node', ['scripts/checks/mobile-rules.mjs', '--base', base, '--out', outDir, '--report-only', ...(rulesRoutes ? ['--routes', rulesRoutes.join(',')] : [])], { cwd: wt, env });
    console.log(`mobile rules: WARNING ONLY, the push goes ahead whatever the result; report ${path.join(outDir, 'report.md')}`);
  } catch (e) {
    console.log(`mobile rules: could not run (warning only, push not stopped): ${String(e.message).split('\n')[0]}`);
  }
}
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
let server = null, code = 1, vrStopped = false;
// The fast lane's checks (ENTRY 404) on the running build: the sample share images, pages and changed static files
// (fast-lane.mjs checkSamples, one request a second), then A2 and A3 on the sample pages only.
async function fastLaneChecks(wt, base, env) {
  const s = lane.samples;
  console.log(`fast lane checks: ${s.imageRoutes.length} share images, ${s.pages.length} pages, ${s.staticFiles.length} other files${s.everyKind ? ' (one page of every share image kind: a helper, asset or font changed)' : ''}`);
  const { checkSamples } = await import(path.join(HERE, 'fast-lane.mjs'));
  const fails = await checkSamples(base, s);
  if (s.pages.length) {
    try { run('node', ['scripts/checks/qa/rendered-checks.mjs', '--base', base, '--push', '--pages', s.pages.join(','), '--only', 'A2,A3'], { cwd: wt, env }); }
    catch { fails.push('A2 or A3 (rendered checks) failed on the sample pages, above'); }
  }
  if (!fails.length) { code = 0; return; }
  console.error(`Push refused: the fast lane checks failed:\n  ${fails.join('\n  ')}`);
  const lines = errorLines();
  console.error(`Server log: ${serverLog}${lines.length ? `; its error lines:\n  ${lines.join('\n  ')}` : ' (no error lines)'}`);
}
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
  // The last check build's data cache (ENTRY 167), kept outside the repository so the main checkout's own .next is never
  // touched; with none yet, the build reads the database as before.
  const wtFetch = path.join(wt, '.next/cache/fetch-cache');
  if (fs.existsSync(FETCH_CACHE_KEEP)) {
    fs.mkdirSync(path.dirname(wtFetch), { recursive: true });
    run('cp', [process.platform === 'darwin' ? '-cR' : '-R', FETCH_CACHE_KEEP, wtFetch]);
    console.log(`push checks: fetch-cache copied from ${FETCH_CACHE_KEEP} into the check build`);
    // Cowork ENTRY 195: entries older than 24 hours are dropped from the check build's copy, so old answers (a biography
    // loaded since, say) never show in a check build; the database writes also purge their tables' entries from the saved
    // copy (scripts/fetch-cache-purge.mjs --tag table:<name>).
    const { purge } = await import(path.join(HERE, '..', 'fetch-cache-purge.mjs'));
    const pr = purge(wtFetch, { olderThanHours: 24 });
    console.log(`push checks: fetch-cache entries older than 24 h dropped from the check build's copy: ${pr.dropped} (kept ${pr.kept})`);
  } else console.log('push checks: no saved fetch-cache; the build reads the database');
  // A dry run (PUSH_CHECKS_DRY=1, ENTRY 185) stops here, before the build: the layout lock, A16 and the copies ran.
  if (DRY) { console.log(`push checks: dry run, stopping before the build of ${sha.slice(0, 8)}`); code = 0; throw new Error('dry run'); }
  const env = { ...process.env, RECOMMENDATIONS_PUBLIC: '1' };
  execFileSync('npx', ['next', 'build'], { cwd: wt, env, stdio: ['ignore', 'ignore', 'inherit'] });
  // Keep this build's data cache for the next check build (replaced whole, so it never grows stale entries forever).
  if (fs.existsSync(wtFetch)) {
    fs.rmSync(FETCH_CACHE_KEEP, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(FETCH_CACHE_KEEP), { recursive: true });
    run('cp', [process.platform === 'darwin' ? '-cR' : '-R', wtFetch, FETCH_CACHE_KEEP]);
  }
  try { rulesRoutes = await mobileRulesRoutes(wt, fromOf.get(sha)); } catch { rulesRoutes = null; }
  const port = 3198;
  const out = fs.openSync(serverLog, 'a');
  server = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: wt, env, stdio: ['ignore', out, out], detached: true });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) { try { await fetch(`${base}/support`); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  if (lane.fast) await fastLaneChecks(wt, base, env);
  else try {
    run('node', ['scripts/checks/mobile-audit.mjs', '--fast', '--base', base, '--out', path.join(os.tmpdir(), 'opengovt-audit-fast')], { cwd: wt, env });
    run('node', ['scripts/checks/mobile-audit-deep.mjs', '--base', base, '--section', 'journeys', '--engines', 'chromium', '--journeys', 'e,g', '--out', path.join(os.tmpdir(), 'opengovt-audit-journeys')], { cwd: wt, env });
    run('node', ['scripts/checks/sitemap-dates-check.mjs', '--base', base], { cwd: wt, env });
    // Hub coverage (owner approved 19 Nov 2026, Cowork ENTRY 363): every hub page in /directory and /sitemap.xml. WARNING ONLY
    // until the list is clean, then failing (drop --warn).
    try { run('node', ['scripts/checks/hub-coverage.mjs', '--base', base, '--warn', '--out', path.join(os.tmpdir(), 'opengovt-hub-coverage.md')], { cwd: wt, env }); } catch (e) { console.log(`hub coverage: could not run (warning only): ${String(e.message).split('\n')[0]}`); }
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
    // MOB-RULES (owner approved 17 Nov 2026, Cowork ENTRY 260 and 283): the mobile rules check, WARNING ONLY until a full
    // run passes clean (then it blocks; Cowork is told). The page types the push reaches (the import map the visual
    // comparison uses, qa/vr-pages.mjs); every page type when a shared file changes (any stylesheet, app/layout.tsx,
    // app/components/, lib/phone-enhance.ts, or anything outside app/ and lib/ on the full-check list above, or the rules
    // check itself) or when the changed files reach no page type; none when only other check scripts changed (T2, 03:28). It never stops the push, and a failure to run is only printed.
    mobileRules(wt, base, env);
    code = 0;
    fs.writeFileSync(passedFile, sha);
  } catch {
    if (vrStopped) throw new Error('stopped for Cowork by the visual comparison (T1-VR): pages not named by the job look different, see the report above');
    console.error('Push refused: the fast mobile audit (checks a, b, c or h), a reader journey (e, g), the sitemap dates check or the QA1 rendered checks (A2, A3, A4, A6) failed, above. Fix them, commit and push again.');
    const lines = errorLines();
    console.error(`Server log: ${serverLog}${lines.length ? `; its error lines:\n  ${lines.join('\n  ')}` : ' (no error lines)'}`);
  }
} catch (e) {
  if (DRY && e.message === 'dry run') { /* the dry run's planned stop */ }
  else if (vrStopped) console.error(`Push ${e.message}.`);
  else console.error(`Push refused: the mobile audit could not run: ${e.message.split('\n')[0]}`);
} finally {
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  fs.rmSync(path.join(wt, '.env.local'), { force: true });
  try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo, stdio: 'ignore' }); execFileSync('git', ['worktree', 'prune'], { cwd: repo, stdio: 'ignore' }); } catch { /* left for git worktree prune */ }
}
// One line for STATUS (RULE.md section 5) and the lane with its samples for the after-check.
{
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  const result = DRY ? 'dry run, stopped before the build' : `${lane.fast ? 'fast' : 'full'} checks ${code === 0 ? 'passed' : vrStopped ? 'stopped for Cowork (visual comparison)' : 'failed'} in ${mins} min`;
  const line = `${laneLine.replace(/^(FAST LANE|FULL):/, `$1 ${sha.slice(0, 8)}:`)}; ${result}${lane.fast && code === 0 && !DRY ? '; full check to run against live (scripts/checks/fast-lane-after.mjs)' : ''}`;
  const summaryFile = path.join(logDir, `push-lane-${sha.slice(0, 8)}.txt`);
  try {
    fs.writeFileSync(summaryFile, `${line}\n`);
    fs.writeFileSync(summaryFile.replace(/\.txt$/, '.json'), JSON.stringify({ sha, base: fromOf.get(sha) ?? null, at: new Date().toISOString(), code, dry: DRY, ...lane }, null, 1));
    console.log(`push lane summary: ${summaryFile}\n  ${line}`);
  } catch (e) { console.log(`push lane summary: could not write ${summaryFile} (${e.message}); ${line}`); }
}
process.exit(code);
