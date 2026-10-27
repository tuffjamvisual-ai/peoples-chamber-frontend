// Reads for /organisations and /organisations/<slug> (report 71), from organisation_index and organisation_contracts
// (migration 2026-10-27c) and the source tables. Donations, contracts and grants are found by Companies House number
// only: the index stores the exact number strings each register used, and the record lists read the rows with those
// strings. Meetings and lobbying come through the lobbying registry's checked spellings (lib/lobbying.ts). Nothing is
// found by name.

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { readAll } from '@/lib/read-all';
import { getOrgMeetings, getOrgLobbying, type OrgMeeting, type OrgLobbying } from '@/lib/lobbying';

export type OrgIndexRow = {
  slug: string;
  kind: 'registry' | 'company';
  lobby_org_id: number | null;
  name: string;
  org_type: string | null;
  company_number: string | null;
  name_variants: string[] | null;
  donations: number;
  donations_accepted: number;
  donated_accepted: number;
  donations_not_accepted: number;
  last_donation: string | null;
  donation_number_raws: string[] | null;
  contracts: number;
  contract_value: number;
  contracts_unpublished: number;
  framework_places: number;
  framework_max_value: number;
  last_contract: string | null;
  grants: number;
  grant_value: number;
  last_grant: string | null;
  grant_number_raws: string[] | null;
  meetings: number;
  last_meeting: string | null;
  lobbying_quarters: number;
  lobbying_firms: number;
  last_lobbying_quarter: string | null;
  datasets: number;
  refreshed_at: string;
};

export type OrgListRow = Pick<OrgIndexRow, 'slug' | 'kind' | 'name' | 'company_number' | 'name_variants' | 'donations' | 'contracts' | 'framework_places' | 'grants' | 'meetings' | 'lobbying_quarters' | 'datasets'>;

export type OrgDonation = {
  id: number; donor_name: string; recipient_name: string | null; amount: number | null; accepted_date: string | null;
  received_date: string | null; donation_action: string | null; ec_ref: string | null; donation_type_label: string | null; nature: string | null;
};
export type OrgContract = {
  id: number; ocid: string | null; supplier: string; dept_slug: string; title: string | null; value: number | null;
  awarded_date: string | null; is_framework: boolean;
};
export type OrgGrant = {
  identifier: string; title: string | null; amount: number | null; award_date: string | null; recipient_name: string | null;
  funder_name: string | null; scheme_title: string | null;
};

export const DATASETS = ['donations', 'contracts', 'grants'] as const;
export type Dataset = (typeof DATASETS)[number];

const NUMERIC: (keyof OrgIndexRow)[] = ['donations', 'donations_accepted', 'donated_accepted', 'donations_not_accepted', 'contracts', 'contract_value',
  'contracts_unpublished', 'framework_places', 'framework_max_value', 'grants', 'grant_value', 'meetings', 'lobbying_quarters', 'lobbying_firms', 'datasets'];

function numbers<T extends Partial<OrgIndexRow>>(r: T): T {
  const out = { ...r } as Record<string, unknown>;
  for (const k of NUMERIC) if (k in out) out[k] = Number(out[k]) || 0;
  return out as T;
}

export const getOrganisation = cache(async (slug: string): Promise<OrgIndexRow | null> => {
  const { data, error } = await supabase.from('organisation_index').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(`organisation_index ${slug}: ${error.message}`);
  return data ? numbers(data as OrgIndexRow) : null;
});

const LIST_COLS = 'slug, kind, name, company_number, name_variants, donations, contracts, framework_places, grants, meetings, lobbying_quarters, datasets';

// Every page, for the index and the sitemap (about 1,800 rows).
export const listOrganisations = cache(async (): Promise<OrgListRow[]> => {
  const rows = await readAll<OrgListRow>(() => supabase.from('organisation_index'), { columns: LIST_COLS, orderBy: 'slug', label: 'organisation_index' });
  return rows.map(numbers);
});

// The same list cached for an hour across requests, for /organisations and the Organisations group on /search.
export const cachedOrganisationList = unstable_cache(async () => listOrganisations(), ['organisation-list-v1'], { revalidate: 3600 });

// A Companies House number as Companies House writes it (normalise_company_number in SQL), or null.
export function normaliseCompanyNumber(raw: string): string | null {
  const c = raw.toUpperCase().replace(/\s/g, '');
  if (/^0*$/.test(c) || /^[A-Z]{2}0*$/.test(c)) return null;
  if (/^[0-9]{1,8}$/.test(c)) return c.padStart(8, '0');
  if (/^[A-Z]{2}[0-9]{1,6}$/.test(c)) return c.slice(0, 2) + c.slice(2).padStart(6, '0');
  return null;
}

// Search on the name, the other spellings and the Companies House number. Returns the best matches first: an exact
// number, then names that start with the words, then the rest by size of record.
export function searchOrganisations(all: OrgListRow[], q: string): OrgListRow[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const number = normaliseCompanyNumber(query);
  const scored: { r: OrgListRow; score: number }[] = [];
  for (const r of all) {
    if (number && r.company_number === number) { scored.push({ r, score: 0 }); continue; }
    const name = r.name.toLowerCase();
    if (name.startsWith(query)) scored.push({ r, score: 1 });
    else if (name.includes(query)) scored.push({ r, score: 2 });
    else if ((r.name_variants || []).some((v) => v.toLowerCase().includes(query))) scored.push({ r, score: 3 });
  }
  const size = (r: OrgListRow) => r.donations + r.contracts + r.framework_places + r.grants + r.meetings + r.lobbying_quarters;
  return scored.sort((a, b) => a.score - b.score || size(b.r) - size(a.r) || a.r.name.localeCompare(b.r.name)).map((s) => s.r);
}

export const getOrgDonations = cache(async (org: OrgIndexRow, limit?: number): Promise<OrgDonation[]> => {
  const raws = org.donation_number_raws || [];
  if (raws.length === 0) return [];
  const cols = 'id, donor_name, recipient_name, amount, accepted_date, received_date, donation_action, ec_ref, donation_type_label, nature';
  if (limit) {
    const { data, error } = await supabase.from('political_donations').select(cols).in('company_registration_number', raws).or('donor_type.is.null,donor_type.neq.Individual')
      .order('accepted_date', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).limit(limit);
    if (error) throw new Error(`organisation donations: ${error.message}`);
    return (data ?? []) as OrgDonation[];
  }
  return readAll<OrgDonation>(() => supabase.from('political_donations'), {
    columns: cols,
    filter: (q) => q.in('company_registration_number', raws).or('donor_type.is.null,donor_type.neq.Individual'),
    orderBy: [{ column: 'accepted_date', ascending: false }, { column: 'id', ascending: false }],
    label: 'organisation donations',
  });
});

export const getOrgContracts = cache(async (companyNumber: string | null, limit?: number): Promise<OrgContract[]> => {
  if (!companyNumber) return [];
  const cols = 'id, ocid, supplier, dept_slug, title, value, awarded_date, is_framework';
  if (limit) {
    const { data, error } = await supabase.from('organisation_contracts').select(cols).eq('company_number', companyNumber).eq('superseded', false)
      .order('awarded_date', { ascending: false, nullsFirst: false }).order('id', { ascending: false }).limit(limit);
    if (error) throw new Error(`organisation contracts: ${error.message}`);
    return (data ?? []) as OrgContract[];
  }
  return readAll<OrgContract>(() => supabase.from('organisation_contracts'), {
    columns: cols,
    filter: (q) => q.eq('company_number', companyNumber).eq('superseded', false),
    orderBy: [{ column: 'awarded_date', ascending: false }, { column: 'id', ascending: false }],
    label: 'organisation contracts',
  });
});

export const getOrgGrants = cache(async (org: OrgIndexRow, limit?: number): Promise<OrgGrant[]> => {
  const raws = org.grant_number_raws || [];
  if (raws.length === 0) return [];
  const cols = 'identifier, title, amount, award_date, recipient_name, funder_name, scheme_title';
  if (limit) {
    const { data, error } = await supabase.from('government_grants').select(cols).in('recipient_company_number', raws)
      .order('award_date', { ascending: false, nullsFirst: false }).order('identifier').limit(limit);
    if (error) throw new Error(`organisation grants: ${error.message}`);
    return (data ?? []) as OrgGrant[];
  }
  return readAll<OrgGrant>(() => supabase.from('government_grants'), {
    columns: cols,
    filter: (q) => q.in('recipient_company_number', raws),
    orderBy: [{ column: 'award_date', ascending: false }, { column: 'identifier' }],
    label: 'organisation grants',
  });
});

export async function getOrgRegistryRecords(org: OrgIndexRow): Promise<{ meetings: OrgMeeting[]; lobbying: OrgLobbying[] }> {
  if (!org.lobby_org_id) return { meetings: [], lobbying: [] };
  const [meetings, lobbying] = await Promise.all([getOrgMeetings(org.lobby_org_id), getOrgLobbying(org.lobby_org_id)]);
  return { meetings, lobbying };
}

export const companiesHouseUrl = (n: string) => `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(n)}`;
export const grantNavUrl = (identifier: string) => `https://grantnav.threesixtygiving.org/grant/${encodeURIComponent(identifier)}`;
export const findTenderUrl = (ocid: string) => `https://www.find-tender.service.gov.uk/Procurement/${encodeURIComponent(ocid)}`;

export function money(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`;
}

export function fmtDay(d: string | null): string {
  if (!d) return 'date not given';
  const iso = d.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return d;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// A contract's buyer from its department slug, as the donor pages write it.
export function buyerLabel(slug: string): string {
  return slug.split('-').map((w) => (w.length > 3 || /^(nhs|uk|hm)$/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')
    .replace(/^./, (c) => c.toUpperCase()).replace(/\b(Nhs|Uk|Hm)\b/g, (w) => w.toUpperCase());
}

// One sentence of what the page holds, for the page, its link preview and the index.
export function orgSummaryLine(o: Pick<OrgIndexRow, 'name' | 'donations' | 'donated_accepted' | 'contracts' | 'contract_value' | 'framework_places' | 'grants' | 'grant_value' | 'meetings' | 'lobbying_quarters'>): string {
  const parts: string[] = [];
  if (o.donations) parts.push(`${money(o.donated_accepted)} in political donations accepted`);
  if (o.contracts) parts.push(`${money(o.contract_value)} in public contracts awarded`);
  else if (o.framework_places) parts.push(`${o.framework_places.toLocaleString('en-GB')} public framework place${o.framework_places === 1 ? '' : 's'}`);
  if (o.grants) parts.push(`${money(o.grant_value)} in government grants`);
  if (o.meetings) parts.push(`${o.meetings.toLocaleString('en-GB')} meeting${o.meetings === 1 ? '' : 's'} with ministers`);
  if (o.lobbying_quarters) parts.push(`${o.lobbying_quarters.toLocaleString('en-GB')} quarter${o.lobbying_quarters === 1 ? '' : 's'} as a lobbying client`);
  if (parts.length === 0) return `${o.name}: no linked records.`;
  const last = parts.pop();
  return `${o.name}: ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`;
}
