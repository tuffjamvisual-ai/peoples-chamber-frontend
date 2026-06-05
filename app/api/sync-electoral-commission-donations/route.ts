// Pulls Electoral Commission donations into political_donations.
// Same shape as scripts/sync-electoral-commission-donations.js but
// running inside a Vercel function so it can run on a cron.
//
// Strategy: only fetches recently-accepted donations (sliding 90-day
// window) since the EC publishes in arrears and the initial 93k
// backfill was done out-of-band via the script. Each run upserts on
// ec_ref.
//
// Time budget: 300s. At ~500ms per page × 100 rows/page, can process
// ~60k rows per run; the 90-day window is well under that ceiling.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const EC_URL = 'https://search.electoralcommission.org.uk/api/search/Donations';

type ECResult = {
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

type ECResponse = { Total: number; Result: ECResult[] };

function ddmmyyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function parseEcDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/\/Date\((-?\d+)\)\//);
  if (!m) return null;
  const ms = parseInt(m[1], 10);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function mapRow(r: ECResult): Record<string, unknown> | null {
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

async function fetchPage(start: number, rows: number, from: string, to: string): Promise<ECResponse> {
  const body = new URLSearchParams({
    rows: String(rows),
    start: String(start),
    query: '',
    sort: 'AcceptedDate',
    order: 'desc',
    includeOutsideSection75: 'true',
    AcceptedFromDate: from,
    AcceptedToDate: to,
  }).toString();
  const res = await fetch(EC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'PeoplesChamber/1.0',
    },
    body,
  });
  if (!res.ok) throw new Error(`EC HTTP ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 });
  }
  const supabase = createClient(url, key);

  // Sliding 90-day window so the weekly cron picks up newly published
  // donations + any retroactive corrections.
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

  const startedAt = Date.now();
  const TIME_BUDGET_MS = 240_000;

  const probe = await fetchPage(0, 1, ddmmyyyy(from), ddmmyyyy(to));
  const total = probe.Total;

  let upserted = 0;
  let pages = 0;
  let moreToProcess = false;

  const ROWS = 100;
  for (let start = 0; start < total; start += ROWS) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      moreToProcess = true;
      break;
    }
    let data: ECResponse;
    try {
      data = await fetchPage(start, ROWS, ddmmyyyy(from), ddmmyyyy(to));
    } catch {
      continue;
    }
    const rows = (data.Result || []).map(mapRow).filter((r): r is Record<string, unknown> => r !== null);
    if (rows.length === 0) break;
    const { error } = await supabase
      .from('political_donations')
      .upsert(rows, { onConflict: 'ec_ref' });
    if (!error) upserted += rows.length;
    pages++;
    await new Promise((r) => setTimeout(r, 150));
  }

  return NextResponse.json({
    ok: true,
    total_available: total,
    pages,
    upserted,
    more_to_process: moreToProcess,
    window: { from: ddmmyyyy(from), to: ddmmyyyy(to) },
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  });
}
