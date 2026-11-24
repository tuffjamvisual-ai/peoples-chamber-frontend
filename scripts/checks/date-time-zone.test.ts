// Every date a page writes names its time zone (ENTRY 645 (7)): GOV.UK times are UK midnight, 23:00 UTC the day before in summer, so a server in UTC wrote the day before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { addDays, londonDay, londonDayEnd, londonDayStart } from '@/lib/london-date';

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

test('a London day\'s bounds hold exactly its own moments: 28 and 29 June, both clock changes, winter', () => {
  assert.equal(londonDayStart('2026-06-28'), '2026-06-27T23:00:00.000Z');
  assert.equal(londonDayEnd('2026-06-28'), '2026-06-28T22:59:59.999Z'); // a release at 23:00:00Z is 29 June and not in it
  assert.equal(londonDayStart('2026-01-15'), '2026-01-15T00:00:00.000Z');
  for (const [from, days] of [['2026-03-26', 6], ['2026-06-27', 4], ['2026-10-22', 6], ['2026-12-30', 4], ['2007-01-01', 3]] as [string, number][]) for (let i = 0; i < days; i++) {
    const d = addDays(from, i), a = londonDayStart(d), b = londonDayEnd(d);
    assert.equal(londonDay(new Date(a)), d); assert.equal(londonDay(new Date(b)), d);
    assert.notEqual(londonDay(new Date(Date.parse(a) - 1)), d); assert.notEqual(londonDay(new Date(Date.parse(b) + 1)), d);
    assert.equal(Date.parse(londonDayStart(addDays(d, 1))), Date.parse(b) + 1);
  }
});
