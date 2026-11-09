// QA1 A5 (owner approved, 9 Nov 2026): house style on interface text, in the test run so a new breach fails it.
// Wording written into components (JSX text, string children, title, aria-label, alt, placeholder) has no hyphen or dash
// in our own words (scripts/style-dash.ts, shared with the editorial publish check) and says "per cent", not "%".
// Exceptions: scripts/checks/qa/house-style-exceptions.json. Known findings when the check was added are in
// scripts/checks/qa/house-style-baseline.json and do not fail; fixing one means removing it there. A finding not in the
// baseline fails. Update the baseline only for wording the owner accepts:
//   npx tsx scripts/checks/house-style-interface.test.ts --write-baseline
// Run: npx tsx --test scripts/checks/house-style-interface.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkText, findingKey, interfaceTexts, scanInterfaceText } from './qa/interface-text';

const ROOT = path.join(__dirname, '..', '..');
const BASELINE = path.join(ROOT, 'scripts/checks/qa/house-style-baseline.json');

if (process.argv.includes('--write-baseline')) {
  const keys = [...new Set(scanInterfaceText(ROOT).map(findingKey))].sort();
  fs.writeFileSync(BASELINE, JSON.stringify({ about: 'QA1 A5 known interface text findings (file|rule|text). Remove a line when it is fixed.', findings: keys }, null, 1) + '\n');
  console.log(`baseline written: ${keys.length} findings`);
  process.exit(0);
}

test('no new hyphen, dash or "%" in interface text', () => {
  const known = new Set<string>(JSON.parse(fs.readFileSync(BASELINE, 'utf8')).findings);
  const now = scanInterfaceText(ROOT);
  const fresh = now.filter((f) => !known.has(findingKey(f)));
  assert.deepEqual(fresh.map((f) => `${f.file}:${f.line} [${f.rule}] ${f.text}`), [], 'new house style breaches in interface text');
});

test('the rules: hyphens and dashes in wording, "%" after a number, addresses and allowed names skipped', () => {
  assert.deepEqual(checkText('a well-run council', []), ['dash']);
  assert.deepEqual(checkText('Rose by 12% last year', []), ['percent']);
  assert.deepEqual(checkText('% of them', []), ['percent']);
  assert.deepEqual(checkText('See /councils/north-northamptonshire for more', []), []);
  assert.deepEqual(checkText('Lab & Co-op', ['Co-op']), []);
  assert.deepEqual(checkText('up 12 per cent', []), []);
});

test('only wording is read: style blocks, class names and code are not', () => {
  const src = `export default function P() { return (<div className="full-width"><style>{'.a { max-width: 10% }'}</style><p title="A well-run test">Text {n}% of all</p></div>); }`;
  const texts = interfaceTexts(src, 'x.tsx').map((t) => t.text);
  assert.deepEqual(texts, ['A well-run test', 'Text', '% of all']);
});
