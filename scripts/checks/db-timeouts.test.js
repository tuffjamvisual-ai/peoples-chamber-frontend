// T1-MEM B (COWORK-TO-T1 ENTRY 116): withTimeouts puts the limits inside each transaction.
//   node --test scripts/checks/db-timeouts.test.js            (no database)
//   DB_TIMEOUT_LIVE=1 node --test scripts/checks/db-timeouts.test.js   (also: a 70 s pg_sleep is stopped at 60 s; read only)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { withTimeouts, TIMEOUTS } = require('../lib/db-timeouts');

test('plain SQL is wrapped in one transaction with the limits first', () => {
  assert.equal(withTimeouts('SELECT 1;'), `BEGIN;\n${TIMEOUTS}\nSELECT 1;\nCOMMIT;\n`);
});
test('each existing BEGIN gets the limits after it', () => {
  const out = withTimeouts('BEGIN READ ONLY;\nSELECT 1;\nROLLBACK;\nBEGIN;\nUPDATE t SET a = 1;\nCOMMIT;');
  assert.equal(out.split(TIMEOUTS).length - 1, 2);
  assert.ok(out.startsWith(`BEGIN READ ONLY;\n${TIMEOUTS}`));
});
test('work that cannot run in a transaction is left alone', () => {
  const s = 'CREATE INDEX CONCURRENTLY x ON t (a);';
  assert.equal(withTimeouts(s), s);
});
test('a 70 s statement is stopped at 60 s', { skip: !process.env.DB_TIMEOUT_LIVE }, () => {
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local'), quiet: true });
  const t0 = Date.now();
  let err = '';
  try {
    execFileSync('psql', [process.env.DATABASE_URL, '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { input: withTimeouts('SELECT pg_sleep(70);'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) { err = String(e.stderr || ''); }
  const secs = (Date.now() - t0) / 1000;
  console.log(`stopped after ${secs.toFixed(1)} s: ${err.trim().split('\n')[0]}`);
  assert.match(err, /statement timeout/);
  assert.ok(secs >= 59 && secs < 66, `took ${secs} s`);
});
