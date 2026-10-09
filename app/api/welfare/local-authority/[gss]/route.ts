import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Single local-authority welfare data, keyed by GSS code.
// Two response modes (same pattern as /api/welfare/constituency/[gss]):
//
// scope='full' (England & Wales, prefix E0x/W0x)
// ───────────────────────────────────────────────
// Reads welfare_local_authority_summary (ranked six-benefit denormalised
// table rebuilt by compute-welfare-la-summary.js). Returns per-benefit
// spend breakdown, per-resident figures, two-year % change, and rankings
// across all 318 E&W local authorities.
//
// scope='partial' (Scotland, prefix S12)
// ───────────────────────────────────────
// Reads welfare_local_authority_metrics directly for the three GB-wide
// reserved benefits only (UC, HB, ESA). No ranking or total. Returns
// scope='partial' so the UI shows the reduced set with no rank bar.
//
// BARNSLEY / SHEFFIELD CODE VINTAGE
// ───────────────────────────────────
// postcodes.io's lau2 field returns old pre-2025 GSS codes for these
// two councils (E08000016 / E08000019), which is also what DWP/Nomis
// use AND what the councils table itself stores — confirmed directly
// against the live councils table on 2026-10-09. No translation is
// needed anywhere in this route; the codebase previously assumed the
// councils table had been updated to the new 2025 codes (E08000038 /
// E08000039) and translated for the "view council profile" slug lookup
// on that basis, which was wrong and silently broke that one link for
// these two councils (fixed in this same update).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PARTIAL_METRIC_KEYS = [
  'uc_spend_estimated_annual',
  'hb_spend_estimated_annual',
  'esa_spend_estimated_annual',
] as const;

// Claimant/household counts, confirmed live in welfare_local_authority_metrics
// — same pattern as the constituency route (one current-period row per
// key, plus a second row carrying metadata_json.baseline=true for the
// two-year-change comparison). uc_households is HOUSEHOLDS, the other
// five are individual claimant counts.
const FULL_CLAIMANT_METRIC_KEYS = [
  'ca_claimants',
  'dla_claimants',
  'esa_claimants',
  'hb_claimants',
  'pip_claimants',
  'uc_households',
] as const;

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

// Median annual pay (workplace-based, full-time employees), confirmed
// live in welfare_local_authority_metrics under
// metric_key='median_annual_pay_workplace' — one row per GB local
// authority (350 total: England 296, Wales 22, Scotland 32, no baseline
// row — snapshot metric only). Same as the constituency tier, this is
// ONS/Nomis labour-market data rather than a devolved DWP benefit, so
// it's requested from BOTH the full-scope (England & Wales) and
// partial-scope (Scotland) branches below. Some local authorities are
// suppressed by ONS as statistically unreliable (status='suppressed',
// value=null) — surfaced honestly rather than hidden or estimated.
type MedianWage = {
  value: number | null;
  periodEnd: string;
  status: string;
};

async function fetchMedianWage(gss: string): Promise<MedianWage | null> {
  const { data, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('value, period_end, status')
    .eq('council_gss_code', gss)
    .eq('metric_key', 'median_annual_pay_workplace')
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('welfare LA median wage error:', error.message);
    return null;
  }

  return { value: data.value, periodEnd: data.period_end, status: data.status };
}

// LCWRA (Limited Capability for Work and Work-Related Activity) share
// of the Universal Credit health caseload, confirmed live in
// welfare_local_authority_metrics under metric_key='uc_lcwra_claimants'
// — same shape as the constituency tier. UC/WCA is not devolved to
// Scotland, so this is requested from BOTH the full-scope (England &
// Wales) and partial-scope (Scotland) branches below, same as
// medianWage above.
type UcLcwra = {
  lcwraValue: number | null;
  lcw: number | null;
  combinedTotal: number | null;
  lcwraRatioPercent: number | null;
  periodEnd: string;
  status: string;
};

async function fetchUcLcwra(gss: string): Promise<UcLcwra | null> {
  const { data, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('value, period_end, status, metadata_json')
    .eq('council_gss_code', gss)
    .eq('metric_key', 'uc_lcwra_claimants')
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('welfare LA UC LCWRA error:', error.message);
    return null;
  }

  const m = (data.metadata_json || {}) as { lcw?: number; combined_total?: number; lcwra_ratio_percent?: number };
  return {
    lcwraValue: data.value,
    lcw: m.lcw ?? null,
    combinedTotal: m.combined_total ?? null,
    lcwraRatioPercent: m.lcwra_ratio_percent ?? null,
    periodEnd: data.period_end,
    status: data.status,
  };
}

async function fetchClaimantCounts(
  gss: string,
  metricKeys: readonly string[],
): Promise<Record<string, ClaimantCount>> {
  const { data: rows, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('metric_key, value, period_end, unit, metadata_json')
    .eq('council_gss_code', gss)
    .in('metric_key', metricKeys);

  if (error || !rows) {
    console.error('welfare LA claimant counts error:', error?.message);
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

// Barnsley and Sheffield: NO translation needed for the councils table
// slug lookup below. This used to translate the old DWP-vintage codes
// (E08000016/E08000019, which `gss` correctly is here) to the "new 2025
// council-reorganisation codes" (E08000038/E08000039) on the assumption
// that councils.gss_code had been updated to those new codes. That was
// never actually checked against the real table — confirmed directly on
// 2026-10-09 while building the full-UK public health metrics import
// that councils.gss_code still stores the OLD codes for these two
// councils, same as the welfare tables. Translating made the slug
// lookup below query a code that doesn't exist in councils.gss_code at
// all, so the "view council profile" link silently came back null for
// Barnsley and Sheffield specifically. Fix: use gss as-is, no map.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gss: string }> },
) {
  const { gss: rawGss } = await params;
  const gss = (rawGss || '').toUpperCase();
  if (!/^[EWS]\d{8}$/.test(gss)) {
    return NextResponse.json({ error: 'invalid', message: 'Invalid GSS code.' }, { status: 400 });
  }

  const isScotland = gss.startsWith('S12');

  if (!isScotland) {
    // ── full scope: read from welfare_local_authority_summary ──────────
    const { data, error } = await supabase
      .from('welfare_local_authority_summary')
      .select('*')
      .eq('council_gss_code', gss)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'notfound', message: 'No welfare data found for this local authority.' }, { status: 404 });
    }

    // councils table slug lookup (for "view council profile" link)
    const { data: council } = await supabase
      .from('councils')
      .select('slug')
      .eq('gss_code', gss)
      .single();

    const claimantCounts = await fetchClaimantCounts(gss, FULL_CLAIMANT_METRIC_KEYS);
    const medianWage = await fetchMedianWage(gss);
    const ucLcwra = await fetchUcLcwra(gss);

    return NextResponse.json({ scope: 'full', data, councilSlug: council?.slug ?? null, claimantCounts, medianWage, ucLcwra });
  }

  // ── partial scope: read live metrics for 3 reserved benefits ─────────
  const { data: rows, error } = await supabase
    .from('welfare_local_authority_metrics')
    .select('metric_key, value, period_end, unit, status, council_name')
    .eq('council_gss_code', gss)
    .in('metric_key', PARTIAL_METRIC_KEYS)
    .order('period_end', { ascending: false });

  if (error) {
    console.error('welfare local-authority partial error:', error.message);
    return NextResponse.json({ error: 'db', message: 'Database error.' }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'notfound', message: 'No welfare data found for this local authority.' }, { status: 404 });
  }

  // Latest row per metric_key
  const benefits: Record<string, { value: number; periodEnd: string; unit: string; status: string }> = {};
  let councilName: string | null = null;
  for (const r of rows) {
    if (!councilName && r.council_name) councilName = r.council_name;
    if (!benefits[r.metric_key]) {
      benefits[r.metric_key] = {
        value: r.value,
        periodEnd: r.period_end,
        unit: r.unit,
        status: r.status,
      };
    }
  }

  // councils table slug lookup
  const { data: council } = await supabase
    .from('councils')
    .select('slug')
    .eq('gss_code', gss)
    .single();

  const claimantCounts = await fetchClaimantCounts(gss, PARTIAL_CLAIMANT_METRIC_KEYS);
  const medianWage = await fetchMedianWage(gss);
  const ucLcwra = await fetchUcLcwra(gss);

  return NextResponse.json({
    scope: 'partial',
    councilName,
    councilSlug: council?.slug ?? null,
    claimantCounts,
    medianWage,
    ucLcwra,
    benefits,
    note: 'PIP, DLA, and Carer\'s Allowance are devolved in Scotland. Only UC, Housing Benefit, and ESA (GB-wide reserved benefits) are shown. No national ranking is available.',
  });
}
