// T1-LOT: notices keep the lots their award names (awards[].relatedLots), the procurement's lots are read from
// tender.lots, and an older release never replaces a lot stored from a newer one.
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/contract-lots.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noticeRows, lotRows, lotIdsOf, newerLotRows } from '../../lib/contract-notices';

// Shaped like Find a Tender's 098672-2026 (ocds-h6vhtk-0548f8, checked 12 Nov 2026): 8 lots, 5 awards, one award
// covering lots 1, 2, 3 and 6.
const award = {
  ocid: 'ocds-test-lots', id: '098672-2026', date: '2026-11-10T12:00:00Z', tag: ['award', 'contract'],
  tender: {
    title: 'Highways works', value: { amount: 8_000_000, currency: 'GBP' },
    lots: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: String(n), title: `Lot ${n}: area ${n}`, value: { amount: n * 1000, currency: 'GBP' }, status: 'active' })),
  },
  awards: [
    { id: 'A4', relatedLots: ['4'], suppliers: [{ name: 'Four Ltd' }], value: { amount: 4000, currency: 'GBP' } },
    { id: 'A5', relatedLots: ['5'], suppliers: [{ name: 'Five Ltd' }], value: { amount: 5000, currency: 'GBP' } },
    { id: 'A7', relatedLots: ['7'], suppliers: [{ name: 'Seven Ltd' }], value: { amount: 7000, currency: 'GBP' } },
    { id: 'A8', relatedLots: ['8', '8'], suppliers: [{ name: 'Eight Ltd' }], value: { amount: 8000, currency: 'GBP' } },
    { id: 'A1', relatedLots: ['1', '2', '3', '6'], suppliers: [{ name: 'Many Ltd' }], value: { amount: 12000, currency: 'GBP' } },
  ],
};

test('each award notice row carries the lots its award names, once each, in order', () => {
  const rows = noticeRows(award);
  const byAward = Object.fromEntries(rows.map((r) => [r.award_id, r.lot_ids]));
  assert.deepEqual(byAward, { A4: ['4'], A5: ['5'], A7: ['7'], A8: ['8'], A1: ['1', '2', '3', '6'] });
});

test('a contract row takes the lots of the award it belongs to', () => {
  const rows = noticeRows({ ...award, contracts: [{ id: 'C1', awardID: 'A1', value: { amount: 12000, currency: 'GBP' } }] });
  assert.deepEqual(rows.find((r) => r.contract_key === 'C1')?.lot_ids, ['1', '2', '3', '6']);
});

test('a notice whose award names no lot, and a tender notice, have no lot ids', () => {
  assert.equal(lotIdsOf({ id: 'x' }), null);
  assert.equal(lotIdsOf({ id: 'x', relatedLots: [] }), null);
  assert.equal(lotIdsOf({ id: 'x', relatedLots: [null, ' '] }), null);
  const tenderRows = noticeRows({ ocid: 'o', id: 'r', date: '2026-01-01T00:00:00Z', tender: { lots: [{ id: '1' }], value: { amount: 1 } } });
  assert.deepEqual(tenderRows.map((r) => r.lot_ids), [null]);
});

test('lot rows come from tender.lots with the value as published', () => {
  const lots = lotRows(award);
  assert.equal(lots.length, 8);
  assert.deepEqual(lots[1], { ocid: 'ocds-test-lots', lot_id: '2', title: 'Lot 2: area 2', description: null, value: 2000, currency: 'GBP',
    status: 'active', release_id: '098672-2026', released_at: '2026-11-10T12:00:00Z' });
  assert.deepEqual(lotRows({ ocid: 'o', id: 'r', date: 'd', tender: {} }), []);
});

test('an older release never replaces a lot stored from a newer one; the newest of a page wins', () => {
  const older = lotRows({ ...award, id: '018545-2026', date: '2026-02-01T00:00:00Z', tender: { lots: [{ id: '2', title: 'Lot 2 (tender)' }, { id: '9', title: 'New' }] } });
  const newer = lotRows(award).filter((l) => l.lot_id === '2');
  // Same page, older first: the newer wins.
  assert.deepEqual(newerLotRows([...older, ...newer], []).map((l) => `${l.lot_id}:${l.release_id}`).sort(), ['2:098672-2026', '9:018545-2026']);
  // Lot 2 already stored from the newer release (with its title): the older is not written; lot 9 is new, so it is.
  const stored = [{ ocid: 'ocds-test-lots', lot_id: '2', released_at: '2026-11-10T12:00:00Z', release_id: '098672-2026', title: 'Lot 2: area 2', value: 2000, currency: 'GBP' }];
  assert.deepEqual(newerLotRows(older, stored).map((l) => l.lot_id), ['9']);
  // The same release read again is written (an identical row).
  assert.deepEqual(newerLotRows(newer, stored).map((l) => l.lot_id), ['2']);
});

test('a newer release without a lot title keeps the title already known', () => {
  const tender = lotRows({ ...award, id: '018545-2026', date: '2026-02-01T00:00:00Z', tender: { lots: [{ id: '2', title: 'South', value: { amount: 5, currency: 'GBP' } }] } });
  const bareAward = lotRows({ ...award, tender: { lots: [{ id: '2' }] } });
  // Both in one batch.
  const [one] = newerLotRows([...tender, ...bareAward], []);
  assert.equal(one.release_id, '098672-2026'); assert.equal(one.title, 'South'); assert.equal(one.value, 5);
  // Stored from the tender, then the award arrives.
  const [two] = newerLotRows(bareAward, [{ ocid: 'ocds-test-lots', lot_id: '2', released_at: '2026-02-01T00:00:00Z', title: 'South', description: null, value: 5, currency: 'GBP' }]);
  assert.equal(two.title, 'South'); assert.equal(two.currency, 'GBP');
});

test('an older tender notice fills in a title the stored award-notice row lacks, keeping the newer release', () => {
  const stored = [{ ocid: 'ocds-test-lots', lot_id: '4', released_at: '2026-11-10T12:00:00Z', release_id: '098672-2026', title: null, description: null, value: null, currency: null, status: 'active' }];
  const tender = lotRows({ ...award, id: '018545-2026', date: '2026-02-01T00:00:00Z', tender: { lots: [{ id: '4', title: 'Shared beds', value: { amount: 9, currency: 'GBP' }, status: 'planned' }] } });
  const [row] = newerLotRows(tender, stored);
  assert.equal(row.title, 'Shared beds'); assert.equal(row.value, 9);
  assert.equal(row.release_id, '098672-2026'); assert.equal(row.status, 'active');
  // Nothing to add: nothing written.
  assert.deepEqual(newerLotRows(tender, [{ ...stored[0], title: 'Shared beds', value: 9, currency: 'GBP' }]), []);
});
