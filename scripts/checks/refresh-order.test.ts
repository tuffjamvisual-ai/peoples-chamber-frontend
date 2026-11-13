// T1-SITEMAP (Cowork 13 Nov 2026): a publish refreshes the data before the pages, listing pages and the sitemap last, and
// the refresh route expires tags at once ({ expire: 0 }), so no page is rebuilt from the list as it was before.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/refresh-order.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { refreshOrder } from '../../lib/refresh-order';

test('the listing pages, the feed and the sitemap come last, the sitemap at the very end', () => {
  const order = refreshOrder(['/editorials/abc', '/editorials/abc/sources', '/reports', '/', '/feed.xml', '/sitemap.xml', '/topics/housing', '/mps/1']);
  assert.deepEqual(order, ['/editorials/abc', '/editorials/abc/sources', '/topics/housing', '/mps/1', '/reports', '/', '/feed.xml', '/sitemap.xml']);
});

test('no path is lost or repeated', () => {
  const paths = ['/a', '/sitemap.xml', '/a', '/b'];
  assert.deepEqual(refreshOrder(paths), ['/a', '/b', '/sitemap.xml']);
});

test('the refresh route expires tags at once, not stale while revalidate', () => {
  const src = fs.readFileSync('app/api/revalidate/route.ts', 'utf8');
  assert.match(src, /revalidateTag\(t, \{ expire: 0 \}\)/);
  assert.doesNotMatch(src, /revalidateTag\([^)]*'max'\)/);
});

test('publish-editorial refreshes the tags in a call before the paths', () => {
  const src = fs.readFileSync('scripts/publish-editorial.ts', 'utf8');
  const tagsAt = src.indexOf("['tags', tags.flatMap"), pathsAt = src.indexOf("['paths', ordered.flatMap");
  assert.ok(tagsAt > 0 && pathsAt > tagsAt, 'the tags step comes before the paths step');
  assert.match(src, /refreshOrder\(paths\)/);
});
