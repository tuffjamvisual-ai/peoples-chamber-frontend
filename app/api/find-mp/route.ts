import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// UK postcode, spaces stripped + uppercased before testing.
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('postcode') || '').toUpperCase().replace(/\s+/g, '');
  if (!POSTCODE_RE.test(raw)) {
    return NextResponse.json({ error: 'invalid', message: "That doesn't look like a UK postcode." }, { status: 400 });
  }

  // postcode -> 2024 parliamentary constituency via postcodes.io
  let constituency: string | null = null;
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}`, { signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return NextResponse.json({ error: 'notfound', message: 'Postcode not found. Check the spelling.' }, { status: 404 });
    if (!r.ok) throw new Error(`postcodes.io ${r.status}`);
    const j = await r.json();
    constituency = j?.result?.parliamentary_constituency_2024 || j?.result?.parliamentary_constituency || null;
  } catch {
    return NextResponse.json({ error: 'timeout', message: 'Lookup is unavailable right now. Please try again.' }, { status: 502 });
  }
  if (!constituency) {
    return NextResponse.json({ error: 'noconstituency', message: "We couldn't find a constituency for that postcode." }, { status: 404 });
  }

  // constituency -> our MP (exact case-insensitive, then normalised fallback)
  const { data: exact } = await supabase.from('mps').select('member_id, name, constituency').ilike('constituency', constituency).limit(1);
  let mp = (exact || [])[0] as { member_id: number; name: string; constituency: string } | undefined;
  if (!mp) {
    const { data: all } = await supabase.from('mps').select('member_id, name, constituency').not('constituency', 'is', null);
    mp = (all || []).find((m) => norm(String(m.constituency)) === norm(constituency!)) as typeof mp;
  }
  if (!mp) {
    return NextResponse.json({ error: 'nomp', message: `We couldn't find an MP for ${constituency}.`, constituency }, { status: 404 });
  }

  return NextResponse.json({ memberId: mp.member_id, name: mp.name, constituency: mp.constituency });
}
