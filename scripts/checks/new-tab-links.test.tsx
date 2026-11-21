// Links to other sites open in a new tab (owner, Cowork ENTRY 450): the shared check (lib/external-link.ts), the JSX
// runtime that applies it to every page (lib/og-jsx, tsconfig jsxImportSource), and the A20 push check
// (scripts/checks/qa/new-tab-links.mjs).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/new-tab-links.test.tsx
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { isExternalHref, externalLinksInHtml, newTabRel } from '../../lib/external-link';
import { newTabFailures } from './qa/new-tab-links.mjs';

const HIDDEN = '<span class="sr-only"> (opens in a new tab)</span>';

test('isExternalHref: other hosts only', () => {
  for (const h of ['https://www.derbyshire.gov.uk/', 'http://example.org/x', '//bbc.co.uk/news', ' https://gov.uk ']) assert.equal(isExternalHref(h), true, h);
  for (const h of ['/councils/kent', 'councils', '#sources', '?page=2', 'mailto:contact@opengovt.uk', 'tel:+441234', 'https://opengovt.uk/mps/1', 'https://www.opengovt.uk/', 'javascript:void(0)', '', undefined, null, 3]) assert.equal(isExternalHref(h), false, String(h));
});

test('newTabRel keeps the link\'s own rel words', () => {
  assert.equal(newTabRel(undefined), 'noopener noreferrer');
  assert.equal(newTabRel('noopener'), 'noopener noreferrer');
  assert.equal(newTabRel('license'), 'license noopener noreferrer');
});

test('JSX: a link to another site gets target, rel and the hidden text', () => {
  assert.equal(renderToStaticMarkup(<a href="https://www.derbyshire.gov.uk/">derbyshire.gov.uk</a>),
    `<a href="https://www.derbyshire.gov.uk/" target="_blank" rel="noopener noreferrer">derbyshire.gov.uk${HIDDEN}</a>`);
  // Several children, a rel of its own, an aria-label (which names the link, so it gets the words).
  const n = 3;
  assert.equal(renderToStaticMarkup(<a href="https://x.org" rel="license" aria-label="Licence">CC BY {n}</a>),
    `<a href="https://x.org" rel="license noopener noreferrer" aria-label="Licence (opens in a new tab)" target="_blank">CC BY 3${HIDDEN}</a>`);
  // A list of links rendered from data.
  const rows = ['https://a.org', '/councils/kent'];
  const html = renderToStaticMarkup(<ul>{rows.map((u) => <li key={u}><a href={u}>{u}</a></li>)}</ul>);
  assert.equal(html, `<ul><li><a href="https://a.org" target="_blank" rel="noopener noreferrer">https://a.org${HIDDEN}</a></li><li><a href="/councils/kent">/councils/kent</a></li></ul>`);
});

test('JSX: internal, mailto and tel links are unchanged', () => {
  for (const h of ['/councils/kent', 'https://www.opengovt.uk/about', '#sources', 'mailto:contact@opengovt.uk', 'tel:01234']) {
    assert.equal(renderToStaticMarkup(<a href={h}>x</a>), `<a href="${h}">x</a>`);
  }
});

test('HTML strings: links inside dangerouslySetInnerHTML', () => {
  const inner = '<p>See <a href="https://www.derbyshire.gov.uk">the council</a> and <a href="/mps/1">an MP</a>.</p>';
  assert.equal(renderToStaticMarkup(<div dangerouslySetInnerHTML={{ __html: inner }} />),
    `<div><p>See <a href="https://www.derbyshire.gov.uk" target="_blank" rel="noopener noreferrer">the council${HIDDEN}</a> and <a href="/mps/1">an MP</a>.</p></div>`);
  // Already a new tab (lib/answer-html.ts): the target and rel stay once, the hidden text is added once.
  const once = externalLinksInHtml('<a href="https://x.org" target="_blank" rel="noopener noreferrer">x</a>');
  assert.equal(once, `<a href="https://x.org" target="_blank" rel="noopener noreferrer">x${HIDDEN}</a>`);
  assert.equal(externalLinksInHtml(once), once);
  assert.equal(externalLinksInHtml("<a href='https://x.org' target=_self>x</a>"), `<a href='https://x.org' target="_blank" rel="noopener noreferrer">x${HIDDEN}</a>`);
  assert.equal(externalLinksInHtml('<a href="mailto:a@b.c">m</a><abbr>x</abbr>'), '<a href="mailto:a@b.c">m</a><abbr>x</abbr>');
  // A script's text is never changed.
  const js = 'var s = "<a href=\\"https://x.org\\">x</a>";';
  assert.equal(renderToStaticMarkup(<script dangerouslySetInnerHTML={{ __html: js }} />), `<script>${js}</script>`);
});

test('A20: a link to another host without target="_blank" fails', () => {
  const page = 'http://localhost:3290/councils/derbyshire';
  const links = [
    { href: 'https://www.derbyshire.gov.uk/', target: '', label: 'derbyshire.gov.uk' },
    { href: 'https://www.gov.uk/x', target: '_blank', label: 'GOV.UK' },
    { href: '/councils/kent', target: '', label: 'Kent' },
    { href: 'https://www.opengovt.uk/about', target: '', label: 'About' },
    { href: 'http://localhost:3290/mps', target: '', label: 'MPs' },
    { href: 'mailto:contact@opengovt.uk', target: '', label: 'Email' },
    { href: 'tel:01234', target: '', label: 'Phone' },
    { href: '//bbc.co.uk/news', target: '_self', label: 'BBC' },
  ];
  assert.deepEqual(newTabFailures(links, page), ['derbyshire.gov.uk: derbyshire.gov.uk', 'bbc.co.uk: BBC']);
  assert.deepEqual(newTabFailures(links.filter((l) => l.target === '_blank' || !/^(https?:)?\/\/(www\.)?(derbyshire|bbc)/.test(l.href)), page), []);
});
