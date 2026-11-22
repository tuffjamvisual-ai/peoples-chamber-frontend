// T1-HL: the page's own path; a sync's background rebuild of the front page on Vercel reports '/index'.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/page-path.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pagePath } from '../../lib/use-page-path';
import { currentSection } from '../../lib/site-nav';

// The header has no Home item since ENTRY 502 (the logo links home), so the front page marks no menu item.
test("'/index' is the front page, and the menu marks no item there", () => {
  assert.equal(pagePath('/index'), '/');
  assert.equal(currentSection(pagePath('/index')), null);
  assert.equal(pagePath(null), '/');
  assert.equal(pagePath(''), '/');
});

test('every other path is left as it is', () => {
  for (const p of ['/', '/bills', '/bills/3942', '/transparency/press-releases', '/indexes', '/mps/4858']) assert.equal(pagePath(p), p);
  assert.equal(currentSection(pagePath('/bills')), 'Parliament');
});
