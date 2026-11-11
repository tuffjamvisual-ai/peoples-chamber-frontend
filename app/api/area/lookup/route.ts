import { NextRequest, NextResponse } from 'next/server';
import { codesForPoint, LookupError } from '@/lib/area-lookup';
import { resolveArea } from '@/lib/area-resolve';

export const dynamic = 'force-dynamic';

// Homepage "Find your local council" search. ?q= a postcode, town or council; ?lat=&lon=&place=
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
    // A postcode, council or town, or suggestions (lib/area-resolve.ts, shared with /your-area).
    const r = await resolveArea(sp.get('q') || '');
    if (r.kind === 'error') return NextResponse.json({ error: r.error, message: r.message }, { status: r.error === 'invalid' ? 400 : r.error === 'notfound' ? 404 : 502 });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof LookupError) {
      const status = e.kind === 'invalid' ? 400 : e.kind === 'notfound' ? 404 : 502;
      return NextResponse.json({ error: e.kind, message: e.message }, { status });
    }
    return NextResponse.json({ error: 'unavailable', message: 'Lookup is unavailable right now. Please try again.' }, { status: 502 });
  }
}
