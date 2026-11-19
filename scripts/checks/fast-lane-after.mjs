// The fast lane's full check straight after the push (owner approved, Cowork ENTRY 404; RULE.md sections 4 and 7):
// once a fast lane push is live, the checks the push skipped run against the live site, one page a second:
// the fast mobile audit, reader journeys e and g, the sitemap dates check, A2 and A3 on the sample pages, the sample share
// images and pages, and the visual comparison of the sample pages (before the push against after).
//
//   node scripts/checks/fast-lane-after.mjs --sha <hash> [--lane <push-lane-<hash>.json> | --base <hash before the push>]
//        [--site https://www.opengovt.uk] [--before-dir <kept pictures>] [--out <dir>] [--no-wait] [--no-vr] [--state-only]
// Run it from a worktree of the pushed commit (its checks and baselines are the commit's), right after the push: while
// the deploy is still building it keeps 'before' pictures of the sample pages from the live site; then it waits until
// the newest production deploy of the commit is Ready on Vercel (vercel ls --prod -m githubCommitSha=<hash>, as the
// live CSS check does; Canceled counts as live, since the ignore-build step skipped it), waits 30 s more for the domain
// to move, and runs the checks. If the deploy is already Ready when it starts, the 'before' pictures are --before-dir or
// the newest nightly folder (~/opengovt-backup/vr-nightly/<day>), which can also show changes pushed since that night.
//
// The lane (sample pages and images) comes from the push check's push-lane-<hash>.json (written by
// mobile-audit-prepush.mjs in its log folder; found there by default), or is worked out again with --base.
// Exit 0: clean. 2: a HARD failure (a page or image not 200, a reader journey, A2/A3 on the sample pages): T1 reverts
// the push at once (RULE.md section 7 point 5). 3: only visual differences, or a check that is not on the hard list
// (the audit's height and overflow checks, the sitemap dates): T1 (and T2) read the report first. 4: could not check
// (the deploy failed or never became Ready). It never reverts anything itself.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { eligibility, gitRepo, checkSamples } from './fast-lane.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const SITE = arg('--site', 'https://www.opengovt.uk').replace(/\/$/, '');
const MAIN_CHECKOUT = '/Users/johnnybot/peoples-chamber-frontend'; // linked to the Vercel project (.vercel/project.json)
const SSD_LOGS = '/Volumes/EDGE_SSD/opengovt-work/claude-tmp/push-check-logs';
const LOG_DIR = process.env.AUDIT_LOG_DIR || (fs.existsSync(path.dirname(SSD_LOGS)) ? SSD_LOGS : os.tmpdir());
const NIGHT_DIR = path.join(os.homedir(), 'opengovt-backup/vr-nightly');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uk = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(new Date());

const shaIn = arg('--sha', null);
if (!shaIn) { console.error('fast lane after-check: --sha <hash> is required'); process.exit(4); }
const sha = execFileSync('git', ['rev-parse', `${shaIn}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim();
const s8 = sha.slice(0, 8);
// --state-only: print the commit's production deploy state (Ready, Building, Canceled, Error, none yet) and stop.
if (argv.includes('--state-only')) { console.log(deployState()); process.exit(0); }
const OUT = arg('--out', path.join(LOG_DIR, `after-${s8}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`));
fs.mkdirSync(OUT, { recursive: true });

// The lane and its samples.
let lane;
const laneFile = arg('--lane', path.join(LOG_DIR, `push-lane-${s8}.json`));
if (arg('--base', null)) lane = eligibility({ base: arg('--base'), head: sha, repo: gitRepo(ROOT) });
else if (fs.existsSync(laneFile)) lane = JSON.parse(fs.readFileSync(laneFile, 'utf8'));
else { console.error(`fast lane after-check: no lane file ${laneFile}; give --lane <file> or --base <hash before the push>`); process.exit(4); }
if (!lane.fast) console.log(`fast lane after-check: note, ${s8} did not take the fast lane (${(lane.reasons ?? []).join('; ')}); checking anyway`);
const samples = { imageRoutes: lane.samples?.imageRoutes ?? [], pages: lane.samples?.pages ?? [], staticFiles: lane.samples?.staticFiles ?? [] };
console.log(`fast lane after-check ${s8} against ${SITE}: ${samples.pages.length} sample pages, ${samples.imageRoutes.length} share images, ${samples.staticFiles.length} other files; output ${OUT}`);

// The commit's production deploy on Vercel: 'Ready', 'Canceled' (counts as live), 'Error', or something still to come.
function deployState() {
  const cwd = fs.existsSync(path.join(ROOT, '.vercel/project.json')) ? ROOT : MAIN_CHECKOUT;
  // The table comes on stderr, so both streams are read (as the live CSS check's 2>&1 does).
  const r = spawnSync('vercel', ['ls', '--prod', '-m', `githubCommitSha=${sha}`], { cwd, encoding: 'utf8' });
  if (r.error) return `unknown (${r.error.message})`;
  const rows = `${r.stdout}\n${r.stderr}`.split('\n').filter((l) => /vercel\.app/.test(l) && /Production|Preview/.test(l));
  const first = rows[0] ?? '';
  return /Ready/.test(first) ? 'Ready' : /Canceled/.test(first) ? 'Canceled' : /Error/.test(first) ? 'Error' : /Building|Queued|Initializing/.test(first) ? 'Building' : 'none yet';
}
const node = (script, args) => spawnSync('node', [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: 'inherit', env: process.env }).status;

const VR = !argv.includes('--no-vr') && samples.pages.length > 0;
let beforeDir = arg('--before-dir', null), vrNote = '';
let state = argv.includes('--no-wait') ? 'Ready' : deployState();
console.log(`deploy of ${s8}: ${state} (${uk()})`);
if (VR && !beforeDir) {
  if (state !== 'Ready' && state !== 'Canceled') {
    beforeDir = path.join(OUT, 'before');
    console.log('visual comparison: keeping the sample pages as the live site shows them before the push');
    if (node('scripts/checks/qa/visual-compare.mjs', ['--save-dir', beforeDir, '--only', samples.pages.join(','), '--live', SITE]) !== 0) vrNote = 'some before pictures could not be taken; ';
    // The deploy may have gone live while the pictures were taken: then they may show the push already.
    const now = deployState();
    if (now === 'Ready') vrNote += 'the deploy became Ready while the before pictures were taken, so some may show the push already; ';
    state = now;
  } else {
    const nights = fs.existsSync(NIGHT_DIR) ? fs.readdirSync(NIGHT_DIR).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() : [];
    if (nights.length) { beforeDir = path.join(NIGHT_DIR, nights[nights.length - 1]); vrNote = `the deploy was already live, so before = the nightly pictures of ${nights[nights.length - 1]} (changes pushed since then show too); `; }
    else vrNote = 'the deploy was already live and there are no nightly pictures, so no visual comparison; ';
  }
}

// Wait for the commit to be live: Ready (or Canceled), then 30 s for the domain to move.
if (!argv.includes('--no-wait')) {
  const until = Date.now() + 30 * 60 * 1000;
  while (state !== 'Ready' && state !== 'Canceled') {
    if (state === 'Error') { console.error(`fast lane after-check ${s8}: the production deploy failed; not checked`); finish(4, ['the production deploy failed; not checked'], [], []); }
    if (Date.now() > until) { console.error(`fast lane after-check ${s8}: no Ready deploy after 30 minutes; not checked`); finish(4, ['no Ready deploy after 30 minutes; not checked'], [], []); }
    await sleep(30000);
    state = deployState();
    console.log(`deploy of ${s8}: ${state} (${uk()})`);
  }
  console.log('deploy Ready; waiting 30 s for the domain to move to it');
  await sleep(30000);
}

const hard = [], visual = [], other = [];
// 1. The sample share images and pages (200, image/png 1200 x 630, og:image and twitter:image).
console.log('1. sample share images and pages');
for (const f of await checkSamples(SITE, samples)) hard.push(f);
// 2. The fast mobile audit: a page that did not load is hard; height and overflow problems are read first.
console.log('2. fast mobile audit');
const auditOut = path.join(OUT, 'audit-fast');
const auditCode = node('scripts/checks/mobile-audit.mjs', ['--fast', '--base', SITE, '--out', auditOut]);
if (auditCode !== 0) {
  let rows = null;
  try { rows = JSON.parse(fs.readFileSync(path.join(auditOut, 'fast-results.json'), 'utf8')); } catch { /* none */ }
  if (!rows) other.push(`fast mobile audit could not run (exit ${auditCode})`);
  else for (const r of rows) {
    const notLoaded = r.found.filter((f) => /did not load/.test(f.text));
    if (notLoaded.length) hard.push(`audit ${r.url}: ${notLoaded[0].text}`);
    const rest = r.found.filter((f) => !/did not load/.test(f.text));
    if (rest.length) other.push(`audit ${r.url}: ${[...new Set(rest.map((f) => `${f.check} ${f.text}`))].slice(0, 2).join(' / ').slice(0, 200)}`);
  }
}
// 3. Reader journeys e and g: hard.
console.log('3. reader journeys e, g');
if (node('scripts/checks/mobile-audit-deep.mjs', ['--base', SITE, '--section', 'journeys', '--engines', 'chromium', '--journeys', 'e,g', '--out', path.join(OUT, 'journeys')]) !== 0) hard.push('a reader journey (e or g) failed; see journeys/journeys.csv');
// 4. Sitemap dates: read first (data, not this push's files).
console.log('4. sitemap dates');
if (node('scripts/checks/sitemap-dates-check.mjs', ['--base', SITE]) !== 0) other.push('sitemap dates check failed');
// 5. A2 and A3 on the sample pages: hard.
if (samples.pages.length) {
  console.log('5. A2 and A3 on the sample pages');
  if (node('scripts/checks/qa/rendered-checks.mjs', ['--base', SITE, '--push', '--pages', samples.pages.join(','), '--only', 'A2,A3', '--json', path.join(OUT, 'rendered.json')]) !== 0) {
    let fails = [];
    try { fails = JSON.parse(fs.readFileSync(path.join(OUT, 'rendered.json'), 'utf8')).fails; } catch { /* none */ }
    hard.push(...(fails.length ? fails.map((f) => `rendered ${f}`) : ['A2/A3 rendered checks failed on the sample pages']));
  }
}
// 6. The visual comparison of the sample pages: visual.
if (VR && beforeDir) {
  console.log(`6. visual comparison of the sample pages against ${beforeDir}`);
  const vrOut = path.join(OUT, 'vr');
  if (node('scripts/checks/qa/visual-compare.mjs', ['--against-dir', beforeDir, '--only', samples.pages.join(','), '--base', SITE, '--sha', sha, '--out', vrOut]) !== 0) visual.push(`${vrNote}pages differ: ${path.join(vrOut, 'report.md')}`);
  else if (vrNote) other.push(`visual comparison passed; note: ${vrNote.replace(/; $/, '')}`);
} else if (VR) other.push(`no visual comparison: ${vrNote.replace(/; $/, '')}`);

finish(hard.length ? 2 : visual.length || other.length ? 3 : 0, hard, visual, other);

function finish(code, h, v, o) {
  const verdict = code === 0 ? 'CLEAN' : code === 2 ? 'HARD FAILURE (revert)' : code === 3 ? (v.length ? 'VISUAL DIFFERENCES (read first)' : 'CHECKS TO READ (not on the hard list)') : 'COULD NOT CHECK';
  const line = `FAST LANE AFTER ${s8}: ${verdict}; hard ${h.length}, visual ${v.length}, other ${o.length}; ${uk()}`;
  const text = [line, ...h.map((x) => `  HARD ${x}`), ...v.map((x) => `  VISUAL ${x}`), ...o.map((x) => `  OTHER ${x}`)].join('\n');
  const file = path.join(OUT, 'after-summary.txt');
  fs.writeFileSync(file, `${text}\n`);
  console.log(`\n${text}\nsummary: ${file}`);
  process.exit(code);
}
