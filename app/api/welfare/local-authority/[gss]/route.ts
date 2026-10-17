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


type SummaryRow = {
  council_gss_code: string;
  council_name: string;
  headline_period_end: string;
  total_six_benefit_spend: number;
  baseline_period_end: string;
  baseline_total_spend: number;
  population: number;
  population_reference_year: number;
  metadata_json: {
    benefit_breakdown: Record<string, number>;
    benefit_period_ends: Record<string, string>;
    baseline_benefit_breakdown: Record<string, number>;
    baseline_benefit_period_ends: Record<string, string>;
  };
};

const mostCommon = (vals: string[]): { value: string; mixed: boolean } => {
  const counts = new Map<string, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const value = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  return { value, mixed: counts.size > 1 };
};

async function countyAggregate(gss: string) {
  const [{ data: councils, error: cErr }, { data: summaries, error: sErr }] = await Promise.all([
    supabase.from('councils').select('slug, name, short_name, type, gss_code, parent_slug').in('type', ['county', 'district']),
    supabase.from('welfare_local_authority_summary').select('council_gss_code, council_name, headline_period_end, total_six_benefit_spend, baseline_period_end, baseline_total_spend, population, population_reference_year, metadata_json'),
  ]);
  if (cErr || sErr || !councils || !summaries) return { error: 'Welfare data is unavailable right now.' };
  const county = councils.find((c) => c.gss_code === gss && c.type === 'county');
  if (!county) return { error: 'No welfare data found for this local authority.' };
  const bySummary = new Map((summaries as SummaryRow[]).map((r) => [r.council_gss_code, r]));
  const districtsOf = (slug: string) => councils.filter((c) => c.type === 'district' && c.parent_slug === slug);

  // Totals for every county, for the county-only ranking.
  const totals = councils.filter((c) => c.type === 'county').map((c) => {
    const rows = districtsOf(c.slug).map((d) => bySummary.get(d.gss_code)).filter((r): r is SummaryRow => !!r);
    const total = rows.reduce((t, r) => t + Number(r.total_six_benefit_spend), 0);
    const pop = rows.reduce((t, r) => t + Number(r.population), 0);
    return { slug: c.slug, complete: rows.length > 0 && rows.length === districtsOf(c.slug).length, total, perResident: pop ? total / pop : 0 };
  }).filter((t) => t.complete);

  const districts = districtsOf(county.slug);
  const rows = districts.map((d) => bySummary.get(d.gss_code)).filter((r): r is SummaryRow => !!r);
  if (!districts.length || rows.length !== districts.length) {
    return { error: 'Welfare figures are not available for every district in this county, so a county total cannot be given.' };
  }

  const sum = (f: (r: SummaryRow) => number) => rows.reduce((t, r) => t + Number(f(r) || 0), 0);
  const keys = Object.keys(rows[0].metadata_json.benefit_breakdown);
  const breakdown: Record<string, number> = {};
  const baselineBreakdown: Record<string, number> = {};
  const periodEnds: Record<string, string> = {};
  const baselinePeriodEnds: Record<string, string> = {};
  let mixed = false;
  for (const k of keys) {
    breakdown[k] = sum((r) => r.metadata_json.benefit_breakdown[k]);
    baselineBreakdown[k] = sum((r) => r.metadata_json.baseline_benefit_breakdown[k]);
    const pe = mostCommon(rows.map((r) => r.metadata_json.benefit_period_ends[k]));
    const be = mostCommon(rows.map((r) => r.metadata_json.baseline_benefit_period_ends[k]));
    periodEnds[k] = pe.value; baselinePeriodEnds[k] = be.value; mixed = mixed || pe.mixed || be.mixed;
  }
  const total = sum((r) => r.total_six_benefit_spend);
  const baseline = sum((r) => r.baseline_total_spend);
  const population = sum((r) => r.population);
  const headline = mostCommon(rows.map((r) => r.headline_period_end));
  const base = mostCommon(rows.map((r) => r.baseline_period_end));
  const popYear = mostCommon(rows.map((r) => String(r.population_reference_year)));
  mixed = mixed || headline.mixed || base.mixed || popYear.mixed;
  const rankBy = (f: (t: (typeof totals)[number]) => number, v: number) => 1 + totals.filter((t) => f(t) > v + 1e-6).length;

  // Caseloads add up too: sum each district's current and baseline counts.
  const codes = districts.map((d) => d.gss_code);
  const perDistrict = await Promise.all(codes.map((c) => fetchClaimantCounts(c, FULL_CLAIMANT_METRIC_KEYS)));
  const claimantCounts: Record<string, ClaimantCount> = {};
  for (const key of FULL_CLAIMANT_METRIC_KEYS) {
    const parts = perDistrict.map((pc) => pc[key]).filter(Boolean);
    if (parts.length !== codes.length) continue; // only when every district has it
    const value = parts.reduce((t, p) => t + p.value, 0);
    const hasBase = parts.every((p) => p.baselineValue != null);
    const baselineValue = hasBase ? parts.reduce((t, p) => t + (p.baselineValue as number), 0) : null;
    claimantCounts[key] = {
      value,
      periodEnd: mostCommon(parts.map((p) => p.periodEnd)).value,
      unit: parts[0].unit,
      baselineValue,
      baselinePeriodEnd: hasBase ? mostCommon(parts.map((p) => p.baselinePeriodEnd as string)).value : null,
      percentChange: baselineValue ? ((value - baselineValue) / baselineValue) * 100 : null,
    };
  }
  const lc = await Promise.all(codes.map((c) => fetchUcLcwra(c)));
  let ucLcwra: UcLcwra | null = null;
  if (lc.every((x) => x && x.lcwraValue != null && x.combinedTotal != null && x.status !== 'suppressed')) {
    const l = lc as UcLcwra[];
    const lcwraValue = l.reduce((t, x) => t + (x.lcwraValue as number), 0);
    const combinedTotal = l.reduce((t, x) => t + (x.combinedTotal as number), 0);
    ucLcwra = {
      lcwraValue,
      lcw: l.every((x) => x.lcw != null) ? l.reduce((t, x) => t + (x.lcw as number), 0) : null,
      combinedTotal,
      lcwraRatioPercent: combinedTotal ? (lcwraValue / combinedTotal) * 100 : null,
      periodEnd: mostCommon(l.map((x) => x.periodEnd)).value,
      status: 'ok',
    };
  }

  return {
    scope: 'full' as const,
    councilSlug: county.slug,
    claimantCounts,
    medianWage: null,
    ucLcwra,
    aggregate: {
      kind: 'county' as const,
      districts: districts.map((d) => ({ name: d.short_name || d.name, slug: d.slug })).sort((a, b) => a.name.localeCompare(b.name)),
      areasRanked: totals.length,
      mixedPeriods: mixed,
    },
    data: {
      council_gss_code: gss,
      council_name: county.name,
      headline_period_end: headline.value,
      total_six_benefit_spend: total,
      spend_per_resident: population ? total / population : 0,
      rank_total_spend: rankBy((t) => t.total, total),
      rank_spend_per_resident: rankBy((t) => t.perResident, population ? total / population : 0),
      baseline_period_end: base.value,
      baseline_total_spend: baseline,
      cash_change: total - baseline,
      percentage_change: baseline ? ((total - baseline) / baseline) * 100 : null,
      population,
      population_reference_year: Number(popYear.value),
      metadata_json: {
        benefit_breakdown: breakdown,
        benefit_period_ends: periodEnds,
        baseline_benefit_breakdown: baselineBreakdown,
        baseline_benefit_period_ends: baselinePeriodEnds,
      },
    },
  };
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

  // ── county scope (English two-tier county councils, E10 codes) ──────────
  // Welfare figures are published per district, so a county's figures are the sum of its
  // district councils (owner's request, 17 Oct 2026). Money, caseloads and population add
  // up exactly; medians (median pay) cannot be added, so that row is left out. Ranks are
  // among the English county areas only.
  if (gss.startsWith('E10')) {
    const county = await countyAggregate(gss);
    if ('error' in county) return NextResponse.json({ error: 'notfound', message: county.error }, { status: 404 });
    return NextResponse.json(county);
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
