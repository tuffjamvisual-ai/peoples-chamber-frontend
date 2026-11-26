// The article body's fold block (owner, 26 Nov 2026, Cowork ENTRY 705, 706): closed, its label and lines in the HTML, each line
// its own source link (a url field, never a link inside the text), its text in body_text.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/body-fold.test.tsx
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import BodyFold, { foldHref } from '../../app/components/BodyFold';
import { extractBodyText } from '../editorial-row';
import { bodyLinks } from '../body-links';
import type { Block } from '../../lib/editorials/types';

const fold: Block = { type: 'fold', label: 'All 2 entries', items: [
  { text: '5 July 2024: four tickets. From Silverstone Circuits Ltd. £2,193.60', url: 'https://interests-api.parliament.uk/api/v2/Interests/10051' },
  { text: '6 July 2024: two tickets. From Silverstone Circuits Ltd. £5,160' },
] };

test('the fold is closed, says its label, and holds its lines in the HTML', () => {
  const html = renderToStaticMarkup(<BodyFold label="All 2 entries"><li>one</li><li>two</li></BodyFold>);
  assert.match(html, /^<details class="art-fold"/);
  assert.ok(!/<details[^>]* open/.test(html), 'closed by default');
  assert.match(html, /<summary><span>All 2 entries<\/span><\/summary>/);
  assert.match(html, /<li>one<\/li><li>two<\/li>/, 'the lines are there while closed');
});

test('body_text takes the lines\' words, not their addresses or the label', () => {
  const t = extractBodyText([{ type: 'paragraph', text: '1. Greg Smith' }, fold]);
  assert.ok(t.includes('four tickets. From Silverstone Circuits Ltd. £2,193.60'));
  assert.ok(t.includes('6 July 2024: two tickets'));
  assert.ok(!t.includes('interests-api'), 'no address in the text');
  assert.ok(!t.includes('All 2 entries'));
});

test('a line\'s url is a source field, as a Sources item\'s; a link written inside its text is still refused (ENTRY 288)', () => {
  assert.deepEqual(bodyLinks([fold]), []);
  const bad = { type: 'fold', label: 'All 1 entries', items: [{ text: 'see [this](https://example.org/x)' }] };
  assert.equal(bodyLinks([bad]).length, 1);
});

test('only an http(s) address becomes a link (T2): javascript:, data: and others are never links', () => {
  assert.equal(foldHref('https://interests-api.parliament.uk/api/v2/Interests/10051'), 'https://interests-api.parliament.uk/api/v2/Interests/10051');
  assert.equal(foldHref(' http://example.org/x '), 'http://example.org/x');
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', '//evil.test/x', '/mps/1', 'mailto:a@b.c', '', undefined]) assert.equal(foldHref(bad), null, String(bad));
});
