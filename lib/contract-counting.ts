// Counting rules for government_contracts on donor pages, the same as the database view
// government_contracts_counted (migration 2026-10-21j). The table holds one row per Find a Tender notice, so:
//   1. rows with the same ocid and value count once (an award notice and its contract details notice, or a notice
//      published twice); rows without an ocid stand alone;
//   2. an older-rules notice published in a later year than the contract was signed, for the same ocid and signing
//      date as another row, is superseded unless it is the newest of them;
//   3. a framework (title says framework / dynamic purchasing / DPS, or the buyer is a central purchasing body) is
//      the most every supplier on it could be paid: potential value, not spending, so it is never added up.
// The caller passes one supplier's rows. Approximations until contract_notices records each notice's type.

export type CountableRow = {
  id: number; ocid: string | null; title: string | null; dept_slug: string; value: number | null;
  awarded_date: string | null; contract_id: string | null;
};

const FW_TITLE = /framework|dynamic purchasing|\bDPS\b|flexible purchasing|purchasing system/i;
const FW_BUYER = /(commercial-agency|crown-commercial|purchasing-organisation|^espo|^nepo|healthtrust-europe|nhs-shared-business|procurement-for-housing|pagabo|fusion21|efficiency-east-midlands|consortium)/;

export const isFrameworkRow = (r: CountableRow) => FW_TITLE.test(r.title || '') || FW_BUYER.test(r.dept_slug || '');

export function countableContracts<T extends CountableRow>(rows: T[]): { contracts: T[]; frameworks: T[] } {
  const isAwardRow = (r: T) => (r.contract_id || '').startsWith('award:');
  const seen = new Map<string, T>();
  for (const r of [...rows].sort((a, b) => Number(isAwardRow(a)) - Number(isAwardRow(b)) || a.id - b.id)) {
    const key = r.ocid ? `${r.ocid}|${r.value}` : `row:${r.id}`;
    if (!seen.has(key)) seen.set(key, r);
  }
  const kept = [...seen.values()];
  const newest = new Map<string, string>();
  const count = new Map<string, number>();
  for (const r of kept) {
    if (!r.ocid) continue;
    const k = `${r.ocid}|${r.awarded_date}`;
    count.set(k, (count.get(k) || 0) + 1);
    if ((r.contract_id || '') > (newest.get(k) || '')) newest.set(k, r.contract_id || '');
  }
  const superseded = (r: T) => {
    const m = (r.contract_id || '').match(/^\d{6}-(\d{4})-/);
    if (!m || !r.ocid || !r.awarded_date || Number(m[1]) <= Number(r.awarded_date.slice(0, 4))) return false;
    const k = `${r.ocid}|${r.awarded_date}`;
    return (count.get(k) || 0) > 1 && (r.contract_id || '') < (newest.get(k) || '');
  };
  const live = kept.filter((r) => !superseded(r));
  return { contracts: live.filter((r) => !isFrameworkRow(r)), frameworks: live.filter(isFrameworkRow) };
}
