import { supabase } from '@/lib/supabase'
import { tableTags } from '@/lib/source-tags'
import { appgCard } from './appgCard'

// The six dataset lists' reads (F04 batch 3, ENTRY 134; T2's f04-32-routes.md B 1.3), shared by /transparency/[section]
// (page 1) and /transparency/[section]/page/[page] (both static: they call these only inside the tagged data cache) and by
// /transparency/[section]/search (an A16 exception that also calls them only inside the tagged cache, one entry per
// normalised search, Cowork ENTRY 226). The reads are F05's, unchanged.

export const PAGE_LIMIT = 50    // rows per page: the only pager on these lists (23 Oct 2026)

// table: the table listed and searched; key: its unique column, the last sort key and the column counted (id unless
// given); alsoReads: other tables a row is built from, whose tags refresh the list too.
export const SECTIONS: Record<string, { title: string; table: string; orderBy?: string; key?: string; alsoReads?: string[] }> = {
  'ministers-meetings': { title: "Ministers' Meetings", table: 'ministers_meetings', orderBy: 'meeting_date' },
  // APPGs (Cowork ENTRY 227, owner approved 17 Nov 2026, found by T2): appgs, which the nightly APPG sync writes, with its
  // officers and funders. Until 17 Nov this read appg_register, a copy last written on 30 Apr 2026 (553 groups; 648 now).
  // Z to A by name, as the old copy listed them by id.
  'appgs':              { title: 'All Party Parliamentary Groups', table: 'appgs', orderBy: 'title', key: 'slug', alsoReads: ['appg_officers', 'appg_funders'] },
  'hospitality':        { title: "Ministers' Hospitality", table: 'ministers_hospitality', orderBy: 'hospitality_date' },
  'revolving-door':     { title: 'Revolving Door', table: 'revolving_door', orderBy: 'approval_date' },
  'donations':          { title: 'Political Donations', table: 'political_donations', orderBy: 'received_date' },
  'contracts':          { title: 'Government Contracts', table: 'government_contracts', orderBy: 'awarded_date' },
}

// Every section searches its whole table on the server.
export const SEARCH_COLS: Record<string, string[]> = {
  donations: ['donor_name', 'recipient_name'],
  contracts: ['supplier', 'title', 'dept_slug'],
  'ministers-meetings': ['minister_name', 'organisation', 'purpose'],
  hospitality: ['minister_name', 'donor', 'description'],
  'revolving-door': ['person_name', 'organisation', 'new_role', 'previous_role'],
  appgs: ['title', 'registered_contact', 'purpose'], // name, chair (the registered contact) and purpose, as before
}

// Rows shown per section (the fields TransparencyClient.tsx reads; appgs shows every field it has, folded).
export const COLUMNS: Record<string, string> = {
  'revolving-door': 'id, person_name, previous_role, new_role, organisation, approval_date, description',
  'ministers-meetings': 'id, minister_name, minister_dept, organisation, purpose, meeting_date',
  hospitality: 'id, minister_name, minister_dept, donor, description, value, hospitality_date',
  donations: 'id, donor_name, donor_type, recipient_name, recipient_type, amount, cash_value, non_cash_value, accepted_date, received_date, reported_date, reporting_period_name, nature, donation_type_label, donation_action, manner_in_which_made, campaigning_name, company_registration_number, accounting_unit_name, addr_line1, addr_line2, addr_line3, addr_line4, addr_town, addr_county, addr_postcode, addr_country, ec_ref, explanatory_notes, purpose_of_visit, position_standing_for, impermissibility_reason, attempted_concealment, concealment_details, trust_name, trust_creator_name, trust_creator_status, trust_created_date, is_aggregation, is_anonymous, is_bequest, is_irish_source, is_reported_pre_poll, is_sponsorship',
  contracts: 'id, ocid, title, supplier, dept_slug, description, status, value, awarded_date, updated_at',
  appgs: 'slug, title, category, purpose, registered_contact, appg_officers(role, name_at_time, party, removed, id), appg_funders(source, description, value_band, received_date, registered_date, benefit_type, id)',
}

// The tags of every table the rows of a section are read from: its cached list, pages and searches drop when any of them changes.
export function sectionTags(section: string): string[] {
  return tableTags(SECTIONS[section].table, ...(SECTIONS[section].alsoReads ?? []))
}

// The reader's search words, with the characters that would break the filter syntax dropped ('_' too, F05: a one-character
// wildcard in ILIKE); null when nothing is left or the section has no search.
export function cleanSearch(section: string, q: string | null | undefined): string | null {
  const cleaned = (q || '').replace(/[,()*%_"\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
  return cleaned && SEARCH_COLS[section] ? cleaned : null
}

// Meetings and hospitality hide rows dated in the future (source typos; the data is corrected from the quarter on sync, this is
// the display safety net). The cut-off day is part of the cache key for those two (dayKey), so their cached count and pages
// change at most once a day, and the others never.
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const dayKey = (section: string) => (section === 'ministers-meetings' || section === 'hospitality' ? todayIso() : '')

function filtered(section: string, searchTerm: string | null, q: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (searchTerm) q = q.or(SEARCH_COLS[section].map((c) => `${c}.ilike.%${searchTerm}%`).join(','))
  if (section === 'ministers-meetings') q = q.lte('meeting_date', todayIso())
  if (section === 'hospitality') q = q.lte('hospitality_date', todayIso())
  return q
}

// How many rows the list (or the search) has. A failed read throws, so nothing empty is cached.
export async function sectionCount(section: string, searchTerm: string | null): Promise<number> {
  const config = SECTIONS[section]
  const { count, error } = await filtered(section, searchTerm, supabase.from(config.table).select(config.key ?? 'id', { count: 'exact', head: true }))
  if (error) throw new Error(`/transparency/${section} count: ${error.message}`)
  return (count ?? 0) as number
}

// One page of rows, newest first by the section's date, id as the last sort key. A failed read throws.
export async function sectionRows(section: string, searchTerm: string | null, page: number): Promise<Record<string, any>[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const config = SECTIONS[section]
  const from = (page - 1) * PAGE_LIMIT
  let q = filtered(section, searchTerm, supabase.from(config.table).select(COLUMNS[section] ?? '*').range(from, from + PAGE_LIMIT - 1))
  if (config.orderBy) q = q.order(config.orderBy, { ascending: false, nullsFirst: false })
  q = q.order(config.key ?? 'id', { ascending: false })
  const { data, error } = await q
  if (error) throw new Error(`/transparency/${section} rows: ${error.message}`)
  const rows = (data ?? []) as Record<string, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  return section === 'appgs' ? rows.map(appgCard) : rows
}
