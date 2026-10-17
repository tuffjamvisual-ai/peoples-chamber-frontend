// Postcode or town -> council area and Westminster constituency codes, for the
// homepage "Your area" search and /your-area. Uses postcodes.io (free, no key,
// already used by /api/councils/lookup, /api/find-mp and /api/sewage/lookup).
//
// Council code: codes.lau2, with the Scottish S30 fallback to admin_district,
// exactly as /api/councils/lookup. Barnsley and Sheffield: if postcodes.io
// returns the 2025 codes, they are mapped back to the codes held in our tables
// (the same alias /api/sewage/lookup uses; harmless when the old codes come back).
// Constituency: codes.parliamentary_constituency_2024 (July 2024 boundaries).
//
// Towns: postcodes.io /places searches Ordnance Survey Open Names (Great Britain
// only). The town centre point is turned into codes by finding the nearest
// postcode to it (/postcodes?lon&lat, within 2 km).

import { supabase } from '@/lib/supabase';

export const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/;
const CODE_ALIASES: Record<string, string> = { E08000038: 'E08000016', E08000039: 'E08000019' };
const BASE = 'https://api.postcodes.io';

export type AreaCodes = {
  councilCode: string | null;
  councilName: string | null;
  constituencyCode: string | null;
  constituencyName: string | null;
};

type PostcodeResult = {
  postcode?: string;
  admin_district?: string | null;
  parliamentary_constituency_2024?: string | null;
  codes?: { lau2?: string | null; admin_district?: string | null; parliamentary_constituency_2024?: string | null };
};

export class LookupError extends Error {
  constructor(public kind: 'invalid' | 'notfound' | 'unavailable', message: string) { super(message); }
}

export const cleanPostcode = (v: string) => v.toUpperCase().replace(/\s+/g, '');

function toCodes(r: PostcodeResult): AreaCodes {
  let council = r.codes?.lau2 || null;
  if (council?.startsWith('S30')) council = r.codes?.admin_district || council;
  if (council && CODE_ALIASES[council]) council = CODE_ALIASES[council];
  return {
    councilCode: council,
    councilName: r.admin_district || null,
    constituencyCode: r.codes?.parliamentary_constituency_2024 || null,
    constituencyName: r.parliamentary_constituency_2024 || null,
  };
}

async function getJson(url: string): Promise<{ status: number; body: { result?: unknown } | null }> {
  let r: Response;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
  } catch {
    throw new LookupError('unavailable', 'Lookup is unavailable right now. Please try again.');
  }
  if (r.status === 404) return { status: 404, body: null };
  if (!r.ok) throw new LookupError('unavailable', 'Lookup is unavailable right now. Please try again.');
  return { status: r.status, body: await r.json() };
}

export async function codesForPostcode(raw: string): Promise<AreaCodes> {
  const pc = cleanPostcode(raw);
  if (!POSTCODE_RE.test(pc)) throw new LookupError('invalid', "That doesn't look like a UK postcode.");
  const { status, body } = await getJson(`${BASE}/postcodes/${encodeURIComponent(pc)}`);
  if (status === 404 || !body?.result) throw new LookupError('notfound', 'Postcode not found. Check the spelling.');
  return toCodes(body.result as PostcodeResult);
}

export async function codesForPoint(lat: number, lon: number): Promise<AreaCodes> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 49 || lat > 61.5 || lon < -9 || lon > 2.5) {
    throw new LookupError('invalid', 'That location is not in the UK.');
  }
  const { body } = await getJson(`${BASE}/postcodes?lon=${lon}&lat=${lat}&radius=2000&limit=1`);
  const list = (body?.result ?? []) as PostcodeResult[];
  if (!Array.isArray(list) || list.length === 0) throw new LookupError('notfound', 'No postcode was found near that place. Try a postcode instead.');
  return toCodes(list[0]);
}

export type Place = { name: string; label: string; lat: number; lon: number };

type PlaceResult = {
  name_1?: string; name_2?: string | null; local_type?: string;
  county_unitary?: string | null; district_borough?: string | null; region?: string | null; country?: string | null;
  latitude?: number; longitude?: number;
};

// Settlements only (not roads, rivers or hills), larger places first.
const TYPE_ORDER = ['City', 'Town', 'Suburban Area', 'Village', 'Hamlet', 'Other Settlement'];
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export async function findPlaces(q: string): Promise<Place[]> {
  const query = q.trim();
  if (query.length < 2 || query.length > 60) throw new LookupError('invalid', 'Enter a postcode or a town name.');
  const { body } = await getJson(`${BASE}/places?q=${encodeURIComponent(query)}&limit=100`);
  const list = (body?.result ?? []) as PlaceResult[];
  const want = norm(query);
  const hits = (Array.isArray(list) ? list : [])
    .filter((p) => p.local_type && TYPE_ORDER.includes(p.local_type) && p.latitude != null && p.longitude != null)
    .filter((p) => norm(p.name_1 ?? '') === want || norm(p.name_2 ?? '') === want)
    .sort((a, b) => TYPE_ORDER.indexOf(a.local_type!) - TYPE_ORDER.indexOf(b.local_type!));
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of hits) {
    const name = norm(p.name_1 ?? '') === want ? p.name_1! : p.name_2!;
    const where = p.district_borough || p.county_unitary || p.region || p.country || '';
    const label = where && norm(where) !== norm(name) ? `${name}, ${where}` : `${name}${p.country ? `, ${p.country}` : ''}`;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ name, label, lat: Number(p.latitude), lon: Number(p.longitude) });
    if (out.length >= 12) break;
  }
  return out;
}

// A typed name that is a council's name (with or without "Council", "City Council"
// and so on) goes to that council's summary rather than to a town search.
const COUNCIL_WORDS = /\b(metropolitan borough|royal borough|london borough|borough|district|county|city|unitary)?\s*council\b|\bcomhairle\b|\bcyngor\b/gi;
const bare = (s: string) => norm(s.replace(COUNCIL_WORDS, ' ').replace(/\b(city of|of)\b/gi, ' '));

export async function findCouncilByName(q: string): Promise<{ gss_code: string; name: string } | null> {
  const want = bare(q);
  if (want.length < 2) return null;
  const safe = q.replace(/[%_,()]/g, '').trim();
  if (safe.length < 2) return null;
  const core = safe.replace(COUNCIL_WORDS, ' ').replace(/\s+/g, ' ').trim() || safe;
  const { data, error } = await supabase
    .from('councils')
    .select('gss_code, name, short_name')
    .or(`name.ilike.%${core}%,short_name.ilike.%${core}%`)
    .not('gss_code', 'is', null)
    .limit(30);
  if (error) throw new LookupError('unavailable', 'Lookup is unavailable right now. Please try again.');
  const rows = (data ?? []) as { gss_code: string; name: string; short_name: string | null }[];
  const hits = rows.filter((r) => bare(r.name) === want || (r.short_name != null && bare(r.short_name) === want));
  return hits.length === 1 ? { gss_code: hits[0].gss_code, name: hits[0].name } : null;
}
