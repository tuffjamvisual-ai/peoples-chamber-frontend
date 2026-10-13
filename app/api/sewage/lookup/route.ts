import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Postcode -> council area and Westminster constituency codes, for the
// postcode search on /sewage. Same validation and postcodes.io call as
// /api/councils/lookup (see the notes there on the lau2 field, the Scottish
// S30 fallback and Barnsley/Sheffield). The page holds every area's figures,
// so this only returns codes; the page finds the matching rows.
//
// Constituency: codes.parliamentary_constituency_2024 (July 2024 boundaries,
// the same ONS codes the sewage tables use).

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
// Barnsley and Sheffield: ONS 2025 codes -> codes held in the councils and sewage tables.
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };

type PostcodesIoResult = {
  postcode?: string;
  admin_district?: string | null;
  parliamentary_constituency_2024?: string | null;
  codes?: { lau2?: string | null; admin_district?: string | null; parliamentary_constituency_2024?: string | null };
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

  let council = result.codes?.lau2 || null;
  if (council?.startsWith('S30')) council = result.codes?.admin_district || council;
  if (council && CODE_ALIASES[council]) council = CODE_ALIASES[council];

  return NextResponse.json({
    postcode: result.postcode || raw,
    councilCode: council,
    councilName: result.admin_district || null,
    constituencyCode: result.codes?.parliamentary_constituency_2024 || null,
    constituencyName: result.parliamentary_constituency_2024 || null,
  });
}
