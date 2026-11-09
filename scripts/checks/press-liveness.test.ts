// Press release liveness from GOV.UK's list (JF1e): a release's own page is requested only when it is missing from the
// list (and not already marked removed), listed again after being marked removed, or listed with no stored body.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/press-liveness.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { livenessPlan, listingComplete, govPath, MAX_PENDING, type StoredRelease } from '../../lib/press-liveness';

const url = (slug: string) => `https://www.gov.uk/government/news/${slug}`;
const stored: StoredRelease[] = [
  { id: 1, gov_url: url('pm-call-with-president-macron-of-france-9-november-2026'), removed_upstream: false },
  { id: 2, gov_url: url('withdrawn-by-the-department'), removed_upstream: false },     // gone from the list: check it
  { id: 3, gov_url: url('long-gone'), removed_upstream: true },                        // gone, already marked: leave it
  { id: 4, gov_url: url('back-again'), removed_upstream: true },                       // listed again: check it
  { id: 5, gov_url: url('no-body-yet'), removed_upstream: false },                     // listed, no body: fill it
  { id: 6, gov_url: null, removed_upstream: null },
];
const listed = new Set(['/government/news/pm-call-with-president-macron-of-france-9-november-2026', '/government/news/back-again', '/government/news/no-body-yet']);

test('only releases missing from the list, listed again, or without a body are requested', () => {
  const p = livenessPlan(stored, listed, new Set([5]));
  assert.deepEqual(p.pending, [{ id: 2, why: 'missing from the listing' }, { id: 4, why: 'listed again' }, { id: 5, why: 'no stored body' }]);
  assert.equal(p.listed, 3);
  assert.equal(p.missingAlreadyRemoved, 1);
  assert.equal(p.overCap, 0);
});

test('nothing changed: nothing is requested', () => {
  const all = new Set(stored.filter((r) => r.gov_url && !r.removed_upstream).map((r) => govPath(r.gov_url!)));
  assert.deepEqual(livenessPlan(stored.filter((r) => !r.removed_upstream), all, new Set()).pending, []);
});

test('addresses compare as the listing gives them', () => {
  assert.equal(govPath('https://www.gov.uk/government/news/A-Title/?x=1#y'), '/government/news/a-title');
  assert.equal(govPath('/government/news/a-title'), '/government/news/a-title');
});

test('a short listing is not used; a full one is', () => {
  assert.equal(listingComplete(46553, 46553), true);
  assert.equal(listingComplete(46400, 46553), true);   // within 0.5 per cent (releases published while paging)
  assert.equal(listingComplete(45553, 46553), false);  // a page missing
  assert.equal(listingComplete(0, 0), false);
});

test("a queue over the day's cap is cut and counted, not requested", () => {
  const many: StoredRelease[] = Array.from({ length: MAX_PENDING + 10 }, (_, i) => ({ id: i + 1, gov_url: url(`r${i}`), removed_upstream: false }));
  const p = livenessPlan(many, new Set(), new Set());
  assert.equal(p.pending.length, MAX_PENDING);
  assert.equal(p.overCap, 10);
});

test('the route reads the listing once a day and requests only the queue', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'api', 'check-press-release-liveness', 'route.ts'), 'utf8');
  assert.match(src, /if \(!day \|\| day\.date !== today\)/);
  assert.match(src, /for \(const \[i, p\] of queue\.entries\(\)\)/);
  assert.doesNotMatch(src, /\.order\('liveness_checked_at'/);
});
