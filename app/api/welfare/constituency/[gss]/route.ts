import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Single-constituency welfare data, keyed by GSS code.
// Two response modes:
//
// scope='full' (England & Wales, prefix E14 or W07)
// ──────────────────────────────────────────────────
// Reads welfare_constituency_summary (the denormalised six-benefit ranked
// table rebuilt by compute-welfare-constituency-summary.js). Returns full
// per-benefit spend breakdown, rankings, two-year % change, and the
// national ranks so the UI can say "ranked #N of 650 for total spend".
//
// scope='partial' (Scotland, prefix S14)
// ───────────────────────────────────────
// PIP, DLA, and Carer's Allowance are devolved in Scotland (→ ADP /
// CDP-SADLA / CSP), so only the three GB-wide reserved benefits (UC,
// Housing Benefit, ESA) can be shown. This reads
// welfare_constituency_metrics directly for those three metric_keys, using
// the same methodology as the full-scope route but without rankings or a
// total. Returns scope='partial' so the UI knows to display the reduced
// benefit set with no ranking bar.
//
// Scottish constituencies are excluded from the summary table wholesale —
// there's no partial row there — so both the table choice AND the three-
// benefit filter differ between the two branches.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PARTIAL_METRIC_KEYS = [
  'uc_spend_estimated_annual',
  'hb_spend_estimated_annual',
  'esa_spend_estimated_annual',
] as const;

// Claimant/household counts, confirmed live in welfare_constituency_metrics
// (one row per key for the current period, plus a second row per key
// carrying metadata_json.baseline=true for the two-year-change
// comparison — same pattern already used for the six spend metrics).
// uc_households is HOUSEHOLDS (UC is assessed per household), the other
// five are individual claimant counts — see import-welfare-uc-households.js
// for why UC is counted differently.
const FULL_CLAIMANT_METRIC_KEYS = [
  'ca_claimants',
  'dla_claimants',
  'esa_claimants',
  'hb_claimants',
  'pip_claimants',
  'uc_households',
] as const;

// Scotland: only the three GB-wide reserved benefits have claimant data
// (PIP/DLA/CA are devolved, same exclusion as the spend metrics above).
const PARTIAL_CLAIMANT_METRIC_KEYS = [
  'esa_claimants',
  'hb_claimants',
  'uc_households',
] as const;

type ClaimantCount = {
  value: number;
  periodEnd: string;
  unit: string;
  baselineValue: number | null;
  baselinePeriodEnd: string | null;
  percentChange: number | null;
};

async function fetchClaimantCounts(
  gss: string,
  metricKeys: readonly string[],
): Promise<Record<string, ClaimantCount>> {
  const { data: rows, error } = await supabase
    .from('welfare_constituency_metrics')
    .select('metric_key, value, period_end, unit, metadata_json')
    .eq('constituency_gss_code', gss)
    .in('metric_key', metricKeys);

  if (error || !rows) {
    console.error('welfare claimant counts error:', error?.message);
    return {};
  }

  const result: Record<string, ClaimantCount> = {};
  for (const r of rows) {
    const isBaseline = !!(r.metadata_json && (r.metadata_json as { baseline?: boolean }).baseline === true);
    if (!result[r.metric_key]) {
      result[r.metric_key] = {
        value: 0,
        periodEnd: '',
        unit: r.unit,
        baselineValue: null,
        baselinePeriodEnd: null,
        percentChange: null,
      };
    }
    if (isBaseline) {
      result[r.metric_key].baselineValue = r.value;
      result[r.metric_key].baselinePeriodEnd = r.period_end;
    } else {
      result[r.metric_key].value = r.value;
      result[r.metric_key].periodEnd = r.period_end;
      result[r.metric_key].unit = r.unit;
    }
  }
  for (const key of Object.keys(result)) {
    const c = result[key];
    if (c.baselineValue != null && c.baselineValue !== 0) {
      c.percentChange = ((c.value - c.baselineValue) / c.baselineValue) * 100;
    }
  }
  return result;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gss: string }> },
) {
  const { gss: rawGss } = await params;
  const gss = (rawGss || '').toUpperCase();
  if (!/^[EWS]\d{8}$/.test(gss)) {
    return NextResponse.json({ error: 'invalid', message: 'Invalid GSS code.' }, { status: 400 });
  }

  const isScotland = gss.startsWith('S14');

  if (!isScotland) {
    // ── full scope: read from welfare_constituency_summary ─────────────
    const { data, error } = await supabase
      .from('welfare_constituency_summary')
      .select('*')
      .eq('constituency_gss_code', gss)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'notfound', message: 'No welfare data found for this constituency.' }, { status: 404 });
    }

    // welfare_constituency_summary has no name column (unlike
    // welfare_local_authority_summary, which stores council_name
    // directly) — the mps table is this project's single source of
    // truth for constituency name + GSS code, so join it the same way
    // the partial-scope (Scotland) branch below already does.
    const { data: mp } = await supabase
      .from('mps')
      .select('member_id, name, constituency, party, party_abbreviation, party_colour, latest_election_majority')
      .eq('constituency_gss_code', gss)
      .single();

    const claimantCounts = await fetchClaimantCounts(gss, FULL_CLAIMANT_METRIC_KEYS);

    return NextResponse.json({
      scope: 'full',
      data,
      constituencyName: mp?.constituency ?? null,
      claimantCounts,
      mp: mp
        ? {
            memberId: mp.member_id,
            name: mp.name,
            party: mp.party,
            partyAbbreviation: mp.party_abbreviation,
            partyColour: mp.party_colour,
            latestElectionMajority: mp.latest_election_majority,
          }
        : null,
    });
  }

  // ── partial scope: read live metrics for 3 reserved benefits ─────────
  const { data: rows, error } = await supabase
    .from('welfare_constituency_metrics')
    .select('metric_key, value, period_end, unit, status')
    .eq('constituency_gss_code', gss)
    .in('metric_key', PARTIAL_METRIC_KEYS)
    .order('period_end', { ascending: false });

  if (error) {
    console.error('welfare constituency partial error:', error.message);
    return NextResponse.json({ error: 'db', message: 'Database error.' }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'notfound', message: 'No welfare data found for this constituency.' }, { status: 404 });
  }

  // Latest row per metric_key (rows are ordered desc, so first occurrence wins)
  const benefits: Record<string, { value: number; periodEnd: string; unit: string; status: string }> = {};
  for (const r of rows) {
    if (!benefits[r.metric_key]) {
      benefits[r.metric_key] = {
        value: r.value,
        periodEnd: r.period_end,
        unit: r.unit,
        status: r.status,
      };
    }
  }

  // Also fetch constituency name + MP from mps table
  const { data: mp } = await supabase
    .from('mps')
    .select('member_id, name, constituency, party, party_abbreviation, party_colour, latest_election_majority')
    .eq('constituency_gss_code', gss)
    .single();

  const claimantCounts = await fetchClaimantCounts(gss, PARTIAL_CLAIMANT_METRIC_KEYS);

  return NextResponse.json({
    scope: 'partial',
    constituencyName: mp?.constituency || null,
    claimantCounts,
    mp: mp
      ? {
          memberId: mp.member_id,
          name: mp.name,
          party: mp.party,
          partyAbbreviation: mp.party_abbreviation,
          partyColour: mp.party_colour,
          latestElectionMajority: mp.latest_election_majority,
        }
      : null,
    benefits,
    note: 'PIP, DLA, and Carer\'s Allowance are devolved in Scotland. Only UC, Housing Benefit, and ESA (GB-wide reserved benefits) are shown. No national ranking is available.',
  });
}
