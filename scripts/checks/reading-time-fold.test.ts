// Reading time leaves out closed folds (ENTRY 705's register entries): the freebies report reads in the same time with them.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/reading-time-fold.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { entryWords, readingLabel } from '../../lib/reading-time';
import type { Block, EditorialEntry } from '../../lib/editorials/types';

const P = (text: string): Block => ({ type: 'paragraph', text });
const base = { slug: 'x', headline: 'Two words', standfirst: '', publishedAt: '2026-11-26' } as unknown as EditorialEntry;

test('a fold\'s label and lines are not counted; every other block still is', () => {
  const body: Block[] = [P('one two three'), { type: 'fold', label: 'All 2 entries', items: [{ text: 'four five six seven', url: 'https://example.org/1' }, { text: 'eight nine' }] }, P('ten')];
  assert.equal(entryWords({ ...base, body } as EditorialEntry), 2 + 3 + 1);
});

test('the freebies report: the same reading time with its ten folds as without them', () => {
  const f = '/Volumes/EDGE_SSD/opengovt-work/Claude outputs/audit/vr-705/proposed-body.json';
  let body: Block[]; try { body = JSON.parse(readFileSync(f, 'utf8')); } catch { return; } /* the file is on the work drive only */
  const withFolds = readingLabel({ ...base, headline: 'MPs Took £835,000 in Free Tickets', body } as EditorialEntry);
  const without = readingLabel({ ...base, headline: 'MPs Took £835,000 in Free Tickets', body: body.filter((b) => b.type !== 'fold') } as EditorialEntry);
  assert.equal(withFolds, without); console.log('freebies report:', withFolds);
});
