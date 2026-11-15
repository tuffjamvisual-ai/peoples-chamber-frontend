// Security review M4 (COWORK-TO-T1 ENTRY 59): the one allow-list sanitiser (lib/html-sanitize.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/html-sanitize.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../../lib/html-sanitize';

const keep = { links: 'keep' as const, hansardColumns: false };

test('scripts, styles, frames and their content are removed; text stays', () => {
  assert.equal(sanitizeHtml('<p>a<script>alert(1)</script>b</p>', keep), '<p>ab</p>');
  assert.equal(sanitizeHtml('<p>a</p><style>p{}</style><iframe src="https://x"></iframe><svg><script>1</script></svg>', keep), '<p>a</p>');
  assert.equal(sanitizeHtml('<scr<script>ipt>alert(1)</script>', keep).includes('<script'), false);
});

test('event handlers, quoted or not, any case, are dropped', () => {
  const out = sanitizeHtml('<p onclick="x()" ONMOUSEOVER=y() class="c">t</p><img src=x onerror=alert(1)>', keep);
  assert.ok(!/on[a-z]+=/i.test(out), out);
  assert.ok(out.includes('<p class="c">t</p>'));
});

test('javascript:, data: and protocol-relative links lose their href; http(s), mailto, paths and anchors keep it', () => {
  for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'jav&#x09;ascript:alert(1)', 'data:text/html,x', '//evil.example/x']) {
    assert.ok(!/href=/.test(sanitizeHtml(`<a href="${bad}">x</a>`, keep)), bad);
  }
  for (const ok of ['https://www.gov.uk/x', 'http://a.b/', 'mailto:a@b.c', '/mps/4858', '#section']) {
    assert.ok(sanitizeHtml(`<a href="${ok}">x</a>`, keep).includes('href='), ok);
  }
});

test('style attributes are dropped; images only with an https source', () => {
  assert.equal(sanitizeHtml('<p style="position:fixed">t</p>', keep), '<p>t</p>');
  assert.equal(sanitizeHtml('<img src="https://a.gov.uk/p.png" alt="A" width="10">', keep), '<img src="https://a.gov.uk/p.png" alt="A" width="10">');
  assert.equal(sanitizeHtml('<img src="http://a/p.png" alt="A">', keep), '<img alt="A">');
});

test('the old per-page rules: links stripped (text kept) and empty Hansard column spans removed, by default', () => {
  assert.equal(sanitizeHtml('<p>See <a href="https://x">this</a></p>'), '<p>See this</p>');
  assert.equal(sanitizeHtml('<span id="97" class="column-number column-only" data-column-number="97"></span><em>Chairs:</em> A'), '<em>Chairs:</em> A');
});

test('text is escaped again, so decoded entities cannot become markup', () => {
  assert.equal(sanitizeHtml('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>', keep), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});
