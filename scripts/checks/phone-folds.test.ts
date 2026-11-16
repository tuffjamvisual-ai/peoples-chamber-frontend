// lib/editorials/phone-folds.ts (ENTRY 135 H2, 141 N3): a report opens with up to 3 paragraphs (2 when the standfirst
// shows), and stops before a paragraph that would take the opening past 900 characters; the first always shows.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/phone-folds.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phonePlan } from '@/lib/editorials/phone-folds';
import type { Block } from '@/lib/editorials/types';

const para = (n: number) => ({ type: 'paragraph', text: 'x'.repeat(n) }) as Block;
const lead = (body: Block[], k?: number) => phonePlan(body, k)?.lead.blocks.length ?? null;

test('three short paragraphs, then the fold', () => assert.equal(lead([para(100), para(100), para(100), para(100)]), 3));
test('two when the standfirst shows', () => assert.equal(lead([para(100), para(100), para(100)], 2), 2));
test('nothing after the opening: no fold', () => assert.equal(lead([para(100), para(100), para(100)]), null));
test('a long second paragraph starts the fold', () => assert.equal(lead([para(500), para(1100), para(100)]), 1));
test('a very long first paragraph still shows on its own', () => assert.equal(lead([para(2000), para(100)]), 1));
test('headings and lists before the third paragraph stay in the opening', () =>
  assert.equal(lead([para(100), { type: 'heading', level: 3, text: 'H' } as Block, para(100), para(100), para(100)]), 4));
