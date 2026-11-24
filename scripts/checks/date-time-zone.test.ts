// Every date a page writes names its time zone (ENTRY 645 (7)): GOV.UK times are UK midnight, 23:00 UTC the day before in summer, so a server in UTC wrote the day before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const files: string[] = [];
const walk = (d: string) => { for (const e of readdirSync(d)) { const p = path.join(d, e); if (statSync(p).isDirectory()) { if (p !== path.join('app', 'api')) walk(p); } else if (/\.tsx?$/.test(p)) files.push(p); } };
walk('app'); walk('lib');

test('toLocaleDateString and toLocaleTimeString always name a timeZone', () => {
  const bad: string[] = [];
  for (const f of files) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\.toLocale(?:Date|Time)String\(/g)) {
      const at = s.slice(m.index, m.index + 320); const end = at.indexOf(')');
      const call = at.slice(0, at.indexOf('})') > 0 && at.indexOf('})') < 300 ? at.indexOf('})') + 2 : end + 1);
      if (!/timeZone/.test(call)) bad.push(`${f}: ${call.slice(0, 80)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('a date and T00:00:00 is read as UTC, so a reader\'s own time zone cannot move the day', () => {
  assert.deepEqual(files.filter((f) => /T00:00:00'\)/.test(readFileSync(f, 'utf8')) && /T00:00:00'\)\.toLocale/.test(readFileSync(f, 'utf8'))), []);
});

test('UK midnight in summer is written as that UK day', () => {
  assert.equal(new Date('2026-06-28T23:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/London' }), '29 June');
});
