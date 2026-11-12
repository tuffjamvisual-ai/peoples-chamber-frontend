// The full rendered checks, then the accuracy checks A11 to A14, once a day against the live site (owner approved, 11 Nov 2026): A2, A3, A6 at all five sizes
// with the first-visit banner pass (www.opengovt.uk, the site's own host; opengovt.uk redirects there), and A9 with every council tab opened. One page load or tab click a second at most.
// The result is appended to Claude outputs/STATUS.md as one line; any new problem is named there for Cowork to make a job.
// macOS does not let launchd jobs write to the external drive (12 Nov 2026: the first 05:17 run exited 78 before starting),
// so the logs and JSON go to ~/opengovt-backup/daily-qa, and a STATUS line that cannot be appended goes to STATUS-pending.md
// there, for Terminal 1 to copy into STATUS.md at the start of its next session.
// A11 checks every record on Mondays (Cowork, 12 Nov 2026: weekly, after 05:17, live site only, paced); a sample of 50 per kind otherwise.
// T1-VR (Cowork, 12 Nov 2026): then the nightly picture comparison of the full sample, live against the previous night
// (scripts/checks/qa/visual-compare.mjs --nightly), which writes its own STATUS line.
// Run at 05:17 UK time by launchd (scripts/launchd/uk.opengovt.daily-qa.plist); by hand:
//   node scripts/checks/qa/rendered-checks-daily.mjs
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = '/Volumes/GoliathSSD/opengovt-work/Claude outputs';
const STATUS = path.join(OUT, 'STATUS.md');
const dir = path.join(os.homedir(), 'opengovt-backup/daily-qa');
const PENDING = path.join(dir, 'STATUS-pending.md');
const status = (text) => {
  try { fs.appendFileSync(STATUS, text); } catch { fs.appendFileSync(PENDING, text); }
};
const ukTime = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', hour12: false }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const z = get('timeZoneName'); return `${get('hour')}:${get('minute')} ${z === 'BST' || z === 'GMT+1' ? 'BST' : 'GMT'}`;
};

fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(OUT)) status(`${ukTime()} DAILY-QA NOTE: ${OUT} was not mounted; results below are in ~/opengovt-backup/daily-qa\n`);
const day = new Date().toISOString().slice(0, 10);
const json = path.join(dir, `rendered-${day}.json`);
const started = Date.now();
const r = spawnSync('node', ['scripts/checks/qa/rendered-checks.mjs', '--base', 'https://www.opengovt.uk', '--json', json], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 });
fs.writeFileSync(path.join(dir, `rendered-${day}.log`), `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
const mins = Math.round((Date.now() - started) / 60000);
let line;
try {
  const { summary, fails, results } = JSON.parse(fs.readFileSync(json, 'utf8'));
  // A run in which pages did not load is not a pass: nothing on them was measured.
  const loaded = results.filter((x) => x.status === 200).length;
  line = loaded < results.length * 0.9
    ? `DAILY-QA BLOCKED: only ${loaded} of ${results.length} live pages loaded (HTTP 200), so the checks did not run on the rest; ${fails.length} new problems on those that did. Full list: ~/opengovt-backup/daily-qa/rendered-${day}.json`
    : fails.length
    ? `DAILY-QA NEW PROBLEMS (for Cowork to make a job): live full rendered checks, ${summary.pages} pages, ${mins} min, ${fails.length} new: ${fails.slice(0, 5).join('; ')}${fails.length > 5 ? `; and ${fails.length - 5} more` : ''}. Full list: ~/opengovt-backup/daily-qa/rendered-${day}.json`
    : `DAILY-QA PASS: live full rendered checks (A2, A3, A6 at five sizes and first visit, A9 with council tabs), ${summary.pages} pages, ${mins} min, 0 new problems, ${summary.expected} expected`;
} catch {
  line = `DAILY-QA BLOCKED: the live rendered checks did not finish (exit ${r.status}); log: ~/opengovt-backup/daily-qa/rendered-${day}.log`;
}
status(`${ukTime()} ${line}\n`);
console.log(line);

// The accuracy checks A11 to A14 (T1-QA9, Cowork 11 and 12 Nov 2026, accuracy first), against the same live site, one
// page load a second; one more STATUS line, any new problem named for Cowork to make a job.
const aJson = path.join(dir, `accuracy-${day}.json`);
const aStart = Date.now();
const monday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short' }).format(new Date()) === 'Mon';
const a = spawnSync('npx', ['tsx', '--tsconfig', 'tsconfig.json', 'scripts/checks/qa/accuracy-checks.ts', '--base', 'https://www.opengovt.uk', '--json', aJson, ...(monday ? ['--all'] : [])], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 });
fs.writeFileSync(path.join(dir, `accuracy-${day}.log`), `${a.stdout ?? ''}\n${a.stderr ?? ''}`);
let aLine;
try {
  const { summary, fails } = JSON.parse(fs.readFileSync(aJson, 'utf8'));
  const mins = Math.round((Date.now() - aStart) / 60000);
  aLine = fails.length
    ? `DAILY-ACCURACY NEW PROBLEMS (for Cowork to make a job): ${mins} min, ${fails.length} new: ${fails.slice(0, 5).join('; ')}${fails.length > 5 ? `; and ${fails.length - 5} more` : ''}. Full list: ~/opengovt-backup/daily-qa/accuracy-${day}.json`
    : `DAILY-ACCURACY PASS: A11 to A14 on the live site (A11 ${monday ? 'every record' : '50 per kind'}), ${mins} min, 0 new problems: ${JSON.stringify(summary)}`;
} catch {
  aLine = `DAILY-ACCURACY BLOCKED: the accuracy checks did not finish (exit ${a.status}); log: ~/opengovt-backup/daily-qa/accuracy-${day}.log`;
}
status(`${ukTime()} ${aLine}\n`);
console.log(aLine);

// T1-VR (Cowork, 12 Nov 2026): the full sample's pictures, live against the previous night, one page load a second; the
// script writes its own STATUS line (changes not named by a push since the last run are listed there for Cowork).
const v = spawnSync('node', ['scripts/checks/qa/visual-compare.mjs', '--nightly'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 });
fs.writeFileSync(path.join(dir, `visual-${day}.log`), `${v.stdout ?? ''}\n${v.stderr ?? ''}`);
if (v.status !== 0) status(`${ukTime()} VISUAL-NIGHTLY BLOCKED: the picture comparison did not finish (exit ${v.status}); log: ~/opengovt-backup/daily-qa/visual-${day}.log\n`);
