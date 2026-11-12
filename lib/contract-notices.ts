// Turns one OCDS release from Find a Tender into contract_notices rows (migration 2026-10-21k): one row per notice,
// contract (or award) and value type, so a contract's history can show each figure with its own label and never
// add different kinds of value together. Used by app/api/sync-government-contracts (daily) and
// scripts/backfill-contract-notices.js.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type NoticeRow = {
  ocid: string; release_id: string; notice_id: string | null; notice_type: string | null; tags: string[];
  published_at: string; contract_key: string; award_id: string | null; title: string | null;
  buyer_name: string | null; buyer_slug: string; suppliers: { name: string; id?: string }[];
  is_framework: boolean; value: number | null; currency: string | null;
  value_type: 'estimated' | 'contract' | 'change_new' | 'change_old' | 'final' | 'framework_maximum' | 'none';
  value_from_text: boolean; change_description: string | null; change_reason: string | null;
  termination_reason: string | null; end_date: string | null; status: string | null; source_url: string;
  // The lots the notice's award names (awards[].relatedLots; T1-LOT, migration 2026-11-12a); null where it names none.
  lot_ids: string[] | null;
};

export function kebab(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
}

function noticeTypeOf(o: any): string | null {
  // noticeType sits on whichever documents list the notice filled (planning, tender, awards[], contracts[]).
  const seen: string[] = [];
  const walk = (x: any) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      for (const [k, v] of Object.entries(x)) {
        if (k === 'noticeType' && typeof v === 'string') seen.push(v);
        else walk(v);
      }
    }
  };
  walk(o);
  return seen[0] ?? null;
}

const amount = (v: any): number | null => (v && typeof v.amount === 'number' ? v.amount : null);
const day = (s: any): string | null => (s ? String(s).slice(0, 10) : null);
const text = (s: any): string | null => (typeof s === 'string' && s.trim() ? s.replace(/<br\s*\/?>/gi, '\n').trim() : null);

// Older-rules change notices state the previous value only in words, e.g. "from the original value of
// £61,311,046" or "from £146,905,866.00 to £154,031,174.00". Returns null when the wording gives none.
export function oldValueFromText(desc: string | null): number | null {
  if (!desc) return null;
  const m = desc.match(/from\s+(?:the\s+(?:original|previous)\s+value\s+of\s+)?£\s*([\d,]+(?:\.\d+)?)/i);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

// The notice's page on Find a Tender. The address is the one notices publish in their own documents (tenderNotice /
// awardNotice: https://www.find-tender.service.gov.uk/Notice/089629-2026), which in every record checked on 21 Oct
// 2026 was the release's own id.
const noticeUrl = (r: any) => `https://www.find-tender.service.gov.uk/Notice/${encodeURIComponent(String(r.id))}`;

// Supplier ids the buyer published without the Companies House prefix (owner's yes, 7 Nov 2026, Claude outputs/org-merge/plan.md):
// "GB-COH-303675" is not a company, OC303675 is Deloitte LLP. Keyed by notice, published id and supplier name, so only these
// notices change, and a reload or backfill keeps the corrected ids. Checked on Companies House on 7 Nov 2026.
// basis: 'prefix' where the published digits are the company's own number without its letters; 'name' where the published
// number exists on Companies House under no prefix, so the notice is linked by the supplier name it prints. Organisation
// pages say so for each 'name' notice (owner, 7 Nov 2026, L8).
export type SupplierIdCorrection = { ocid: string; published: string; name: string; corrected: string; basis: 'prefix' | 'name' };
export const SUPPLIER_ID_CORRECTIONS: SupplierIdCorrection[] = [
  { ocid: 'ocds-h6vhtk-050ab7', published: 'GB-COH-303675', name: 'Deloitte LLP', corrected: 'GB-COH-OC303675', basis: 'prefix' },
  { ocid: 'ocds-h6vhtk-05598d', published: 'GB-COH-209907', name: 'Deloitte LLP', corrected: 'GB-COH-OC303675', basis: 'name' },
  { ocid: 'ocds-h6vhtk-044de7', published: 'GB-COH-390210', name: 'Sureserve Energy Services UK', corrected: 'GB-COH-SC390210', basis: 'prefix' },
];
export function correctedSupplierId(ocid: string, id: string | undefined, name: string): string | undefined {
  if (!id) return id;
  return SUPPLIER_ID_CORRECTIONS.find((c) => c.ocid === ocid && c.published === id && c.name === name.trim())?.corrected ?? id;
}

// The notices linked to a company by supplier name, because the number they gave exists on no Companies House register.
export const nameBasisCorrections = (companyNumber: string | null) =>
  companyNumber ? SUPPLIER_ID_CORRECTIONS.filter((c) => c.basis === 'name' && c.corrected === `GB-COH-${companyNumber}`) : [];

// The lot ids an award names, in the order given, once each; null when it names none.
export function lotIdsOf(a: any): string[] | null {
  const ids = Array.isArray(a?.relatedLots) ? [...new Set(a.relatedLots.filter((x: any) => x != null && String(x).trim()).map((x: any) => String(x).trim()))] as string[] : [];
  return ids.length ? ids : null;
}

// One contract_lots row per lot in the release's tender.lots (T1-LOT, migration 2026-11-12a): the value as published.
export type LotRow = {
  ocid: string; lot_id: string; title: string | null; description: string | null; value: number | null; currency: string | null;
  status: string | null; release_id: string; released_at: string;
};
export function lotRows(r: any): LotRow[] {
  const ocid = r?.ocid ? String(r.ocid) : null;
  const lots: any[] = Array.isArray(r?.tender?.lots) ? r.tender.lots : [];
  if (!ocid || !r.id || !r.date) return [];
  const seen = new Map<string, LotRow>();
  for (const l of lots) {
    if (l?.id == null || !String(l.id).trim()) continue;
    const lot_id = String(l.id).trim();
    seen.set(lot_id, { ocid, lot_id, title: text(l.title), description: text(l.description), value: amount(l.value), currency: l.value?.currency ?? null,
      status: l.status ?? null, release_id: String(r.id), released_at: String(r.date) });
  }
  return [...seen.values()];
}

// The rows to write: per (ocid, lot), the newest release among these, and only where it is newer than (or as new as)
// the row already stored; a page read newest first, or a backfill reading older releases, never puts back an older lot.
// A newer release that leaves out a lot's title, description or value (award notices often give only the lot id) keeps
// the ones already known, from this batch or from the stored row.
type StoredLot = { ocid: string; lot_id: string; released_at: string | null; title?: string | null; description?: string | null; value?: number | null; currency?: string | null };
export function newerLotRows(rows: LotRow[], stored: StoredLot[]): LotRow[] {
  const ms = (s: string | null) => (s ? Date.parse(s) : -Infinity);
  const fill = (to: LotRow, from: Partial<LotRow> | undefined): LotRow => from ? {
    ...to, title: to.title ?? from.title ?? null, description: to.description ?? from.description ?? null,
    value: to.value ?? from.value ?? null, currency: to.value != null ? to.currency : (from.currency ?? to.currency ?? null),
  } : to;
  const best = new Map<string, LotRow>();
  for (const r of rows) {
    const k = `${r.ocid}\u0000${r.lot_id}`;
    const cur = best.get(k);
    if (!cur) best.set(k, r);
    else best.set(k, ms(r.released_at) >= ms(cur.released_at) ? fill(r, cur) : fill(cur, r));
  }
  const have = new Map(stored.map((s) => [`${s.ocid}\u0000${s.lot_id}`, s]));
  return [...best.entries()]
    .filter(([k, r]) => !have.has(k) || ms(r.released_at) >= ms(have.get(k)!.released_at))
    .map(([k, r]) => fill(r, have.get(k) as Partial<LotRow> | undefined));
}

export function noticeRows(r: any): NoticeRow[] {
  const ocid = r?.ocid ? String(r.ocid) : null;
  if (!ocid || !r.id || !r.date) return [];
  const tender = r.tender || {};
  const buyer = r?.buyer?.name || (r.parties || []).find((p: any) => (p.roles || []).includes('buyer'))?.name || null;
  // A framework or dynamic market. Call-offs under one carry the same flag (DSIT's gigabit call-offs do), so a
  // value counts as a framework maximum only when the notice names more than one supplier for it, the title says
  // framework, or it is the tender estimate; a single-supplier call-off stays a contract, marked is_framework.
  const isFramework = Boolean(tender.techniques?.hasFrameworkAgreement || tender.techniques?.hasDynamicPurchasingSystem);
  const fwTitle = /framework|dynamic (purchasing|market)|\bDPS\b/i.test(String(tender.title || ''));
  const fwValue = (supplierCount: number) => isFramework && (supplierCount > 1 || fwTitle);
  const base = {
    ocid, release_id: String(r.id), notice_id: String(r.id), notice_type: noticeTypeOf(r), tags: r.tag || [],
    published_at: r.date, buyer_name: buyer, buyer_slug: kebab(buyer), is_framework: isFramework,
    source_url: noticeUrl(r),
  };
  const empty: Omit<NoticeRow, keyof typeof base | 'contract_key'> = {
    award_id: null, title: tender.title || null, suppliers: [], value: null, currency: null, value_type: 'none',
    value_from_text: false, change_description: null, change_reason: null, termination_reason: null, end_date: null, status: null,
    lot_ids: null,
  };
  const out: NoticeRow[] = [];
  const awards: any[] = r.awards || [];
  const contracts: any[] = r.contracts || [];
  const supplierList = (a: any) => (a?.suppliers || []).filter((s: any) => s?.name).map((s: any) => { const name = String(s.name), id = s.id ? String(s.id) : undefined; return { name, id: correctedSupplierId(ocid, id, name) }; });

  for (const c of contracts) {
    const a = awards.find((x) => x.id != null && String(x.id) === String(c.awardID));
    const common = {
      ...base, ...empty, contract_key: String(c.id ?? `award:${c.awardID ?? ''}`), award_id: c.awardID != null ? String(c.awardID) : null,
      title: c.title || a?.title || tender.title || null, suppliers: supplierList(a), status: c.status || a?.status || null,
      end_date: day(c.implementation?.endDate) || day(c.period?.endDate), lot_ids: lotIdsOf(a),
    };
    const am = (c.amendments || [])[0];
    if (c.status === 'terminated' || (r.tag || []).includes('contractTermination')) {
      const fv = c.implementation?.finalValue;
      out.push({ ...common, value: amount(fv), currency: fv?.currency ?? null, value_type: amount(fv) == null ? 'none' : 'final', termination_reason: text(c.statusDetails) });
    } else if (am) {
      const desc = text(am.description);
      out.push({ ...common, value: amount(c.value), currency: c.value?.currency ?? null, value_type: amount(c.value) == null ? 'none' : 'change_new', change_description: desc, change_reason: text(am.rationale) });
      const old = oldValueFromText(desc);
      if (old != null) out.push({ ...common, value: old, currency: c.value?.currency ?? 'GBP', value_type: 'change_old', value_from_text: true, change_description: desc, change_reason: text(am.rationale) });
    } else {
      const v = amount(c.value);
      out.push({ ...common, value: v, currency: c.value?.currency ?? null, value_type: v == null ? 'none' : fwValue(common.suppliers.length) ? 'framework_maximum' : 'contract' });
    }
  }
  // Awards with no contract on this notice (award notices, UK6).
  for (const a of awards) {
    if (contracts.some((c) => String(c.awardID) === String(a.id))) continue;
    const v = amount(a.value);
    out.push({ ...base, ...empty, contract_key: `award:${a.id ?? ''}`, award_id: a.id != null ? String(a.id) : null, title: a.title || tender.title || null,
      suppliers: supplierList(a), status: a.status || null, value: v, currency: a.value?.currency ?? null, lot_ids: lotIdsOf(a),
      value_type: v == null ? 'none' : fwValue(supplierList(a).length) ? 'framework_maximum' : 'contract' });
  }
  // Planning and tender notices: the estimate for the whole procurement.
  if (!contracts.length && !awards.length) {
    const v = amount(tender.value);
    out.push({ ...base, ...empty, contract_key: '', value: v, currency: tender.value?.currency ?? null,
      value_type: v == null ? 'none' : isFramework ? 'framework_maximum' : 'estimated', status: tender.status || null });
  }
  return out;
}

// Rows with the same key (ocid, release, contract, value type) once each: one upsert cannot write a row twice.
export function uniqueNoticeRows(rows: NoticeRow[]): NoticeRow[] {
  const seen = new Map<string, NoticeRow>();
  for (const r of rows) seen.set(`${r.ocid}|${r.release_id}|${r.contract_key}|${r.value_type}`, r);
  return [...seen.values()];
}
