import { NextRequest, NextResponse } from 'next/server';
import { POSTCODE_RE, cleanPostcode, codesForPostcode, codesForPoint, findPlaces, findCouncilByName, LookupError } from '@/lib/area-lookup';

export const dynamic = 'force-dynamic';

// Homepage "Your area" search. ?q= a postcode or a town name; ?lat=&lon=&place=
// once the reader has picked one of several towns with the same name.
// Returns codes only: the results page (/your-area) is addressed by codes, never
// by the postcode.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    if (sp.has('lat') && sp.has('lon')) {
      const codes = await codesForPoint(Number(sp.get('lat')), Number(sp.get('lon')));
      return NextResponse.json({ kind: 'area', place: (sp.get('place') || '').slice(0, 60) || null, ...codes });
    }
    const q = (sp.get('q') || '').trim();
    if (POSTCODE_RE.test(cleanPostcode(q))) {
      const codes = await codesForPostcode(q);
      return NextResponse.json({ kind: 'area', place: null, ...codes });
    }
    if (/^[A-Za-z]{1,2}\d/.test(q) && /\d/.test(q)) {
      return NextResponse.json({ error: 'invalid', message: 'Enter a full postcode, for example TR27 6LA.' }, { status: 400 });
    }
    // A council's name (Leeds, Highland Council, Newport) goes to that council's
    // summary, covering every constituency in it.
    const council = await findCouncilByName(q);
    if (council) {
      return NextResponse.json({ kind: 'area', place: null, councilCode: council.gss_code, councilName: council.name, constituencyCode: null, constituencyName: null });
    }
    const places = await findPlaces(q);
    if (places.length === 0) {
      return NextResponse.json({ error: 'notfound', message: 'No town or village in Great Britain has that name. Check the spelling or enter a postcode (Northern Ireland needs a postcode).' }, { status: 404 });
    }
    if (places.length === 1) {
      const codes = await codesForPoint(places[0].lat, places[0].lon);
      return NextResponse.json({ kind: 'area', place: places[0].name, ...codes });
    }
    return NextResponse.json({ kind: 'choices', choices: places });
  } catch (e) {
    if (e instanceof LookupError) {
      const status = e.kind === 'invalid' ? 400 : e.kind === 'notfound' ? 404 : 502;
      return NextResponse.json({ error: e.kind, message: e.message }, { status });
    }
    return NextResponse.json({ error: 'unavailable', message: 'Lookup is unavailable right now. Please try again.' }, { status: 502 });
  }
}
