// Shared data + parsing helpers for /second-jobs landing and
// per-party detail pages. Built once 2026-06-03 when the single
// flat list was split into a landing + /[slug] route per party.

import { cache } from 'react';
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
  updated_at: string | null;
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

// "13 October 2026" from a timestamp, for the "figures as of" line.
export function fmtUpdated(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
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
  mpsWithPayments: number;
  summaryUpdated: string | null;
}> {
  // Current register entries only (is_current): an MP whose only "Employment and
  // earnings" entry has ended is not counted. Read in pages of 1,000 in a fixed order
  // so no row is missed. The earnings summary is rebuilt nightly from current entries
  // (.github/workflows/daily-context-update.yml). The category is matched exactly so the
  // category index is used: an ILIKE '%...%' scanned the whole table and hit the 3 s anon
  // timeout while ~350 pages prerendered at once (Vercel build of 4dedcf4, 17 Oct 2026).
  const readInterests = async (): Promise<InterestRow[]> => {
    const out: InterestRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('mp_registered_interests')
        .select('member_id, interest_text, child_interests')
        .eq('category_name', '1. Employment and earnings')
        .eq('is_current', true)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(`mp_registered_interests: ${error.message}`);
      out.push(...((data as InterestRow[]) || []));
      if (!data || data.length < 1000) break;
    }
    return out;
  };
  // A failed read throws (so the build fails and the last good page stays up) rather than showing empty totals.
  const [{ data: summaries, error: summariesError }, interests, { data: mps, error: mpsError }] = await Promise.all([
    supabase
      .from('mp_outside_earnings_summary')
      .select('member_id, total_extracted, claim_count, updated_at'),
    readInterests(),
    supabase
      .from('mps')
      .select('member_id, display_name, name, constituency, party, party_colour')
      .eq('current_member', true),
  ]);
  if (summariesError || !summaries) throw new Error(`mp_outside_earnings_summary: ${summariesError?.message ?? 'no data'}`);
  if (mpsError || !mps) throw new Error(`mps: ${mpsError?.message ?? 'no data'}`);

  const summaryByMember = new Map<number, Summary>(
    ((summaries as Summary[]) || []).map((s) => [s.member_id, s])
  );
  const mpByMember = new Map<number, MpRow>(
    ((mps as MpRow[]) || []).map((m) => [m.member_id, m])
  );

  const interestsByMember = new Map<number, InterestRow[]>();
  for (const row of interests) {
    if (!mpByMember.has(row.member_id)) continue;
    if (!interestsByMember.has(row.member_id)) interestsByMember.set(row.member_id, []);
    interestsByMember.get(row.member_id)!.push(row);
  }

  const bySlug = new Map<string, MpDetail[]>();
  let grandTotal = 0;
  let grandClaims = 0;
  let totalMps = 0;
  let mpsWithPayments = 0;
  for (const [memberId, rows] of interestsByMember) {
    const mp = mpByMember.get(memberId)!;
    const summary = summaryByMember.get(memberId);
    const total = Number(summary?.total_extracted) || 0;
    const claimCount = summary?.claim_count || 0;
    grandTotal += total;
    grandClaims += claimCount;
    totalMps += 1;
    if (claimCount > 0) mpsWithPayments += 1;
    const slug = partyToSlug(mp.party);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push({ mp, total, claimCount, rows });
  }
  for (const detail of bySlug.values()) {
    detail.sort((a, b) => b.total - a.total);
  }

  const summaryUpdated = ((summaries as Summary[]) || []).reduce<string | null>((m, r) => (r.updated_at && (!m || r.updated_at > m) ? r.updated_at : m), null);
  return { bySlug, summaryByMember, partyTotals: rollUp(bySlug), grandTotal, grandClaims, totalMps, mpsWithPayments, summaryUpdated };
}

// One line per party, highest total first; each party's MPs must already be sorted by total, highest first.
function rollUp(bySlug: Map<string, { mp: { display_name: string | null; name: string | null }; total: number }[]>): PartyAggregate[] {
  return Array.from(bySlug.entries())
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
}

// For the /second-jobs landing page, which shows only the party totals: one call to second_jobs_summary()
// (scripts/migrations/2026-10-21a-build-light-queries.sql) instead of reading every entry's text, which ran past
// anon's 3 s limit during the Vercel build of 335c2f4 (20 Oct 2026). Same MPs, totals and order as loadAll().
export async function loadLanding(): Promise<{
  partyTotals: PartyAggregate[];
  grandTotal: number;
  grandClaims: number;
  totalMps: number;
  mpsWithPayments: number;
  summaryUpdated: string | null;
}> {
  const { data, error } = await supabase.rpc('second_jobs_summary');
  if (error || !data) throw new Error(`second_jobs_summary: ${error?.message ?? 'no data'}`);
  const { mps, summary_updated } = data as {
    mps: { member_id: number; display_name: string | null; name: string | null; party: string | null; total: number; claim_count: number }[];
    summary_updated: string | null;
  };
  const bySlug = new Map<string, { mp: { display_name: string | null; name: string | null }; total: number }[]>();
  let grandTotal = 0;
  let grandClaims = 0;
  let mpsWithPayments = 0;
  for (const m of mps) {
    const total = Number(m.total) || 0;
    grandTotal += total;
    grandClaims += m.claim_count || 0;
    if (m.claim_count > 0) mpsWithPayments += 1;
    const slug = partyToSlug(m.party);
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push({ mp: m, total });
  }
  for (const items of bySlug.values()) items.sort((a, b) => b.total - a.total);
  return { partyTotals: rollUp(bySlug), grandTotal, grandClaims, totalMps: mps.length, mpsWithPayments, summaryUpdated: summary_updated };
}

// For /second-jobs/[slug]/[memberId]: the same MP, rows and total as loadAll() gives that page, read for that one
// MP only (22 Oct 2026, owner's approval). loadAll() read every MP's employment entries, twice per page (metadata
// and page), and hit anon's 3 s limit on cold reads. Returns null where loadAll() would have no entry: not a current
// MP, no current employment entry, or a party that is not this slug. Cached per request so both callers share it.
export const loadMember = cache(async (slug: string, memberId: number): Promise<MpDetail | null> => {
  const [{ data: mp, error: mpError }, { data: rows, error: rowsError }, { data: summary, error: summaryError }] = await Promise.all([
    supabase.from('mps').select('member_id, display_name, name, constituency, party, party_colour')
      .eq('current_member', true).eq('member_id', memberId).maybeSingle(),
    supabase.from('mp_registered_interests').select('member_id, interest_text, child_interests')
      .eq('member_id', memberId).eq('category_name', '1. Employment and earnings').eq('is_current', true)
      .order('id', { ascending: true }).limit(1000),
    supabase.from('mp_outside_earnings_summary').select('member_id, total_extracted, claim_count, updated_at')
      .eq('member_id', memberId).maybeSingle(),
  ]);
  // A failed read throws (the last good page stays up) rather than showing an empty record.
  if (mpError) throw new Error(`mps: ${mpError.message}`);
  if (rowsError) throw new Error(`mp_registered_interests: ${rowsError.message}`);
  if (summaryError) throw new Error(`mp_outside_earnings_summary: ${summaryError.message}`);
  if (!mp || !rows?.length || partyToSlug((mp as MpRow).party) !== slug) return null;
  const s = summary as Summary | null;
  return { mp: mp as MpRow, total: Number(s?.total_extracted) || 0, claimCount: s?.claim_count || 0, rows: rows as InterestRow[] };
});
