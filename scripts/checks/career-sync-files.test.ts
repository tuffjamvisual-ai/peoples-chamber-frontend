// Unit tests for scripts/career-sync-files.ts (PR1a, 8 Nov 2026): a dry run never writes the real run's excluded records
// file. No network or database.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/career-sync-files.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excludedRecordsFile } from '../career-sync-files';

const OUTPUTS = '/Volumes/EDGE_SSD/opengovt-work/Claude outputs/career';

test('a real run writes excluded-records-<date>.json', () => {
  assert.equal(excludedRecordsFile(OUTPUTS, '2026-11-08', false), `${OUTPUTS}/excluded-records-2026-11-08.json`);
});

test('a dry run writes excluded-records-<date>-dry-run.json, never the real file', () => {
  const dry = excludedRecordsFile(OUTPUTS, '2026-11-08', true);
  assert.equal(dry, `${OUTPUTS}/excluded-records-2026-11-08-dry-run.json`);
  assert.notEqual(dry, excludedRecordsFile(OUTPUTS, '2026-11-08', false));
});

test('on GitHub (the working directory) the same names, and the artifact pattern still matches both', () => {
  assert.equal(excludedRecordsFile('.', '2026-11-09', false), 'excluded-records-2026-11-09.json');
  assert.equal(excludedRecordsFile('.', '2026-11-09', true), 'excluded-records-2026-11-09-dry-run.json');
  for (const f of [excludedRecordsFile('.', '2026-11-09', false), excludedRecordsFile('.', '2026-11-09', true)]) assert.match(f, /^excluded-records-.*\.json$/);
});
