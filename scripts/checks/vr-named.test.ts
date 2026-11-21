// The pages a job names (scripts/checks/qa/vr-named.mjs), from the commits' 'VR-pages:' lines.
// Run: npx tsx --test scripts/checks/vr-named.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitVrPages, parseVrPages, pageNamed } from './qa/vr-named.mjs';

// Push 54cf74a4 (21 Nov 2026): two commits, space separated names, one line each (git log --format=%B, newest first).
const push54cf74a4 = [
  'Organisation and donations sources: only the registers a page uses\n\nVR-pages: /organisations/[slug] /transparency/[section]\nCo-Authored-By: x\n',
  'Organisation, contractors and contracts listing pages: outside links and source lines only\n\nVR-pages: /organisations/[slug] /donations/government-contractors /transparency/contracts\nCo-Authored-By: x\n',
].join('\n');

test('54cf74a4: both changed pages are named', () => {
  const names = parseVrPages(push54cf74a4);
  assert.deepEqual(names, ['/organisations/[slug]', '/transparency/[section]', '/donations/government-contractors', '/transparency/contracts']);
  assert.equal(pageNamed(names, { route: '/donations/government-contractors', url: '/donations/government-contractors' }), true);
  assert.equal(pageNamed(names, { route: '/organisations/[slug]', url: '/organisations/british-science-association' }), true);
  assert.equal(pageNamed(names, { route: '/mps/[id]', url: '/mps/4029' }), false);
});

test('names are joined across commits; a none commit cancels nothing', () => {
  const names = parseVrPages('VR-pages: none\n\nx\nVR-pages: /councils/[slug] /mps/[id]\n\ny\nVR-pages: none (share images only)\n');
  assert.deepEqual(names, ['/councils/[slug]', '/mps/[id]']);
  assert.equal(pageNamed(names, { route: '/councils/[slug]', url: '/councils/derry-city-and-strabane' }), true);
});

test('commas, spaces, all, addresses and patterns', () => {
  assert.deepEqual(splitVrPages('/, /state-of-the-nation'), ['/', '/state-of-the-nation']);
  assert.deepEqual(splitVrPages('/editorials/[slug],/briefings/[slug]  /lords/[id]'), ['/editorials/[slug]', '/briefings/[slug]', '/lords/[id]']);
  assert.deepEqual(splitVrPages('https://www.opengovt.uk/mps/4029 https://opengovt.uk'), ['/mps/4029', '/']);
  assert.deepEqual(splitVrPages('none'), []);
  assert.equal(pageNamed(splitVrPages('all'), { route: '/x', url: '/x' }), true);
  assert.equal(pageNamed(['/mps/4029'], { route: '/mps/[id]', url: '/mps/4029' }), true);
  assert.equal(pageNamed(['/mps/4029'], { route: '/mps/[id]', url: '/mps/4030' }), false);
  // A page type names an address of that type even when the page's own route is reported differently.
  assert.equal(pageNamed(['/organisations/[slug]'], { route: '', url: '/organisations/acme?tab=1' }), true);
  // A pattern fits one segment only.
  assert.equal(pageNamed(['/organisations/[slug]'], { route: '/organisations/[slug]/donations', url: '/organisations/acme/donations' }), false);
  assert.equal(pageNamed(['/'], { route: '/mps', url: '/mps' }), false);
});
