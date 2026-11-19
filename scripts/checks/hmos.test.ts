// Houses in multiple occupation (Cowork ENTRY 362): the wording helpers, a county as the sum of its districts, and, where
// data/hmos/ holds the source files (saved by hand, not in git), the rows the loader builds.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/hmos.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { count, fy, marchDate, share, perThousand, perThousandText, noteText, sumDistricts, NO_FIGURE, SHARP_NOTE, type HmoRow } from '../../lib/hmo-text';

const row = (o: Partial<HmoRow>): HmoRow => ({ ons_code: 'E07000171', area_name: 'X', nation: 'England', area_level: 'council', region: null, year: '2025-03-31', estimated: null, known: null, licensable: null, licensed: null, mandatory_licences: null, additional_licences: null, homes: null, homes_year: null, symbols: {}, predecessors: [], notes: [], source_url: 'https://x', ...o });

test('no figure is never 0; years and dates read as published', () => {
  assert.equal(count(null), NO_FIGURE);
  assert.equal(count(0), '0');
  assert.equal(count(21000), '21,000');
  assert.equal(fy('2025-03-31'), '2024-25');
  assert.equal(fy('2012-03-31'), '2011-12');
  assert.equal(marchDate('2026-03-31'), '31 March 2026');
});

test('licensed share and the rate per 1,000 homes (Leeds 2024-25)', () => {
  assert.equal(share(2938, 3500), 84);
  assert.equal(share(34, null), null);
  assert.equal(share(5, 0), null);
  assert.equal(perThousand(21000, 371956), 56.5);
  assert.equal(perThousandText(perThousand(169, 58034)), '2.9');
  assert.equal(perThousandText(null), NO_FIGURE);
  assert.equal(noteText('sharp_change'), SHARP_NOTE);
});

test('a county is the sum of its districts, only in years where every district has the figure', () => {
  const rows = [
    row({ ons_code: 'A', year: '2025-03-31', estimated: 100, licensable: 10, licensed: 8, homes: 1000, homes_year: '2025-03-31' }),
    row({ ons_code: 'B', year: '2025-03-31', estimated: 50, licensable: null, licensed: 2, homes: 500, homes_year: '2025-03-31' }),
    row({ ons_code: 'A', year: '2024-03-31', estimated: 90 }),
  ];
  const c = sumDistricts(rows, ['A', 'B'], 'County', 'E10000024');
  assert.equal(c.length, 1);
  assert.equal(c[0].estimated, 150);
  assert.equal(c[0].licensable, null);
  assert.equal(c[0].licensed, 10);
  assert.equal(c[0].homes, 1500);
});

const DIR = 'data/hmos';
test('the loader rows match Stage A (needs data/hmos/)', { skip: !fs.existsSync(`${DIR}/lahs`) }, async () => {
  const { buildRows } = await import('../../lib/hmo-source');
  const rows = buildRows(DIR);
  const at = (code: string, year: string) => rows.find((r) => r.ons_code === code && r.year === year)!;
  assert.deepEqual([at('E92000001', '2025-03-31').estimated, at('E92000001', '2025-03-31').licensable, at('E92000001', '2025-03-31').licensed], [458855, 132246, 95217]);
  assert.deepEqual([at('E07000171', '2025-03-31').estimated, at('E07000171', '2025-03-31').licensed], [169, 67]);
  assert.equal(at('E07000181', '2025-03-31').estimated, null); // West Oxfordshire: no figure published
  assert.ok(at('E09000005', '2025-03-31').notes.includes('brent_method_2025'));
  assert.ok(at('E08000035', '2014-03-31').notes.includes('sharp_change')); // Leeds 8,600 to 21,000
  const bucks = at('E06000060', '2015-03-31');
  assert.deepEqual(bucks.predecessors, ['Aylesbury Vale', 'Chiltern', 'South Bucks', 'Wycombe']);
  assert.equal(at('W06000015', '2025-03-31').estimated, 7000);
  assert.equal(at('W06000015', '2025-03-31').mandatory_licences, 1118);
  assert.equal(at('S12000036', '2026-03-31').licensed, 6806);
  assert.equal(at('S12000036', '2026-03-31').homes_year, '2025-03-31');
  assert.equal(rows.filter((r) => r.nation === 'England' && r.area_level === 'council' && r.year === '2025-03-31').length, 296);
});
