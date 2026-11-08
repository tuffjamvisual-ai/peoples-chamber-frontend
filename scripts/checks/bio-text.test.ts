// The MP biography renderer (BF1, app/mps/[id]/BioText.tsx), on the owner's approved sample (Lilian Greenwood, 4029,
// scripts/checks/fixtures/bio-4029-sample.md: the biography above the "---" line of the v2 sample, without its title).
// Run: npx tsx --test scripts/checks/bio-text.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BioText, { bioBlocks, safeHref } from '../../app/mps/[id]/BioText';
import { withoutLeadingLabel } from '../../lib/bio-labels';

const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'bio-4029-sample.md'), 'utf8');
// As the page splits political_bio (app/mps/[id]/page.tsx).
const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
const html = (paras: string[]) => renderToStaticMarkup(createElement(BioText, { paragraphs: paras }));
const links = (out: string) => [...out.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].map((m) => ({ attrs: m[1], href: /href="([^"]*)"/.exec(m[1])?.[1], text: m[2] }));
const sourceLinks = [...text.matchAll(/\[([^\]\n]+)\]\(((?:[^\s()]|\([^\s()]*\))+)\)/g)].map((m) => ({ text: m[1], url: m[2] }));

test('every link in the sample is https, keeps its text, and opens in the same tab with rel="noopener"', () => {
  const out = html(paragraphs);
  const found = links(out);
  assert.equal(sourceLinks.length, 18);
  assert.equal(found.length, sourceLinks.length);
  found.forEach((l, i) => {
    assert.ok(l.href?.startsWith('https://'), `link ${i + 1} is https`);
    assert.equal(l.text.replace(/&amp;/g, '&'), sourceLinks[i].text);
    assert.match(l.attrs, /rel="noopener"/);
    assert.doesNotMatch(l.attrs, /target=/);
  });
  // "DVSA plan" and "January written answer" exactly as written.
  assert.ok(found.some((l) => l.text === 'DVSA plan'));
  assert.ok(found.some((l) => l.text === 'January written answer'));
});

test('no markdown is left in the output: no "**", no "](" and no bare source addresses in the text', () => {
  const out = html(paragraphs);
  assert.doesNotMatch(out, /\*\*/);
  assert.doesNotMatch(out, /\]\(/);
  const visible = out.replace(/<[^>]+>/g, '');
  assert.doesNotMatch(visible, /https?:\/\//);
});

test('label paragraphs start with the label in bold, then the text', () => {
  const out = html(paragraphs);
  for (const label of ['Role.', 'Transport minister (2024 to 2026).', 'Transport Committee chair (2017 to 2020).', 'In opposition (2010 to 2024).',
    'Obstruction penalties · Legislation planned for January 2027.', 'Area wide prohibition · Legislation pending, no date.', 'Deadline missed.', 'Target due in 2035.']) {
    assert.ok(out.includes(`<p><strong>${label}</strong> `), `"${label}" opens its paragraph in bold`);
  }
  // Labels with colons and digits, as the brief's examples.
  assert.ok(html(['**Obstruction penalties: planned for January 2027.** Text.']).startsWith('<p><strong>Obstruction penalties: planned for January 2027.</strong> Text.</p>'));
});

test('a paragraph that is only a label is a subheading (h3)', () => {
  const out = html(paragraphs);
  const headings = [...out.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map((m) => m[1]);
  assert.deepEqual(headings, ['Commitments and outcomes, as of 8 November 2026.', 'Pavement parking.', 'Driving test waits.', 'Road safety.']);
  assert.equal(bioBlocks(paragraphs).filter((b) => b.kind === 'heading').length, 4);
});

test('javascript: and http: links, and anything not https, render as plain text', () => {
  const out = html(['Before [bad one](javascript:alert(1)) middle [old site](http://example.com/a) and [data](data:text/html,x) end [good](https://example.com/b).']);
  const found = links(out);
  assert.equal(found.length, 1);
  assert.equal(found[0].href, 'https://example.com/b');
  assert.doesNotMatch(out, /javascript:|http:\/\/|data:/);
  assert.match(out, /bad one/);
  assert.match(out, /old site/);
  assert.equal(safeHref('javascript:alert(1)'), null);
  assert.equal(safeHref('http://example.com'), null);
  assert.equal(safeHref('https://example.com/x'), 'https://example.com/x');
  // An address with brackets stays one link.
  assert.equal(links(html(['See [the seat](https://en.wikipedia.org/wiki/Rhondda_(UK_Parliament_constituency)).']))[0].href, 'https://en.wikipedia.org/wiki/Rhondda_(UK_Parliament_constituency)');
});

test('HTML in the text is never rendered as HTML', () => {
  const out = html(['**Label.** <script>alert(1)</script> <a href="https://x.example">raw</a> [ok](https://example.com)']);
  assert.doesNotMatch(out, /<script>/);
  assert.match(out, /&lt;script&gt;/);
  assert.equal(links(out).length, 1);
});

test('no other markdown is read: lists, tables, images and inline bold stay as written', () => {
  const out = html(['- a list line', '| a | table |', '![an image](https://example.com/i.png)', 'Some **bold** words.']);
  assert.match(out, /<p>- a list line<\/p>/);
  assert.match(out, /<p>\| a \| table \|<\/p>/);
  assert.match(out, /Some \*\*bold\*\* words\./);
  assert.match(out, /<p>!\[an image\]\(https:\/\/example\.com\/i\.png\)<\/p>/);
  assert.doesNotMatch(out, /<img|<ul|<table/);
});

test('the RSS lead drops the link markup and keeps the descriptive text', () => {
  const lead = withoutLeadingLabel(text);
  assert.doesNotMatch(lead, /\]\(|\*\*/);
  assert.ok(lead.startsWith('Labour MP for Nottingham South since May 2010.'));
  assert.match(lead, /\(official role\)/);
});
