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
// two councils (E08000016 / E08000019) which is also what DWP/Nomis
// use, so lookup → welfare data join works without any translation.
// HOWEVER the councils table (used here to get the LA's slug for the
// "view council profile" link) was updated with the new 2025 codes
// (E08000038 / E08000039). We translate for that one specific lookup
// only — nowhere else — so welfare data keying and scope detection
// continue to use the old codes throughout.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const PARTIAL_METRIC_KEYS = [
  'uc_spend_estimated_annual',
  'hb_spend_estimated_annual',
  'esa_spend_estimated_annual',
] as const;

// Barnsley and Sheffield only: maps old DWP-vintage codes (welfare tables)
// to new 2025 council-reorganisation codes (councils table slugs).
// Do NOT use this map for anything except the councils table slug lookup.
const BARNSLEY_SHEFFIELD_NEW_CODES: Record<string, string> = {
  E08000016: 'E08000038', // Barnsley
  E08000019: 'E08000039', // Sheffield
};

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
    // Translate Barnsley/Sheffield to their new 2025 codes for this lookup only
    const councilsGss = BARNSLEY_SHEFFIELD_NEW_CODES[gss] ?? gss;
    const { data: council } = await supabase
      .from('councils')
      .select('slug')
      .eq('gss_code', councilsGss)
      .single();

    return NextResponse.json({ scope: 'full', data, councilSlug: council?.slug ?? null });
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

  // councils table slug lookup (Scottish councils also have rows, using new codes if applicable)
  const councilsGss = BARNSLEY_SHEFFIELD_NEW_CODES[gss] ?? gss;
  const { data: council } = await supabase
    .from('councils')
    .select('slug')
    .eq('gss_code', councilsGss)
    .single();

  return NextResponse.json({
    scope: 'partial',
    councilName,
    councilSlug: council?.slug ?? null,
    benefits,
    note: 'PIP, DLA, and Carer\'s Allowance are devolved in Scotland. Only UC, Housing Benefit, and ESA (GB-wide reserved benefits) are shown. No national ranking is available.',
  });
}
