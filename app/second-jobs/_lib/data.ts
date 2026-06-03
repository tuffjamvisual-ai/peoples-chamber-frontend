// Shared data + parsing helpers for /second-jobs landing and
// per-party detail pages. Built once 2026-06-03 when the single
// flat list was split into a landing + /[slug] route per party.

import { supabase } from '@/lib/supabase';

// Mapping copied from app/parties/page.tsx so the two surfaces use
// the same slug rollups. Labour and Labour (Co-op) collapse to one
// 'labour' bench; SDLP and Alliance variants normalised.
export const MP_PARTY_TO_SLUG: Record<string, string> = {
  'Labour': 'labour',
  'Labour (Co-op)': 'labour',
  'Labour and Co-operative': 'labour',
  'Conservative': 'conservative',
  'Liberal Democrat': 'liberal-democrats',
  'Liberal Democrats': 'liberal-democrats',
  'Reform UK': 'reform-uk',
  'Green Party': 'green',
  'Scottish National Party': 'snp',
  'Plaid Cymru': 'plaid-cymru',
  'Sinn Féin': 'sinn-fein',
  'Sinn Fein': 'sinn-fein',
  'Democratic Unionist Party': 'dup',
  'Ulster Unionist Party': 'uup',
  'Social Democratic & Labour Party': 'sdlp',
  'Alliance': 'alliance',
  'Alliance Party': 'alliance',
  'Traditional Unionist Voice': 'tuv',
  'Restore Britain': 'restore-britain',
  'Your Party': 'your-party',
  'Independent': 'independent',
};

export type ChildPayment = { interest?: string };

export type InterestRow = {
  member_id: number;
  interest_text: string;
  child_interests: ChildPayment[] | null;
};

export type MpRow = {
  member_id: number;
  display_name: string | null;
  name: string | null;
  constituency: string | null;
  party: string | null;
  party_colour: string | null;
};

export type Summary = {
  member_id: number;
  total_extracted: number;
  claim_count: number;
};

export type MpDetail = {
  mp: MpRow;
  total: number;
  claimCount: number;
  rows: InterestRow[];
};

export type PartyAggregate = {
  slug: string;
  label: string;
  mps: number;
  total: number;
  topMp: { name: string; total: number } | null;
};

export type ParentParsed = {
  role: string | null;
  payer: string | null;
  startDate: string | null;
  acoba: boolean;
};

export function parseParent(text: string): ParentParsed {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParentParsed = { role: null, payer: null, startDate: null, acoba: false };
  for (const line of lines) {
    const m1 = /^Role, work or services:\s*(.*)$/i.exec(line);
    if (m1) { out.role = m1[1]; continue; }
    const m2 = /^Payer:\s*(.*)$/i.exec(line);
    if (m2) { out.payer = m2[1]; continue; }
    const m3 = /^From:\s*(.*?)\.?$/i.exec(line);
    if (m3) { out.startDate = m3[1]; continue; }
    if (/^ACOBA consulted:\s*yes/i.test(line)) { out.acoba = true; continue; }
  }
  return out;
}

export type Payment = {
  amount: number | null;
  raw: string;
  receivedOn: string | null;
  hours: string | null;
  ultimatePayer: string | null;
};

export function parsePayment(text: string): Payment {
  const out: Payment = { amount: null, raw: text, receivedOn: null, hours: null, ultimatePayer: null };
  const amt = /Payment:\s*£([\d,]+(?:\.\d+)?)/i.exec(text) || /Remuneration:\s*£([\d,]+(?:\.\d+)?)/i.exec(text);
  if (amt) out.amount = Number(amt[1].replace(/,/g, ''));
  const rec = /Received on:\s*([^.\n]+)/i.exec(text);
  if (rec) out.receivedOn = rec[1].trim();
  const hrs = /Hours:\s*([0-9.]+\s*(?:hrs?|hours?)?(?:\s*a\s*year)?)/i.exec(text);
  if (hrs) out.hours = hrs[1].trim();
  const ult = /Ultimate payer:\s*([^\n|]+)/i.exec(text);
  if (ult) out.ultimatePayer = ult[1].trim();
  return out;
}

export function fmtMoney(n: number): string {
  if (!n) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

// Slugify any party string deterministically (used as fallback when
// the canonical map doesn't know the value).
function fallbackSlug(party: string): string {
  return party.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
export function partyToSlug(party: string | null): string {
  if (!party) return 'other';
  return MP_PARTY_TO_SLUG[party] || fallbackSlug(party);
}

// Reverse lookup: slug → human label preferring the first canonical
// key that maps to that slug, otherwise prettify the slug.
export function slugToLabel(slug: string): string {
  for (const [label, s] of Object.entries(MP_PARTY_TO_SLUG)) {
    if (s === slug) return label.replace(/\s*\(Co-op\)\s*/, '');
  }
  return slug
    .split('-')
    .map((w) => (w === 'uk' || w === 'dup' || w === 'uup' || w === 'tuv' || w === 'snp' || w === 'sdlp') ? w.toUpperCase() : w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export async function loadAll(): Promise<{
  bySlug: Map<string, MpDetail[]>;
  summaryByMember: Map<number, Summary>;
  partyTotals: PartyAggregate[];
  grandTotal: number;
  grandClaims: number;
  totalMps: number;
}> {
  const [{ data: summaries }, { data: interests }, { data: mps }] = await Promise.all([
    supabase
      .from('mp_outside_earnings_summary')
      .select('member_id, total_extracted, claim_count'),
    supabase
      .from('mp_registered_interests')
      .select('member_id, interest_text, child_interests')
      .ilike('category_name', '%Employment and earnings%'),
    supabase
      .from('mps')
      .select('member_id, display_name, name, constituency, party, party_colour')
      .eq('current_member', true),
  ]);

  const summaryByMember = new Map<number, Summary>(
    ((summaries as Summary[]) || []).map((s) => [s.member_id, s])
  );
  const mpByMember = new Map<number, MpRow>(
    ((mps as MpRow[]) || []).map((m) => [m.member_id, m])
  );

  const interestsByMember = new Map<number, InterestRow[]>();
  for (const row of (interests as InterestRow[]) || []) {
    if (!mpByMember.has(row.member_id)) continue;
    if (!interestsByMember.has(row.member_id)) interestsByMember.set(row.member_id, []);
    interestsByMember.get(row.member_id)!.push(row);
  }

  const bySlug = new Map<string, MpDetail[]>();
  let grandTotal = 0;
  let grandClaims = 0;
  let totalMps = 0;
  for (const [memberId, rows] of interestsByMember) {
    const mp = mpByMember.get(memberId)!;
    const summary = summaryByMember.get(memberId);
    const total = Number(summary?.total_extracted) || 0;
    const claimCount = summary?.claim_count || 0;
    grandTotal += total;
    grandClaims += claimCount;
    totalMps += 1;
    const slug = partyToSlug(mp.party);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push({ mp, total, claimCount, rows });
  }
  for (const detail of bySlug.values()) {
    detail.sort((a, b) => b.total - a.total);
  }

  const partyTotals: PartyAggregate[] = Array.from(bySlug.entries())
    .map(([slug, items]) => {
      const total = items.reduce((s, i) => s + i.total, 0);
      const top = items[0];
      return {
        slug,
        label: slugToLabel(slug),
        mps: items.length,
        total,
        topMp: top ? { name: top.mp.display_name || top.mp.name || '', total: top.total } : null,
      };
    })
    .sort((a, b) => b.total - a.total || b.mps - a.mps);

  return { bySlug, summaryByMember, partyTotals, grandTotal, grandClaims, totalMps };
}
