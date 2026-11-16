// lib/html-lead.ts (ENTRY 135 H2): an article's first 3 paragraphs and the rest, never cutting an element in two.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/html-lead.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitHtmlLead } from '@/lib/html-lead';

test('splits after the third top-level block; a list counts as one, its inner paragraphs do not', () => {
  const r = splitHtmlLead('<p>a</p><ul><li><p>in list</p></li></ul><p>b</p><p>c</p>');
  assert.deepEqual(r, { lead: '<p>a</p><ul><li><p>in list</p></li></ul><p>b</p>', rest: '<p>c</p>' });
});
test('nothing after the third paragraph: no fold', () => {
  assert.equal(splitHtmlLead('<p>a</p><p>b</p><p>c</p>'), null);
  assert.equal(splitHtmlLead('<p>a</p><p>b</p><p>c</p>  <br/>'), null);
  assert.equal(splitHtmlLead('<p>a</p>'), null);
});
test('one wrapper (GOV.UK govspeak): split inside it, both halves keep it', () => {
  const r = splitHtmlLead('<div class="govspeak"><div class="cta"><ul><li>x</li></ul></div><p>a</p><p>b</p><p>c</p><h2>H</h2><p>d</p></div>');
  assert.deepEqual(r, { lead: '<div class="govspeak"><div class="cta"><ul><li>x</li></ul></div><p>a</p><p>b</p></div>', rest: '<div class="govspeak"><p>c</p><h2>H</h2><p>d</p></div>' });
});
test('two top-level wrappers are not unwrapped', () => {
  assert.equal(splitHtmlLead('<div><p>a</p><p>b</p><p>c</p><p>d</p></div><div>x</div>'), null);
});
