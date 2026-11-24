import Link from 'next/link';
import type { YourArea } from '@/lib/search-your-area';

// 'Your area' at the top of /search results (owner approved, Cowork ENTRY 555 items 2 and 3, ENTRY 556): what the desktop
// homepage's 'Find your local council' and 'Find your MP' boxes find for the same words (lib/search-your-area.ts), and a
// line into the archive search, as its box offers. Shown only when there is something to show.

const INK = '#14100d';
const ACCENT = '#7a1612';
const box: React.CSSProperties = { margin: '0 0 22px', padding: '12px 14px', border: '1px solid rgba(20,16,13,0.25)', background: 'rgba(255,255,255,0.18)', color: INK, fontSize: '16px', lineHeight: 1.6 };
const link: React.CSSProperties = { color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' };
const row: React.CSSProperties = { margin: '0 0 6px' };

export default function SearchYourArea({ q, area, archive }: { q: string; area: YourArea | null; archive: boolean }) {
  const a = area;
  const anyArea = !!a && (a.council || a.councilChoices.length || a.councilSuggestions.length || a.mps.length || a.postcodeNotFound);
  if (!anyArea && !archive) return null;
  return (
    <section aria-label="Your area" style={box}>
      {a?.postcodeNotFound && !a.council && !a.mps.length && <div style={row}>We couldn&rsquo;t find that postcode.</div>}
      {a?.council && (
        <div style={row}><strong>Your council:</strong> <Link href={`/your-area/${a.council.code}`} prefetch={false} style={link}>{a.council.name}</Link></div>
      )}
      {a && !a.council && a.councilChoices.length > 0 && (
        <div style={row}>
          <strong>Councils for places called &ldquo;{q}&rdquo;:</strong>{' '}
          {a.councilChoices.map((c, i) => (
            <span key={c.label}>{i > 0 && ', '}<a href={`/your-area?lat=${c.lat}&lon=${c.lon}&place=${encodeURIComponent(c.name)}`} style={link}>{c.label}</a></span>
          ))}
        </div>
      )}
      {a && !a.council && !a.councilChoices.length && a.councilSuggestions.length > 0 && (
        <div style={row}>
          <strong>Councils:</strong>{' '}
          {a.councilSuggestions.map((g, i) => (
            <span key={g.href}>{i > 0 && ', '}<a href={g.href} style={link}>{g.name}</a>{g.tag ? ` (${g.tag})` : ''}</span>
          ))}
        </div>
      )}
      {a && a.mps.length > 0 && (
        <div style={row}>
          <strong>{a.mpsTotal === 1 ? 'Your MP:' : 'MPs:'}</strong>{' '}
          {a.mps.map((m, i) => (
            <span key={m.memberId}>
              {i > 0 && '; '}
              <Link href={`/mps/${m.memberId}`} prefetch={false} style={link}>{m.name}</Link>
              {m.constituency && <> · {m.constituencySlug ? <Link href={`/constituencies/${m.constituencySlug}`} prefetch={false} style={link}>{m.constituency}</Link> : m.constituency}</>}
            </span>
          ))}
          {a.mpsTotal > a.mps.length && <> · <Link href={`/mps?q=${encodeURIComponent(q)}`} prefetch={false} style={link}>All {a.mpsTotal.toLocaleString('en-GB')} MPs for &ldquo;{q}&rdquo;</Link></>}
        </div>
      )}
      {archive && (
        <div style={{ ...row, margin: 0 }}>
          <a href={`/archive?q=${encodeURIComponent(q)}`} style={link}>Search the archives for &ldquo;{q}&rdquo; &rarr;</a> Free account needed.
        </div>
      )}
    </section>
  );
}
