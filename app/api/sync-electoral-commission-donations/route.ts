// Pulls Electoral Commission donations into political_donations.
// Same shape as scripts/sync-electoral-commission-donations.js but
// running inside a Vercel function so it can run on a cron.
//
// Strategy: each daily pass reads the donations reported in the last WINDOW_DAYS (below) and upserts on ec_ref; the
// full register was loaded out of band by the script. A pass that runs out of time carries on next run (job 79).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { withHeartbeat } from '@/lib/sync-heartbeat';
import { SyncBudget, politeFetch, isPoliteStop, loadCursor, saveCursor } from '@/lib/sync-budget';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const EC_URL = 'https://search.electoralcommission.org.uk/api/search/Donations';

// 27 Oct 2026 (job 79): every run in the 14 days to 26 Oct used its whole 240 s budget (about 24,000 rows) and the
// next run started again from the first page; the date window was never applied (see fetchPage). Now a pass reads the
// donations REPORTED in the last WINDOW_DAYS (the Commission publishes in arrears, so the accepted date of a newly
// published donation is often months back; on 27 Oct the last 90 days held 39 donations by accepted date and 828 by
// reported date), in 10-day slices, newest first, with the window fixed when the pass starts; the slice and page
// reached are saved in sync_cursor, and the next run carries on from there, so each donation is read once per pass
// (about 1,000 rows, 20 pages). The run stops starting pages at 70 per cent of maxDuration and ends by 80 per cent (lib/sync-budget.ts); a
// 429 stops it cleanly; a page that cannot be read, or a failed write, fails the run (502 or 500) with its progress
// saved. The response says partial: true until the pass is complete.
const ROUTE = '/api/sync-electoral-commission-donations';
const WINDOW_DAYS = 120;
const ROWS = 50; // the most the Commission's search returns a page
const SLICE_DAYS = 10;
const CURSOR_MAX_AGE_MS = 3 * 86_400_000;
type Pass = { passFrom: string; passTo: string; slice: number; start: number };

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

// The Commission's search filters by date only in this form (date=Reported&from=YYYY-MM-DD&to=YYYY-MM-DD), and returns
// at most 50 rows a page whatever is asked (both checked 27 Oct 2026, job 79). Until then the sync sent
// AcceptedFromDate/AcceptedToDate, which the search ignores, and stepped 100 rows a page: every run read the whole
// register newest first, saved only every other block of 50, and ran out of time about half way.
async function fetchPage(start: number, from: string, to: string, budget: SyncBudget): Promise<ECResponse> {
  const q = new URLSearchParams({
    start: String(start), rows: String(ROWS), query: '', sort: 'AcceptedDate', order: 'desc',
    includeOutsideSection75: 'true', date: 'Reported', from, to,
  });
  const res = await politeFetch(`${EC_URL}?${q}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' },
  }, { budget, timeoutMs: 30_000 });
  if (!res.ok) throw new Error(`EC HTTP ${res.status}`);
  return res.json();
}

async function GET_impl(req: Request) {
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

  const startedAt = Date.now();
  const budget = new SyncBudget(maxDuration, { started: startedAt });

  // A pass covers the 90 days to the day it started, in 10-day slices from the newest; carry on with one under way.
  let pass: Pass | null;
  try { pass = await loadCursor<Pass>(supabase, ROUTE, CURSOR_MAX_AGE_MS); }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
  const resumed = !!pass;
  if (!pass) {
    const to = new Date();
    pass = { passFrom: new Date(to.getTime() - WINDOW_DAYS * 86_400_000).toISOString(), passTo: to.toISOString(), slice: 0, start: 0 };
  }
  const passFrom = new Date(pass.passFrom);
  const passTo = new Date(pass.passTo);
  const slices = Math.ceil((WINDOW_DAYS + 1) / SLICE_DAYS); // the window's days are inclusive at both ends
  const sliceRange = (k: number) => {
    const to = new Date(passTo.getTime() - k * SLICE_DAYS * 86_400_000);
    const fromMs = Math.max(passFrom.getTime(), to.getTime() - SLICE_DAYS * 86_400_000 + 86_400_000);
    return { from: new Date(fromMs).toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  };

  let upserted = 0;
  let pages = 0;
  let stoppedBy: string | null = null;
  let failure: { status: number; error: string } | null = null;
  const SUB_BATCH = 25;

  let { slice, start } = pass;
  outer: while (slice < slices) {
    const { from, to } = sliceRange(slice);
    for (;;) {
      if (budget.stopStarting()) { stoppedBy = 'time budget'; break outer; }
      let data: ECResponse;
      try {
        data = await fetchPage(start, from, to, budget);
      } catch (e) {
        if (isPoliteStop(e)) { stoppedBy = (e as Error).message; break outer; }
        failure = { status: 502, error: `page at ${start} of ${from} to ${to}: ${(e as Error).message}` };
        break outer;
      }
      const rows = (data.Result || []).map(mapRow).filter((r): r is Record<string, unknown> => r !== null);
      for (let b = 0; b < rows.length; b += SUB_BATCH) {
        const chunk = rows.slice(b, b + SUB_BATCH);
        const { error } = await supabase.from('political_donations').upsert(chunk, { onConflict: 'ec_ref' });
        if (error) { failure = { status: 500, error: `political_donations upsert: ${error.message}` }; break outer; }
        upserted += chunk.length;
        if (b + SUB_BATCH < rows.length) await new Promise((r) => setTimeout(r, 100));
      }
      pages++;
      start += ROWS;
      if ((data.Result || []).length === 0 || start >= (data.Total ?? 0)) break; // this slice is done
      await new Promise((r) => setTimeout(r, 150));
    }
    slice++;
    start = 0;
  }

  const complete = slice >= slices;
  const cursorSaved = await saveCursor(supabase, ROUTE, complete ? null : { ...pass, slice, start });
  const body = {
    ok: !failure,
    partial: !complete,
    stopped_by: stoppedBy,
    ...(failure ? { error: failure.error } : {}),
    resumed,
    pages,
    upserted,
    pass: { reported_from: pass.passFrom.slice(0, 10), reported_to: pass.passTo.slice(0, 10), slices, slices_done: slice, next_page_start: complete ? null : start },
    cursor_saved: cursorSaved,
    elapsed_ms: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: failure ? failure.status : 200 });
}

export const GET = withHeartbeat('/api/sync-electoral-commission-donations', GET_impl);
