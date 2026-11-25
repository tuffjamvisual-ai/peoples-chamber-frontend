// Read next at the end of a report (ENTRY 667): npx tsx --test scripts/checks/read-next-reports.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseReadNext } from '../../lib/read-next-choice';
import type { EditorialListEntry } from '../../lib/editorials-source';

const e = (slug: string, publishedAt: string, kind?: 'briefing') => ({ slug, headline: slug, standfirst: '', publishedAt, kind, words: 1 }) as EditorialListEntry;
const list = [e('a', '2026-11-01'), e('b', '2026-11-20'), e('c', '2026-11-10'), e('d', '2026-11-24'), e('f', '2026-11-05'), e('g', '2026-11-25', 'briefing'), e('me', '2026-11-25')];
const topics = { housing: ['me', 'a', 'f', 'g'], nhs: ['b'] };
const pick = (slug: string, shown: string[] = [], t: Record<string, string[]> = topics) => chooseReadNext(slug, list, t, new Set(shown)).map((x) => x.slug);

test('same topic first, newest first, then the newest of the rest', () => assert.deepEqual(pick('me'), ['f', 'a', 'd']));
test('never the report itself, never a briefing, three at most, none twice', () => { const p = pick('me'); assert.ok(!p.includes('me') && !p.includes('g')); assert.equal(p.length, 3); assert.equal(new Set(p).size, 3); });
test('never one the Related list shows', () => assert.deepEqual(pick('me', ['/editorials/f', '/editorials/d']), ['a', 'b', 'c']));
test('a report on no topic gets the newest', () => assert.deepEqual(pick('c', [], {}), ['me', 'd', 'b']));
test('the same day is in a fixed order, so a page made twice is the same', () => { const l = [e('z', '2026-11-01'), e('y', '2026-11-01'), e('x', '2026-11-01'), e('w', '2026-11-01')]; assert.deepEqual(chooseReadNext('w', l, {}, new Set()).map((x) => x.slug), ['x', 'y', 'z']); assert.deepEqual(chooseReadNext('w', [...l].reverse(), {}, new Set()).map((x) => x.slug), ['x', 'y', 'z']); });
test('fewer than three when there are no more', () => assert.deepEqual(chooseReadNext('a', [e('a', '2026-11-01'), e('b', '2026-11-02')], {}, new Set()).map((x) => x.slug), ['b']));
