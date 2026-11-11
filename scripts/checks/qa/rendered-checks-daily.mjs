// The full rendered checks once a day against the live site (owner approved, 11 Nov 2026): A2, A3, A6 at all five sizes
// with the first-visit banner pass (www.opengovt.uk, the site's own host; opengovt.uk redirects there), and A9 with every council tab opened. One page load or tab click a second at most.
// The result is appended to Claude outputs/STATUS.md as one line; any new problem is named there for Cowork to make a job.
// Run at 05:17 UK time by launchd (scripts/launchd/uk.opengovt.daily-qa.plist); by hand:
//   node scripts/checks/qa/rendered-checks-daily.mjs
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = '/Volumes/GoliathSSD/opengovt-work/Claude outputs';
const STATUS = path.join(OUT, 'STATUS.md');
const dir = path.join(OUT, 'audit/daily-qa');
const ukTime = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', hour12: false }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const z = get('timeZoneName'); return `${get('hour')}:${get('minute')} ${z === 'BST' || z === 'GMT+1' ? 'BST' : 'GMT'}`;
};

if (!fs.existsSync(OUT)) { console.error(`daily QA: ${OUT} is not mounted; nothing run`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
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
    ? `DAILY-QA BLOCKED: only ${loaded} of ${results.length} live pages loaded (HTTP 200), so the checks did not run on the rest; ${fails.length} new problems on those that did. Full list: audit/daily-qa/rendered-${day}.json`
    : fails.length
    ? `DAILY-QA NEW PROBLEMS (for Cowork to make a job): live full rendered checks, ${summary.pages} pages, ${mins} min, ${fails.length} new: ${fails.slice(0, 5).join('; ')}${fails.length > 5 ? `; and ${fails.length - 5} more` : ''}. Full list: audit/daily-qa/rendered-${day}.json`
    : `DAILY-QA PASS: live full rendered checks (A2, A3, A6 at five sizes and first visit, A9 with council tabs), ${summary.pages} pages, ${mins} min, 0 new problems, ${summary.expected} expected`;
} catch {
  line = `DAILY-QA BLOCKED: the live rendered checks did not finish (exit ${r.status}); log: audit/daily-qa/rendered-${day}.log`;
}
fs.appendFileSync(STATUS, `${ukTime()} ${line}\n`);
console.log(line);
