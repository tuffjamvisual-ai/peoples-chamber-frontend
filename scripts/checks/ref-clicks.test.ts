// The ref tag click counter's rules (Cowork ENTRY 440): lib/ref-clicks.ts, the route's refusals and the report's formatting.
// Run: npx tsx --tsconfig tsconfig.json --test scripts/checks/ref-clicks.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPath, cleanRef, OTHER_REFS, PATH_MAX, refClickRow, refHour } from '../../lib/ref-clicks';
import { perTag, reportSql, statusLine, toText } from '../analytics/ref-report.mjs';

test('cleanRef: x1 to x9999 and the fixed other tags, lower case; anything else ignored', () => {
  assert.equal(cleanRef('x11'), 'x11');
  assert.equal(cleanRef('x1'), 'x1');
  assert.equal(cleanRef('x9999'), 'x9999');
  assert.equal(cleanRef(' X11 '), 'x11');
  for (const t of OTHER_REFS) assert.equal(cleanRef(t), t);
  assert.equal(cleanRef('x'), null);
  assert.equal(cleanRef('x12345'), null);
  assert.equal(cleanRef('x1a'), null);
  assert.equal(cleanRef('y11'), null);
  assert.equal(cleanRef('x11 extra'), null);
  assert.equal(cleanRef('jane@example.com'), null);
  assert.equal(cleanRef('producthunt'), null);
  assert.equal(cleanRef(''), null);
  assert.equal(cleanRef(null), null);
  assert.equal(cleanRef(11), null);
  assert.equal(cleanRef(['x11']), null);
});

test('cleanPath: from "/", no query string or fragment, at most 200 characters, printable ASCII', () => {
  assert.equal(cleanPath('/'), '/');
  assert.equal(cleanPath('/mps/keir-starmer'), '/mps/keir-starmer');
  assert.equal(cleanPath('/search?q=nhs&ref=x11'), '/search');
  assert.equal(cleanPath('/mps#votes'), '/mps');
  assert.equal(cleanPath('/a%20b'), '/a%20b');
  assert.equal(cleanPath('/' + 'a'.repeat(300))!.length, PATH_MAX);
  assert.equal(cleanPath('mps'), null);
  assert.equal(cleanPath('https://evil.example/'), null);
  assert.equal(cleanPath('?ref=x11'), null);
  assert.equal(cleanPath('/a b'), null);
  assert.equal(cleanPath('/café'), null);
  assert.equal(cleanPath('/a\nb'), null);
  assert.equal(cleanPath(''), null);
  assert.equal(cleanPath(undefined), null);
  assert.equal(cleanPath({}), null);
});

test('refHour: the start of the hour, UTC', () => {
  assert.equal(refHour(new Date('2026-11-20T21:47:12.345Z')), '2026-11-20T21:00:00.000Z');
  assert.equal(refHour(new Date('2026-07-01T00:00:00.000Z')), '2026-07-01T00:00:00.000Z');
  assert.equal(refHour(new Date('2026-07-01T00:59:59.999+01:00')), '2026-06-30T23:00:00.000Z');
});

test('refClickRow: only the tag, the path and the hour; anything else in the body ignored', () => {
  const now = new Date('2026-11-20T21:47:12Z');
  assert.deepEqual(refClickRow({ ref: 'X11', path: '/mps?x=1', ip: '1.2.3.4', ua: 'x', id: 'abc' }, now),
    { ref: 'x11', path: '/mps', hour: '2026-11-20T21:00:00.000Z' });
  assert.deepEqual(Object.keys(refClickRow({ ref: 'nl', path: '/' }, now)!), ['ref', 'path', 'hour']);
});

test('refClickRow: refused (nothing counted)', () => {
  const now = new Date('2026-11-20T21:47:12Z');
  assert.equal(refClickRow({ ref: 'evil', path: '/' }, now), null);
  assert.equal(refClickRow({ ref: 'x11', path: 'mps' }, now), null);
  assert.equal(refClickRow({ ref: 'x11' }, now), null);
  assert.equal(refClickRow({ path: '/' }, now), null);
  assert.equal(refClickRow(null, now), null);
  assert.equal(refClickRow('x11', now), null);
  assert.equal(refClickRow(['x11', '/'], now), null);
});

test('the route: POST only, refusals all answer 204 no-store noindex, nothing counted', async () => {
  const route = await import('../../app/api/ref-click/route');
  assert.deepEqual(Object.keys(route).filter((k) => /^[A-Z]+$/.test(k)), ['POST']);
  const post = (body: string, headers: Record<string, string> = {}) =>
    route.POST(new Request('http://localhost/api/ref-click', { method: 'POST', body, headers }));
  for (const res of [
    await post('{"ref":"x11","path":"/"}', { 'sec-fetch-site': 'cross-site' }),
    await post('x'.repeat(600)),
    await post('not json'),
    await post('{"ref":"evil","path":"/"}'),
  ]) {
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(res.headers.get('x-robots-tag') ?? '', /noindex/);
  }
});

const ROWS = [
  { ref: 'nl', path: '/', n: 2, first: '2026-11-20T09Z', last: '2026-11-20T10Z' },
  { ref: 'x10', path: '/mps', n: 3, first: '2026-11-19T09Z', last: '2026-11-19T12Z' },
  { ref: 'x11', path: '/debates', n: 4, first: '2026-11-20T21Z', last: '2026-11-20T22Z' },
  { ref: 'x11', path: '/', n: 1, first: '2026-11-20T21Z', last: '2026-11-20T21Z' },
  { ref: 'x9', path: '/pmqs', n: 3, first: '2026-11-18T09Z', last: '2026-11-18T09Z' },
];

test('report: per tag, most clicks first, newer x tag first on a tie; STATUS line', () => {
  assert.deepEqual(perTag(ROWS), [{ ref: 'x11', n: 5 }, { ref: 'x10', n: 3 }, { ref: 'x9', n: 3 }, { ref: 'nl', n: 2 }]);
  assert.equal(statusLine(ROWS), 'REF CLICKS: x11 5, x10 3, x9 3, nl 2');
  assert.equal(statusLine([]), 'REF CLICKS: none');
  const out = toText(ROWS, 7);
  assert.match(out, /^Ref tag clicks, last 7 days: 13/);
  assert.match(out, /x11: 5\n +4 {2}\/debates {2}\(2026-11-20T21Z to 2026-11-20T22Z\)\n +1 {2}\/ /);
  assert.ok(out.endsWith('REF CLICKS: x11 5, x10 3, x9 3, nl 2'));
});

test('report SQL: read only, days as a whole number only', () => {
  assert.doesNotMatch(reportSql(), /interval/);
  assert.match(reportSql(7), /interval '7 days'/);
  assert.doesNotMatch(reportSql(Number('1; DROP TABLE x')), /DROP/);
  assert.doesNotMatch(reportSql(), /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i);
});
