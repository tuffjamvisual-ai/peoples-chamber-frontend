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

    return NextResponse.json({ scope: 'full', data });
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

  // Also fetch constituency name from mps table
  const { data: mp } = await supabase
    .from('mps')
    .select('constituency')
    .eq('constituency_gss_code', gss)
    .single();

  return NextResponse.json({
    scope: 'partial',
    constituencyName: mp?.constituency || null,
    benefits,
    note: 'PIP, DLA, and Carer\'s Allowance are devolved in Scotland. Only UC, Housing Benefit, and ESA (GB-wide reserved benefits) are shown. No national ranking is available.',
  });
}
