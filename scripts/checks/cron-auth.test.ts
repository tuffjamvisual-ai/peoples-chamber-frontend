// Security review L1 / L2 (COWORK-TO-T1 ENTRY 59): the shared Bearer check fails closed, and every route uses it.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/cron-auth.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bearerMatches } from '../../lib/cron-auth';

test('right secret passes; wrong, missing or partial does not', () => {
  assert.equal(bearerMatches('Bearer s3cret', 's3cret'), true);
  assert.equal(bearerMatches('Bearer s3cre', 's3cret'), false);
  assert.equal(bearerMatches('Bearer s3cretX', 's3cret'), false);
  assert.equal(bearerMatches('s3cret', 's3cret'), false);
  assert.equal(bearerMatches(null, 's3cret'), false);
});

test('fails closed with no secret set (never "Bearer undefined")', () => {
  assert.equal(bearerMatches('Bearer undefined', undefined), false);
  assert.equal(bearerMatches('Bearer ', ''), false);
  assert.equal(bearerMatches('Bearer null', null), false);
});

test('no route compares the header by hand any more', () => {
  const left: string[] = [];
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) { const s = fs.readFileSync(p, 'utf8'); if (/headers\.get\(['"]authorization['"]\)\s*[!=]==/.test(s)) left.push(p); } } };
  walk(path.join(__dirname, '../../app'));
  assert.deepEqual(left, []);
});
