// The Electoral Commission donations search, shared by the daily sync (/api/sync-electoral-commission-donations) and
// the weekly full sweep (/api/sweep-electoral-commission-donations): the row shape, the mapping to political_donations
// and one page read. Moved here from the daily route on 27 Oct 2026 (day job Part 3), unchanged.
import { SyncBudget, politeFetch } from '@/lib/sync-budget';

export const EC_URL = 'https://search.electoralcommission.org.uk/api/search/Donations';
export const ROWS = 50; // the most the Commission's search returns a page

export type ECResult = {
  ECRef?: string | null;
  Id?: number | null;
  DonorName?: string | null;
  DonorStatus?: string | null;
  DonorId?: number | null;
  RegulatedEntityName?: string | null;
  RegulatedEntityType?: string | null;
  RegulatedEntityId?: number | null;
  RegulatedDoneeType?: string | null;
  Value?: number | null;
  CashValue?: number | null;
  NonCashValue?: number | null;
  ReceivedDate?: string | null;
  AcceptedDate?: string | null;
  ReportedDate?: string | null;
  PublishedDate?: string | null;
  DealtWithDate?: string | null;
  ReturnedDate?: string | null;
  TrustCreatedDate?: string | null;
  NatureOfDonation?: string | null;
  DonationType?: string | null;
  DonationAction?: string | null;
  MannerInWhichMade?: string | null;
  PurposeOfVisit?: string | null;
  PositionStandingFor?: string | null;
  ExplanatoryNotes?: string | null;
  ReasonForImpermissibility?: string | null;
  DetailsOfConcealmentRevealed?: string | null;
  AttemptedConcealment?: boolean | null;
  IsAnonymous?: boolean | null;
  IsAggregation?: boolean | null;
  IsBequest?: boolean | null;
  IsSponsorship?: boolean | null;
  IsIrishSource?: boolean | null;
  IsReportedPrePoll?: boolean | null;
  AccountingUnitsAsCentralParty?: boolean | null;
  ReportingPeriodName?: string | null;
  ReportingPeriodType?: string | null;
  CampaigningName?: string | null;
  RegisterName?: string | null;
  TrustName?: string | null;
  TrustCreatorName?: string | null;
  TrustCreatorStatus?: string | null;
  CompanyRegistrationNumber?: string | null;
  AccountingUnitName?: string | null;
  AccountingUnitId?: number | null;
  Line1?: string | null;
  Line2?: string | null;
  Line3?: string | null;
  Line4?: string | null;
  Town?: string | null;
  County?: string | null;
  Country?: string | null;
  Postcode?: string | null;
};

export type ECResponse = { Total: number; Result: ECResult[] };

export function parseEcDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/\/Date\((-?\d+)\)\//);
  if (!m) return null;
  const ms = parseInt(m[1], 10);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function mapRow(r: ECResult): Record<string, unknown> | null {
  if (!r.ECRef) return null;
  return {
    ec_ref: r.ECRef,
    ec_id: r.Id ?? null,
    donor_name: r.DonorName ?? null,
    donor_type: r.DonorStatus ?? null,
    donor_status: r.DonorStatus ?? null,
    donor_id: r.DonorId ?? null,
    recipient_name: r.RegulatedEntityName ?? null,
    recipient_type: r.RegulatedEntityType ?? null,
    regulated_entity_id: r.RegulatedEntityId ?? null,
    regulated_entity_type: r.RegulatedEntityType ?? null,
    regulated_donee_type: r.RegulatedDoneeType ?? null,
    amount: r.Value ?? null,
    cash_value: r.CashValue ?? null,
    non_cash_value: r.NonCashValue ?? null,
    received_date: parseEcDate(r.ReceivedDate),
    accepted_date: parseEcDate(r.AcceptedDate),
    reported_date: parseEcDate(r.ReportedDate),
    published_date: parseEcDate(r.PublishedDate),
    dealt_with_date: parseEcDate(r.DealtWithDate),
    returned_date: parseEcDate(r.ReturnedDate),
    trust_created_date: parseEcDate(r.TrustCreatedDate),
    nature: r.NatureOfDonation ?? null,
    donation_type_label: r.DonationType ?? null,
    donation_action: r.DonationAction ?? null,
    manner_in_which_made: r.MannerInWhichMade ?? null,
    purpose_of_visit: r.PurposeOfVisit ?? null,
    position_standing_for: r.PositionStandingFor ?? null,
    explanatory_notes: r.ExplanatoryNotes ?? null,
    impermissibility_reason: r.ReasonForImpermissibility ?? null,
    concealment_details: r.DetailsOfConcealmentRevealed ?? null,
    attempted_concealment: r.AttemptedConcealment ?? null,
    is_anonymous: r.IsAnonymous ?? null,
    is_aggregation: r.IsAggregation ?? null,
    is_bequest: r.IsBequest ?? null,
    is_sponsorship: r.IsSponsorship ?? null,
    is_irish_source: r.IsIrishSource ?? null,
    is_reported_pre_poll: r.IsReportedPrePoll ?? null,
    accounting_units_as_central_party: r.AccountingUnitsAsCentralParty ?? null,
    reporting_period_name: r.ReportingPeriodName ?? null,
    reporting_period_type: r.ReportingPeriodType ?? null,
    campaigning_name: r.CampaigningName ?? null,
    register_name: r.RegisterName ?? null,
    trust_name: r.TrustName ?? null,
    trust_creator_name: r.TrustCreatorName ?? null,
    trust_creator_status: r.TrustCreatorStatus ?? null,
    company_registration_number: r.CompanyRegistrationNumber ?? null,
    accounting_unit_name: r.AccountingUnitName ?? null,
    accounting_unit_id: r.AccountingUnitId ?? null,
    addr_line1: r.Line1 ?? null,
    addr_line2: r.Line2 ?? null,
    addr_line3: r.Line3 ?? null,
    addr_line4: r.Line4 ?? null,
    addr_town: r.Town ?? null,
    addr_county: r.County ?? null,
    addr_country: r.Country ?? null,
    addr_postcode: r.Postcode ?? null,
    updated_at: new Date().toISOString(),
  };
}

// The Commission's search filters by date only in this form (date=Reported&from=YYYY-MM-DD&to=YYYY-MM-DD), and returns
// at most 50 rows a page whatever is asked (both checked 27 Oct 2026, job 79). Until then the sync sent
// AcceptedFromDate/AcceptedToDate, which the search ignores, and stepped 100 rows a page: every run read the whole
// register newest first, saved only every other block of 50, and ran out of time about half way.
// With from and to (YYYY-MM-DD), only donations reported in those days; with neither, the whole register, newest first.
export async function fetchPage(start: number, from: string | null, to: string | null, budget: SyncBudget): Promise<ECResponse> {
  const q = new URLSearchParams({
    start: String(start), rows: String(ROWS), query: '', sort: 'AcceptedDate', order: 'desc',
    includeOutsideSection75: 'true', ...(from && to ? { date: 'Reported', from, to } : {}),
  });
  const res = await politeFetch(`${EC_URL}?${q}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
  }, { budget, timeoutMs: 30_000 });
  if (!res.ok) throw new Error(`EC HTTP ${res.status}`);
  return res.json();
}

// Only real changes (owner, 30 Oct 2026, cache Stage 2a part 4): a chunk of mapped rows is compared with the stored
// rows (same ec_ref) and only new or changed ones are upserted. Returns how many were written and the donor names of
// the changed rows (before and after), whose donations an MP page can show (lib/ec-donations.ts mpsForDonors).
// `dry` compares but writes nothing.
const sameCell = (a: unknown, b: unknown) => {
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  if (typeof a === 'string' && typeof b === 'string' && /^\d{4}-\d{2}-\d{2}/.test(a) && /^\d{4}-\d{2}-\d{2}/.test(b)) return a.slice(0, 10) === b.slice(0, 10);
  return JSON.stringify(a) === JSON.stringify(b);
};
export async function upsertChangedDonations(
  db: import('@supabase/supabase-js').SupabaseClient, rows: Record<string, unknown>[], dry = false,
): Promise<{ written: number; donors: string[] }> {
  if (!rows.length) return { written: 0, donors: [] };
  const cols = Object.keys(rows[0]).filter((c) => c !== 'updated_at');
  const { data, error } = await db.from('political_donations').select(cols.join(', ')).in('ec_ref', rows.map((r) => r.ec_ref as string));
  if (error) throw new Error(`political_donations read: ${error.message}`);
  const stored = new Map(((data ?? []) as unknown as Record<string, unknown>[]).map((r) => [r.ec_ref as string, r]));
  const changed = rows.filter((r) => { const o = stored.get(r.ec_ref as string); return !o || cols.some((c) => !sameCell(o[c], r[c])); });
  const donors = new Set<string>();
  for (const r of changed) for (const n of [r.donor_name, stored.get(r.ec_ref as string)?.donor_name]) if (typeof n === 'string' && n.trim()) donors.add(n.trim());
  if (changed.length && !dry) {
    const { error: upErr } = await db.from('political_donations').upsert(changed, { onConflict: 'ec_ref' });
    if (upErr) throw new Error(`political_donations upsert: ${upErr.message}`);
  }
  return { written: changed.length, donors: [...donors] };
}

// The MPs whose page shows a donor's Electoral Commission total: officers of an APPG the donor funds (the APPG section
// of /mps/[id] cross-references funders with political_donations).
export async function mpsForDonors(db: import('@supabase/supabase-js').SupabaseClient, donors: string[]): Promise<number[]> {
  const names = [...new Set(donors.map((d) => d.trim()).filter(Boolean))];
  const slugs = new Set<string>();
  for (let i = 0; i < names.length; i += 100) {
    const { data, error } = await db.from('appg_funders').select('appg_slug, source').in('source', names.slice(i, i + 100));
    if (error) throw new Error(`appg_funders read: ${error.message}`);
    for (const r of data ?? []) slugs.add(r.appg_slug as string);
  }
  if (!slugs.size) return [];
  const { data, error } = await db.from('appg_officers').select('member_id').in('appg_slug', [...slugs]).not('member_id', 'is', null);
  if (error) throw new Error(`appg_officers read: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.member_id as number))];
}
