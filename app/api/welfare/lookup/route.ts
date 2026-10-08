import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Postcode -> constituency + local authority, for the welfare explorer's
// "enter your postcode" search. Mirrors /api/find-mp's validation and
// postcodes.io-fetch pattern, but resolves BOTH a constituency and a
// local authority in one call (the welfare tool needs both, since it
// offers a Constituency/Local Authority toggle like TPA's own tool).
//
// FIELD CHOICES — confirmed against a live postcodes.io response before
// this route was written (SW1A 0AA, S70 2TN, S1 2HE):
//   - Constituency: result.codes.parliamentary_constituency_2024 (the
//     post-2024-boundary-review GSS code) + result.parliamentary_
//     constituency_2024 for the display name. Same field /api/find-mp
//     already relies on.
//   - Local authority: result.codes.lau2, NOT result.codes.admin_district.
//     For Barnsley and Sheffield specifically, postcodes.io's
//     admin_district code reflects the 2025 council reorganisation
//     (E08000038 / E08000039), but lau2 keeps returning the older
//     pre-2025 codes (E08000016 / E08000019) — which is what DWP
//     Stat-Xplore and Nomis still use, and therefore what
//     welfare_local_authority_metrics/_summary are keyed on (see the
//     2026-10-07c schema migration's header for the full vintage note).
//     Using lau2 avoids a hardcoded two-entry translation table and
//     should keep tracking whichever vintage DWP/Nomis use through any
//     future council reorganisation, though that behaviour isn't
//     documented by postcodes.io, so it's worth re-checking if a new
//     council mismatch ever turns up. result.admin_district is used only
//     for the display name (lau2 has no corresponding name field).
//
// SCOTLAND
// ────────
// Both tiers' six-benefit ranked summary tables are England & Wales
// only (PIP/DLA/CA are devolved in Scotland — see
// compute-welfare-constituency-summary.js / compute-welfare-la-
// summary.js). A Scottish postcode still resolves to a real
// constituency/local authority here; scope is reported as 'partial' so
// the results pages know to show only the three reserved benefits (UC,
// Housing Benefit, ESA) with no ranking, rather than 'full' for England
// & Wales. Determined by GSS code prefix — S14 (constituency) / S12
// (local authority) — the same convention already used throughout the
// import/compute scripts (e.g. compute-welfare-constituency-summary.js's
// `!c.startsWith('S14')`, the LA scripts' `code.startsWith('S12')`).
//
// Northern Ireland postcodes.io constituencies aren't GB (no 'E'/'W'/'S'
// prefix pattern) and have no welfare data in this project at all —
// reported as a dedicated error rather than a 'partial' scope, since
// there's truly nothing to show, not just a reduced benefit set.

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const GB_CONSTITUENCY_SHAPE = /^[EWS]\d{8}$/;
const GB_LA_SHAPE = /^[EWS]\d{8}$/;

type PostcodesIoResult = {
  parliamentary_constituency_2024?: string | null;
  admin_district?: string | null;
  codes?: {
    parliamentary_constituency_2024?: string | null;
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

  const constituencyName = result.parliamentary_constituency_2024 || null;
  const constituencyGss = result.codes?.parliamentary_constituency_2024 || null;
  const councilName = result.admin_district || null;
  // For English/Welsh LAs: codes.lau2 returns the DWP/Nomis-vintage codes
  // (notably the old pre-2025 codes for Barnsley E08000016 and Sheffield
  // E08000019, which is what the welfare tables are keyed on). For Scottish
  // LAs: codes.lau2 returns S30-prefix codes, but DWP/Nomis and therefore
  // the welfare tables use S12-prefix codes. Fall back to codes.admin_district
  // for S30 lau2 values, which reliably gives S12 codes for Scottish LAs.
  let councilGss = result.codes?.lau2 || null;
  if (councilGss?.startsWith('S30')) {
    councilGss = result.codes?.admin_district || councilGss;
  }

  if (!constituencyGss || !GB_CONSTITUENCY_SHAPE.test(constituencyGss) || !councilGss || !GB_LA_SHAPE.test(councilGss)) {
    // Northern Ireland, or any other shape we don't recognise — this
    // project has no welfare data outside Great Britain.
    return NextResponse.json(
      { error: 'notcovered', message: "This tool covers England, Wales, and Scotland only — we don't have data for that postcode's area." },
      { status: 404 },
    );
  }

  const constituencyScope = constituencyGss.startsWith('S14') ? 'partial' : 'full';
  const councilScope = councilGss.startsWith('S12') ? 'partial' : 'full';

  return NextResponse.json({
    constituency: constituencyName ? { gssCode: constituencyGss, name: constituencyName, scope: constituencyScope } : null,
    localAuthority: councilName ? { gssCode: councilGss, name: councilName, scope: councilScope } : null,
  });
}
