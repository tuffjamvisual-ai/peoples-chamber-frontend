// T1-VR: the push-time picture comparison loads the ten most visited pages and the page types whose code the push changes.
//   node --test scripts/checks/vr-pages.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { routeOf, routesReached, pushPages, TOP_PAGES, MAX_CHANGED_TYPES } from './qa/vr-pages.mjs';
import { parseCsv } from './qa/rendered-checks.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');

test('a page file gives its address; route groups and slots are not part of it', () => {
  assert.equal(routeOf(path.join('app', 'mps', '[id]', 'page.tsx')), '/mps/[id]');
  assert.equal(routeOf(path.join('app', 'page.tsx')), '/');
  assert.equal(routeOf(path.join('app', '(site)', 'about', 'page.tsx')), '/about');
});

test('a file used by one page type reaches that type only, through the files that import it', () => {
  assert.deepEqual(routesReached(ROOT, ['app/expenses/page.tsx']), ['/expenses']);
  assert.ok(routesReached(ROOT, ['app/mps/[id]/MpDossier.tsx']).includes('/mps/[id]'));
  assert.ok(routesReached(ROOT, ['lib/contract-lot-label.ts']).includes('/contracts/[ocid]'));
});

test('the root layout and globals.css reach every page type; the list keeps the ten and at most 12 more', () => {
  const r = pushPages(ROOT, ['app/globals.css'], parseCsv);
  assert.ok(r.reached.length > 100);
  assert.deepEqual(r.list.slice(0, 10).map((p) => p.url), TOP_PAGES);
  assert.equal(r.list.length, 10 + MAX_CHANGED_TYPES);
  assert.ok(r.left.length > 0, 'the rest are left to the nightly run');
});

test('a change to a top page adds nothing to the ten', () => {
  assert.equal(pushPages(ROOT, ['app/expenses/page.tsx'], parseCsv).list.length, 10);
  assert.equal(pushPages(ROOT, [], parseCsv).list.length, 10);
});
