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
  };
  const out: NoticeRow[] = [];
  const awards: any[] = r.awards || [];
  const contracts: any[] = r.contracts || [];
  const supplierList = (a: any) => (a?.suppliers || []).filter((s: any) => s?.name).map((s: any) => ({ name: String(s.name), id: s.id ? String(s.id) : undefined }));

  for (const c of contracts) {
    const a = awards.find((x) => x.id != null && String(x.id) === String(c.awardID));
    const common = {
      ...base, ...empty, contract_key: String(c.id ?? `award:${c.awardID ?? ''}`), award_id: c.awardID != null ? String(c.awardID) : null,
      title: c.title || a?.title || tender.title || null, suppliers: supplierList(a), status: c.status || a?.status || null,
      end_date: day(c.implementation?.endDate) || day(c.period?.endDate),
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
      suppliers: supplierList(a), status: a.status || null, value: v, currency: a.value?.currency ?? null,
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
