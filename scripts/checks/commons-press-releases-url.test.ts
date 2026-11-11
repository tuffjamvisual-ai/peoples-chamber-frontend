// T1-DF (a): the Commons press releases sync asks the Committees API for Reports and Special Reports only, newest first,
// with no start date (so the URL is the same every run and the API's cached answer stays warm).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/commons-press-releases-url.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationsUrl, COMMITTEES_API, REPORT_TYPE_IDS } from '../../lib/commons-press-releases-sync';

test('each page asks for Reports (1) and Special Reports (12), newest first', () => {
  const u = new URL(publicationsUrl(20));
  assert.equal(`${u.origin}${u.pathname}`, COMMITTEES_API);
  assert.deepEqual(u.searchParams.getAll('PublicationTypeIds'), ['1', '12']);
  assert.deepEqual(REPORT_TYPE_IDS, [1, 12]);
  assert.equal(u.searchParams.get('SortOrder'), 'PublicationDateDescending');
  assert.equal(u.searchParams.get('take'), '20');
  assert.equal(u.searchParams.get('skip'), '20');
});

test('no start or end date, so the request is the same between runs', () => {
  const u = new URL(publicationsUrl(0));
  assert.equal(u.searchParams.has('StartDate'), false);
  assert.equal(u.searchParams.has('EndDate'), false);
  assert.equal(publicationsUrl(0), publicationsUrl(0));
});
