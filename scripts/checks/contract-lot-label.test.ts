// T1-LOT: lot labels on contract pages.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/contract-lot-label.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lotLabel, hasSeveralLots, namesLot } from '../../lib/contract-lot-label';
import { buildHistories, type Notice } from '../../lib/contract-history';

const lots = [{ lot_id: '1', title: 'North' }, { lot_id: '2', title: 'Lot 2 - South' }, { lot_id: 'Lot 3', title: null }];

test('one lot: its number and title, the number said once', () => {
  assert.equal(lotLabel(['1'], lots), 'Lot 1: North');
  assert.equal(lotLabel(['2'], lots), 'Lot 2: South');
  assert.equal(lotLabel(['Lot 3'], lots), 'Lot 3');
  assert.equal(lotLabel(['9'], lots), 'Lot 9');
});

test('several lots are listed by number; none gives no label', () => {
  assert.equal(lotLabel(['1', '2', '3', '6'], lots), 'Lots 1, 2, 3 and 6');
  assert.equal(lotLabel(['1', '2', 'Lot 3'], lots), 'All 3 lots');
  assert.equal(lotLabel(null, lots), null);
  assert.equal(lotLabel([], lots), null);
});

test('labels only where the procurement has more than one lot', () => {
  assert.equal(hasSeveralLots([{ lot_id: '1', title: 'Only' }], [['1'], ['1']]), false);
  assert.equal(hasSeveralLots([], [['1'], null]), false);
  assert.equal(hasSeveralLots([{ lot_id: '1', title: null }, { lot_id: '2', title: null }], []), true);
  assert.equal(hasSeveralLots([], [['1'], ['2']]), true);
});

const n = (o: Partial<Notice>): Notice => ({ ocid: 'o', release_id: 'r', notice_type: null, tags: [], published_at: '2026-01-01T00:00:00Z', contract_key: 'k',
  award_id: null, title: 'T', buyer_name: null, suppliers: [], is_framework: false, value: null, value_type: 'none', value_from_text: false,
  change_description: null, change_reason: null, termination_reason: null, end_date: null, status: null, source_url: 'u', lot_ids: null, ...o });

test('a change that names a lot goes to the award for that lot, not to another lot with the same value', () => {
  const notices = [
    n({ release_id: 'a1', contract_key: 'award:A1', award_id: 'A1', value: 100, value_type: 'contract', lot_ids: ['1'], suppliers: [{ name: 'One' }] }),
    n({ release_id: 'a2', contract_key: 'award:A2', award_id: 'A2', value: 100, value_type: 'contract', lot_ids: ['2'], suppliers: [{ name: 'Two' }], published_at: '2026-01-02T00:00:00Z' }),
    n({ release_id: 'c1', contract_key: 'C9', award_id: null, value: 150, value_type: 'change_new', lot_ids: ['2'], published_at: '2026-03-01T00:00:00Z', change_reason: 'Extra scope, value increased' }),
  ];
  const h = buildHistories(notices);
  assert.equal(h.length, 2);
  assert.equal(h.find((x) => x.awardId === 'A2')!.changes.length, 1);
  assert.equal(h.find((x) => x.awardId === 'A1')!.changes.length, 0);
  assert.deepEqual(h.find((x) => x.awardId === 'A2')!.lotIds, ['2']);
});

test('a change for a lot with no award in the record keeps its lot, so the page can say which award is missing', () => {
  const notices = [
    n({ release_id: 'a1', contract_key: 'award:A1', award_id: 'A1', value: 100, value_type: 'contract', lot_ids: ['1'] }),
    n({ release_id: 'c3', contract_key: 'C3', value: 90, value_type: 'change_new', lot_ids: ['3'], published_at: '2026-03-01T00:00:00Z' }),
  ];
  const h = buildHistories(notices);
  const orphan = h.find((x) => !x.awarded)!;
  assert.deepEqual(orphan.lotIds, ['3']);
});

test('a title that already starts with its lot needs no lot line', () => {
  assert.equal(namesLot('Lot 4 - 27 Shared beds', ['4']), true);
  assert.equal(namesLot('Lot 41 - other', ['4']), false);
  assert.equal(namesLot('Highways works', ['4']), false);
  assert.equal(namesLot('Lot 1 and 2', ['1', '2']), false);
});
