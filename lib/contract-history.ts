// A procurement's contracts and what happened to each (moved from app/contracts/[ocid]/page.tsx on 11 Nov 2026, T1-AUD3,
// so scripts can count across every contract). Awards and contracts first, then changes and terminations in date order.
import { changeKind, type ChangeKind } from '@/lib/contract-notice-kind';

export type Notice = {
  ocid: string; release_id: string; notice_type: string | null; tags: string[]; published_at: string;
  contract_key: string; award_id: string | null; title: string | null; buyer_name: string | null;
  suppliers: { name: string }[]; is_framework: boolean; value: number | null; value_type: string;
  value_from_text: boolean; change_description: string | null; change_reason: string | null;
  termination_reason: string | null; end_date: string | null; status: string | null; source_url: string;
};

const day = (iso: string) => iso.slice(0, 10);

export type Change = { date: string; oldValue: number | null; newValue: number | null; reason: string | null; repeats: number; url: string; kind: ChangeKind };
export type ContractHistory = {
  key: string; awardId: string | null; title: string | null; suppliers: string[]; isFramework: boolean;
  awarded: { date: string; value: number | null; type: 'contract' | 'framework_maximum'; url: string } | null;
  changes: Change[];
  termination: { date: string; endDate: string | null; finalValue: number | null; reason: string | null; url: string } | null;
};

export function buildHistories(notices: Notice[], kinds: Map<string, ChangeKind> = new Map()): ContractHistory[] {
  const byKey = new Map<string, Notice[]>();
  for (const n of notices) if (n.contract_key) byKey.set(n.contract_key, [...(byKey.get(n.contract_key) || []), n]);
  const histories: ContractHistory[] = [];
  // The latest value a contract has: its last real value change, else its award (an addendum or correction changes nothing).
  const valueChanges = (h: ContractHistory) => h.changes.filter((c) => c.kind.kind === 'value_change');
  const latest = (h: ContractHistory) => { const v = valueChanges(h); return v.length ? v[v.length - 1].newValue : h.awarded?.value ?? null; };
  const supplierOf = (rows: Notice[]) => rows.find((r) => r.suppliers?.length)?.suppliers.map((s) => s.name) || [];

  // Awards and contracts first (oldest first), then changes and terminations in date order.
  const keys = [...byKey.keys()].sort((a, b) => byKey.get(a)![0].published_at.localeCompare(byKey.get(b)![0].published_at));
  for (const key of keys) {
    const rows = byKey.get(key)!;
    // A group with no award or contract notice holds only changes, which are matched to their contract below (T1-AUD3:
    // a group with both, such as a contract details notice and its change notice, keeps its award).
    if (!rows.some((r) => r.value_type === 'contract' || r.value_type === 'framework_maximum')) continue;
    const award = rows.filter((r) => r.value_type === 'contract' || r.value_type === 'framework_maximum').pop();
    // An award notice and its contract details notice (UK6 then UK7) describe one contract: the contract carries
    // the award's id. Keep one entry, with the later notice's suppliers (a framework's list can shrink at signing).
    const existing = award?.award_id != null ? histories.find((h) => h.awardId === award.award_id) : undefined;
    if (existing && award) {
      existing.awarded = { date: existing.awarded?.date ?? award.published_at, value: award.value, type: award.value_type as 'contract' | 'framework_maximum', url: award.source_url };
      existing.suppliers = supplierOf(rows).length ? supplierOf(rows) : existing.suppliers;
      continue;
    }
    histories.push({
      key, awardId: award?.award_id ?? null, title: rows[0].title, suppliers: supplierOf(rows), isFramework: rows.some((r) => r.value_type === 'framework_maximum'),
      awarded: award ? { date: award.published_at, value: award.value, type: award.value_type as 'contract' | 'framework_maximum', url: award.source_url } : null,
      changes: [], termination: null,
    });
  }
  const changeRows = notices.filter((n) => n.value_type === 'change_new' || n.value_type === 'final' || (n.tags || []).includes('contractTermination'));
  for (const n of changeRows) {
    const rows = byKey.get(n.contract_key) || [];
    const old = rows.find((r) => r.release_id === n.release_id && r.value_type === 'change_old')?.value ?? null;
    // The same change published more than once on one day (DSIT published three identical notices on
    // 23 Feb 2026) is shown once.
    const repeat = histories.flatMap((x) => x.changes).find((c) => day(c.date) === day(n.published_at) && c.newValue === n.value && c.oldValue === old);
    if (repeat && n.value_type === 'change_new') { repeat.repeats++; continue; }
    // Which contract a change belongs to: the same contract id (Procurement Act notices), else the contract
    // whose latest value is the change's old value, else one whose award or an earlier value is (older notices
    // say "from the original value"). Several candidates: prefer the same supplier name (Find a Tender adds
    // call-off codes such as "CO3" to it).
    const firstWord = (s: string[]) => (s[0] || '').toLowerCase().replace(/\s+co\d+$/, '');
    const pick = (cands: ContractHistory[]) => cands.find((x) => firstWord(x.suppliers) === firstWord(n.suppliers.map((s) => s.name))) || cands[0];
    const values = (x: ContractHistory) => [x.awarded?.value ?? null, ...x.changes.map((c) => c.newValue)];
    let h = histories.find((x) => x.key === n.contract_key)
      // The same contract id (award:1 and 1 are one contract: its award and its details notice), T1-AUD3.
      || (n.award_id != null ? histories.find((x) => x.awardId === n.award_id) : undefined)
      || (old != null ? pick(histories.filter((x) => latest(x) === old)) || pick(histories.filter((x) => values(x).includes(old))) : undefined);
    if (!h) {
      h = { key: n.contract_key, awardId: null, title: n.title, suppliers: n.suppliers.map((s) => s.name), isFramework: false, awarded: null, changes: [], termination: null };
      histories.push(h);
    }
    if (n.value_type === 'final' || (n.tags || []).includes('contractTermination')) {
      h.termination = { date: n.published_at, endDate: n.end_date, finalValue: n.value_type === 'final' ? n.value : null, reason: n.termination_reason, url: n.source_url };
      continue;
    }
    const kind = changeKind(n.change_reason ?? n.change_description, n.value, old ?? latest(h), n.notice_type);
    kinds.set(n.release_id, kind);
    h.changes.push({ date: n.published_at, oldValue: kind.kind === 'value_change' ? old : null, newValue: n.value, reason: n.change_reason, repeats: 1, url: n.source_url, kind });
  }
  return histories;
}
