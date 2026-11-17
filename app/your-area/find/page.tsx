// /your-area?q= and /your-area?lat=&lon=&place= (next.config.ts rewrites those addresses here; F04 batch 4): a postcode,
// town or council search sent without the page script, or a place picked from the choices. Looks it up (postcodes.io and the
// place lists, lib/area-lookup.ts and lib/area-resolve.ts) and sends the reader to the council's static page, never keeping
// the postcode in the address. A16 exception (owner approved 16 Nov 2026, ENTRY 187): postcode or place lookup.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { codesForPoint, LookupError } from '@/lib/area-lookup';
import { resolveArea, type Suggestion } from '@/lib/area-resolve';
import type { AreaCodes, Place } from '@/lib/area-lookup';
import Shell, { ACCENT, para, link } from '../Shell';

export const metadata: Metadata = {
  title: 'Your area',
  description: 'Your council and the latest local figures for your area, from a postcode, town or council.',
  alternates: { canonical: '/your-area' },
  robots: { index: false, follow: true },
};

export default async function YourAreaFind({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const place = one(sp.place).replace(/[^\p{L}\p{N} '’.,()-]/gu, '').slice(0, 60) || null;
  // A search sent without the page script (?q=, or ?lat=&lon=&place= after picking
  // a place): look it up here and go to the codes address, never keeping the postcode.
  const q = one(sp.q).trim().slice(0, 60);
  const lat = Number(one(sp.lat)), lon = Number(one(sp.lon));
  let target: (AreaCodes & { place: string | null }) | null = null;
  let choices: Place[] = [];
  let suggestions: Suggestion[] = [];
  let message: string | null = null;
  try {
    if (one(sp.lat) && one(sp.lon)) {
      target = { ...(await codesForPoint(lat, lon)), place };
    } else if (q) {
      // The same lookup as the homepage box (lib/area-resolve.ts; T1-MP, 11 Nov 2026).
      const r = await resolveArea(q);
      if (r.kind === 'area') target = r;
      else if (r.kind === 'choices') choices = r.choices;
      else if (r.kind === 'suggest') { message = r.message; suggestions = r.suggestions; }
      else message = r.message;
    }
  } catch (e) {
    message = e instanceof LookupError ? e.message : 'Lookup is unavailable right now. Please try again.';
  }
  if (target && target.councilCode) redirect(`/your-area/${target.councilCode}${target.place ? `?place=${encodeURIComponent(target.place)}` : ''}`);
  return (
    <Shell>
      {message && <p style={{ ...para, color: ACCENT }}>{message}</p>}
      {suggestions.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
          {suggestions.map((g) => (
            <li key={g.href} style={{ ...para, lineHeight: '24px', margin: 0, padding: '6px 0' }}>
              <a href={g.href} style={{ ...link, padding: '10px 0' }}>{g.name}</a>{g.tag ? ` (${g.tag})` : ''}
            </li>
          ))}
        </ul>
      )}
      {choices.length > 0 ? (
        <>
          <p style={para}>More than one place has that name. Which one?</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
            {choices.map((c) => (
              <li key={c.label} style={{ ...para, marginBottom: '4px' }}>
                <a href={`/your-area?lat=${c.lat}&lon=${c.lon}&place=${encodeURIComponent(c.name)}`} style={link}>{c.label}</a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        !message && <p style={para}>Enter a postcode, town or council to see your council and the latest figures for your area.</p>
      )}
    </Shell>
  );
}
