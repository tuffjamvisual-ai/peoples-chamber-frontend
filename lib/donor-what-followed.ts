// "What followed" on donor pages (owner, 1 Nov 2026): the public records held for the same organisation as a donor,
// matched only by the donor's own Companies House number(s) from its donation records, never by name.
//   grants:   government_grants rows whose recipient_company_number is one of the exact strings for those numbers
//             (each normalises to one of them; checked again here).
//   meetings and lobbying: only through an organisation_index row with exactly that number and a lobby_org_id
//             (lib/organisations.ts getOrgRegistryRecords); otherwise they are absent.
// Contracts are read by the donor page itself (organisation_contracts, as before). On any read error this logs and
// returns null, so the page renders without the section; it never throws.
import { supabase } from '@/lib/supabase';
import { normaliseCompanyNumber, getOrgRegistryRecords, type OrgIndexRow, type OrgGrant } from '@/lib/organisations';
import type { OrgMeeting } from '@/lib/lobbying';

export const WHAT_FOLLOWED_CAP = 50;

export type LobbyingQuarter = { firm: string; start: string; label: string };
export type WhatFollowedData = {
  grants: OrgGrant[]; grantsTotal: number;
  meetings: OrgMeeting[]; meetingsTotal: number;
  lobbying: LobbyingQuarter[]; lobbyingTotal: number;
  orgs: { slug: string; name: string }[];
};

// The exact strings a register may hold for a normalised number: as written on the donor's own donations, the
// normalised form, and the numeric form without leading zeros. Only strings that normalise back to the number are kept.
function numberStrings(numbers: string[], raws: string[]): string[] {
  const out = new Set<string>();
  for (const n of numbers) {
    out.add(n);
    if (/^[0-9]+$/.test(n)) out.add(n.replace(/^0+/, ''));
  }
  for (const r of raws) out.add(r);
  const want = new Set(numbers);
  return [...out].filter((s) => s && want.has(normaliseCompanyNumber(s) ?? ''));
}

export async function getDonorWhatFollowed(numbers: string[], raws: string[]): Promise<WhatFollowedData | null> {
  if (numbers.length === 0) return null;
  try {
    const strings = numberStrings(numbers, raws);
    const [grantsRes, indexRes] = await Promise.all([
      supabase.from('government_grants')
        .select('identifier, title, amount, award_date, recipient_name, funder_name, scheme_title, recipient_company_number', { count: 'exact' })
        .in('recipient_company_number', strings)
        .order('award_date', { ascending: false, nullsFirst: false }).order('identifier')
        .limit(WHAT_FOLLOWED_CAP),
      supabase.from('organisation_index').select('*').in('company_number', numbers),
    ]);
    if (grantsRes.error) throw new Error(`government_grants: ${grantsRes.error.message}`);
    if (indexRes.error) throw new Error(`organisation_index: ${indexRes.error.message}`);
    const want = new Set(numbers);
    const grants = ((grantsRes.data ?? []) as (OrgGrant & { recipient_company_number: string | null })[])
      .filter((g) => want.has(normaliseCompanyNumber(g.recipient_company_number ?? '') ?? ''));
    const index = ((indexRes.data ?? []) as OrgIndexRow[]).filter((o) => o.company_number && want.has(o.company_number));

    const registry = await Promise.all(index.filter((o) => o.lobby_org_id).map((o) => getOrgRegistryRecords(o)));
    const seenMeeting = new Set<string>();
    const meetings: OrgMeeting[] = [];
    for (const r of registry) for (const m of r.meetings) if (!seenMeeting.has(m.meeting_key)) { seenMeeting.add(m.meeting_key); meetings.push(m); }
    const lobbying: LobbyingQuarter[] = [];
    for (const r of registry) for (const f of r.lobbying) for (const q of f.quarters) lobbying.push({ firm: f.firm, start: q.start, label: q.label });
    const byDateDesc = (a: string | null, b: string | null) => (b ?? '').localeCompare(a ?? '');
    meetings.sort((a, b) => byDateDesc(a.date_flag ? null : a.meeting_date, b.date_flag ? null : b.meeting_date));
    lobbying.sort((a, b) => byDateDesc(a.start, b.start) || a.firm.localeCompare(b.firm));

    return {
      grants, grantsTotal: grantsRes.count ?? grants.length,
      meetings: meetings.slice(0, WHAT_FOLLOWED_CAP), meetingsTotal: meetings.length,
      lobbying: lobbying.slice(0, WHAT_FOLLOWED_CAP), lobbyingTotal: lobbying.length,
      orgs: index.map((o) => ({ slug: o.slug, name: o.name })),
    };
  } catch (e) {
    console.error('[donor-what-followed]', e instanceof Error ? e.message : e);
    return null;
  }
}
