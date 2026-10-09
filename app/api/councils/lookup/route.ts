import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Postcode -> council, for the homepage's local-authority search bar.
// Mirrors /api/welfare/lookup's validation and postcodes.io-fetch pattern,
// but resolves to a single row in the `councils` table (name + slug),
// covering all four nations rather than the welfare explorer's GB-only
// (England/Wales/Scotland) scope.
//
// FIELD CHOICE: result.codes.lau2, same as /api/welfare/lookup — confirmed
// against a live postcodes.io response for a Northern Ireland postcode
// (BT1 1AA) before this route was written: both admin_district and lau2
// returned N09000003 (Belfast), an exact match for councils.gss_code with
// no translation needed for NI.
//
// SCOTLAND: lau2 can return an old pre-1996 S30-prefix code rather than
// the current S12-prefix code the councils table uses — same caveat
// documented in /api/welfare/lookup. Falls back to admin_district, which
// reliably gives S12 codes, exactly as that route does.
//
// BARNSLEY / SHEFFIELD: lau2 returns the old pre-2025 DWP/Nomis-vintage
// codes (E08000016 / E08000019) for these two councils specifically, but
// the councils table was updated with the new 2025 boundary-reorganisation
// codes (E08000038 / E08000039) — see the same translation map's comment
// in app/api/welfare/local-authority/[gss]/route.ts for the full
// explanation. Translated here, for this lookup only.

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;

const BARNSLEY_SHEFFIELD_NEW_CODES: Record<string, string> = {
  E08000016: 'E08000038', // Barnsley
  E08000019: 'E08000039', // Sheffield
};

type PostcodesIoResult = {
  admin_district?: string | null;
  codes?: {
    lau2?: string | null;
    admin_district?: string | null;
  };
};

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('postcode') || '').toUpperCase().replace(/\s+/g, '');
  if (!POSTCODE_RE.test(raw)) {
    return NextResponse.json({ error: 'invalid', message: "That doesn't look like a UK postcode." }, { status: 400 });
  }

  let result: PostcodesIoResult;
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}`, { signal: AbortSignal.timeout(8000) });
    if (r.status === 404) {
      return NextResponse.json({ error: 'notfound', message: 'Postcode not found. Check the spelling.' }, { status: 404 });
    }
    if (!r.ok) throw new Error(`postcodes.io ${r.status}`);
    const j = await r.json();
    result = j?.result || {};
  } catch {
    return NextResponse.json({ error: 'timeout', message: 'Lookup is unavailable right now. Please try again.' }, { status: 502 });
  }

  let councilGss = result.codes?.lau2 || null;
  if (councilGss?.startsWith('S30')) {
    councilGss = result.codes?.admin_district || councilGss;
  }
  if (!councilGss) {
    return NextResponse.json({ error: 'notfound', message: "Couldn't determine a council for that postcode." }, { status: 404 });
  }

  councilGss = BARNSLEY_SHEFFIELD_NEW_CODES[councilGss] ?? councilGss;

  const { data, error } = await supabase
    .from('councils')
    .select('slug, name, short_name, type_label')
    .eq('gss_code', councilGss)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'notfound', message: "Couldn't find a council matching that postcode." }, { status: 404 });
  }

  return NextResponse.json({
    slug: data.slug,
    name: data.name,
    shortName: data.short_name,
    typeLabel: data.type_label,
  });
}
