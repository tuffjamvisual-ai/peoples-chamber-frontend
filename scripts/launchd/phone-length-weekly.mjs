// The weekly phone length check (owner, 5 Nov 2026): pages grow as data grows, with no push to catch them. Sundays at 13:15,
// after the database backup (12:00), this builds what is on main in a temporary folder on GoliathSSD, measures every page
// type in scripts/checks/mobile-audit-pages.csv and every report and briefing (from the sitemap, also with JavaScript off)
// at 375px as each page first opens, with JavaScript on and off (since 6 Nov 2026), writes
// "Claude outputs/phone-length/<date>.csv" and lists any page over 9,000px (warn) or 10,000px (the limit) in
// "Claude outputs/phone-length/<date>-over-9000.txt" and in run.log. No page is changed and nothing is pushed.
//
// Everything that writes to the SSD is done from Node, because macOS refuses cp, rsync and mv on GoliathSSD under launchd
// but allows Node (see opengovt.archive-backup.sh). So the code comes from git cat-file rather than a git worktree, and
// next and the audit run with this same Node binary rather than through npx. If the drive is not mounted it logs nothing
// on it, says "skipped" and exits 0. Run by launchd: scripts/launchd/opengovt.phone-length.plist.
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';

const REPO = '/Users/johnnybot/peoples-chamber-frontend';
const SSD = '/Volumes/GoliathSSD';
const WORK = `${SSD}/opengovt-work`;
const OUT = `${WORK}/Claude outputs/phone-length`;
const REF = process.argv[2] ?? 'main';
const WARN = 9000, LIMIT = 10000, PORT = 3197;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
const mounted = fs.existsSync(WORK) && fs.statSync(SSD).dev !== fs.statSync('/Volumes').dev;
if (!mounted) { console.log(`${new Date().toISOString()} skipped: ${SSD} not mounted`); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; console.log(line); fs.appendFileSync(`${OUT}/run.log`, `${line}\n`); };

const tmpRoot = `${WORK}/claude-tmp/phone-length`;
const tmp = `${tmpRoot}/${today}-${process.pid}`;
const dir = `${tmp}/code`;
fs.mkdirSync(dir, { recursive: true });
const env = { ...process.env, TMPDIR: `${tmp}/`, RECOMMENDATIONS_PUBLIC: '1', NEXT_TELEMETRY_DISABLED: '1', PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` };

// Writes every tracked file of the ref into dir, using one git cat-file process.
function checkout(ref) {
  const list = execFileSync('git', ['-C', REPO, 'ls-tree', '-r', '-z', ref], { maxBuffer: 1 << 28, encoding: 'utf8' }).split('\0').filter(Boolean)
    .map((l) => { const [meta, name] = l.split('\t'); const [mode, type, sha] = meta.split(' '); return { mode, type, sha, name }; })
    .filter((f) => f.type === 'blob' && f.mode !== '120000');
  const blobs = execFileSync('git', ['-C', REPO, 'cat-file', '--batch'], { input: list.map((f) => f.sha).join('\n') + '\n', maxBuffer: 1 << 31 - 1 });
  let at = 0;
  for (const f of list) {
    const eol = blobs.indexOf(10, at);
    const size = Number(blobs.toString('utf8', at, eol).split(' ')[2]);
    const target = path.join(dir, f.name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, blobs.subarray(eol + 1, eol + 1 + size), { mode: f.mode === '100755' ? 0o755 : 0o644 });
    at = eol + 1 + size + 1;
  }
  return list.length;
}

function parseCsv(s) {
  const out = []; let r = [], c = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"' && s[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n') { r.push(c); out.push(r); r = []; c = ''; }
    else c += ch;
  }
  return out;
}
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const node = (args, opts = {}) => execFileSync(process.execPath, args, { cwd: dir, env, stdio: ['ignore', 'ignore', 'inherit'], ...opts });

let server = null, code = 1;
try {
  const sha = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', REF], { encoding: 'utf8' }).trim();
  log(`start: ${REF} at ${sha}`);
  log(`files: ${checkout(REF)}`);
  fs.cpSync(`${REPO}/node_modules`, `${dir}/node_modules`, { recursive: true, verbatimSymlinks: true });
  fs.copyFileSync(`${REPO}/.env.local`, `${dir}/.env.local`);
  log('code and modules copied; building');
  const nextBin = 'node_modules/next/dist/bin/next';
  node([nextBin, 'build']);
  log('built; measuring');
  server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], { cwd: dir, env, stdio: 'ignore', detached: true });
  const base = `http://localhost:${PORT}`;
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { try { await fetch(`${base}/support`); up = true; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
  if (!up) throw new Error('next start did not answer');
  // The audit's own exit code says whether a page is over the limit; the list below says the same, so it is not fatal here.
  const auditOut = `${tmp}/audit`;
  try { node(['scripts/checks/mobile-audit.mjs', '--base', base, '--widths', '375', '--no-shots', '--out', auditOut]); } catch (e) { if (!fs.existsSync(`${auditOut}/results.csv`)) throw e; }

  const R = parseCsv(fs.readFileSync(`${auditOut}/results.csv`, 'utf8')), h = R[0], ix = (k) => h.indexOf(k);
  const rows = R.slice(1).filter((r) => r.length > 1).map((r) => ({ route: r[ix('route')], url: r[ix('url')], status: r[ix('status')], heightOn: Number(r[ix('showing_page_height')]) || 0, heightOff: Number(r[ix('no_js_page_height')]) || 0, height: Math.max(Number(r[ix('showing_page_height')]) || 0, Number(r[ix('no_js_page_height')]) || 0) })).sort((a, b) => b.height - a.height);
  const verdict = (x) => (x.height > LIMIT ? 'over limit' : x.height > WARN ? 'warn' : '');
  fs.writeFileSync(`${OUT}/${today}.csv`, `route,url,status,height_px,js_on_px,js_off_px,result\n${rows.map((x) => [x.route, x.url, x.status, x.height, x.heightOn, x.heightOff, verdict(x)].map(cell).join(',')).join('\n')}\n`);
  const near = rows.filter((x) => x.height > WARN);
  const text = near.map((x) => `${x.height} ${verdict(x)} ${x.url} (JavaScript on ${x.heightOn}, off ${x.heightOff})`).join('\n');
  fs.writeFileSync(`${OUT}/${today}-over-9000.txt`, `${today}, main at ${sha}: ${rows.length} pages at 375px, ${near.length} over ${WARN}px, ${near.filter((x) => x.height > LIMIT).length} over ${LIMIT}px\n${text}\n`);
  log(`done: ${rows.length} pages, ${near.length} over ${WARN}px, ${near.filter((x) => x.height > LIMIT).length} over ${LIMIT}px, tallest ${rows[0]?.height}px${text ? `\n${text}` : ''}`);
  code = 0;
} catch (e) {
  log(`FAILED: ${String(e.message).split('\n')[0].slice(0, 300)}`);
} finally {
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  await new Promise((r) => setTimeout(r, 1000));
  fs.rmSync(`${dir}/.env.local`, { force: true });
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
}
process.exit(code);
