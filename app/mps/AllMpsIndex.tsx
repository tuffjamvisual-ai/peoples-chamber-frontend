// Server-rendered "Browse all MPs A-Z" link block. Ships every current
// MP (650) as a real <a href> inside 26 alphabetised <details>
// groupings. Sits below the existing MagazineMPsClient on /mps.
//
// Why this exists: MagazineMPsClient is 'use client' wrapped in a
// Suspense fallback — Googlebot's first-pass crawl sees only the
// fallback div, not the 650 MP <Link>s the client component renders
// post-hydration. That left all 650 MP detail pages discoverable only
// via the sitemap. This component closes the gap with zero touch to
// the interactive UI.
//
// Added 2026-06-05 as SEO Phase 1 Task 6.

import Link from 'next/link';

type MpRow = {
  member_id: number;
  name: string;
  party: string | null;
  constituency: string | null;
};

const INK = '#14100d';
const INK_SOFT = 'rgba(20,16,13,0.7)';
const INK_HAIRLINE = 'rgba(20,16,13,0.18)';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

// Drop common honorific prefixes so 'Sir John Smith' files under S.
const HONORIFICS = /^(rt\s+hon\s+|the\s+rt\s+hon\s+|sir\s+|dame\s+|dr\s+|mr\s+|mrs\s+|ms\s+|miss\s+|lord\s+|baroness\s+|professor\s+)/i;

function surnameInitial(name: string): string {
  // Strip honorifics, take the last word.
  const stripped = name.replace(HONORIFICS, '').trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  const surname = parts.length > 0 ? parts[parts.length - 1] : name;
  const ch = surname.charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

export default function AllMpsIndex({ mps }: { mps: MpRow[] }) {
  if (mps.length === 0) return null;

  // Group by initial letter of surname
  const groups = new Map<string, MpRow[]>();
  for (const m of mps) {
    const k = surnameInitial(m.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }
  // Sort each group's MPs by surname
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const ax = a.name.replace(HONORIFICS, '').trim().split(/\s+/).slice(-1)[0] || a.name;
      const bx = b.name.replace(HONORIFICS, '').trim().split(/\s+/).slice(-1)[0] || b.name;
      return ax.localeCompare(bx, 'en-GB');
    });
  }
  // Letters in alphabetical order, with '#' last
  const letters = Array.from(groups.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  const summaryStyle: React.CSSProperties = {
    cursor: 'pointer',
    padding: '10px 0',
    fontFamily: MONO,
    fontSize: '13px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: ACCENT,
    fontWeight: 600,
    borderTop: `1px solid ${INK_HAIRLINE}`,
  };
  const itemStyle: React.CSSProperties = {
    display: 'block',
    padding: '5px 0',
    color: INK,
    textDecoration: 'none',
    fontFamily: SERIF,
    fontSize: '14px',
    lineHeight: 1.45,
    borderBottom: `1px dotted rgba(20,16,13,0.1)`,
  };
  const subStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontFamily: MONO,
    color: INK_SOFT,
    marginTop: '2px',
  };

  return (
    <section
      aria-label="All MPs — full index"
      style={{ marginTop: '48px', paddingTop: '24px', borderTop: `2px solid ${INK_HAIRLINE}` }}
    >
      <h2
        style={{
          fontFamily: MONO,
          fontSize: '14px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: ACCENT,
          marginBottom: '8px',
          fontWeight: 600,
        }}
      >
        Browse all {mps.length.toLocaleString()} MPs A&ndash;Z
      </h2>
      <p
        style={{
          fontFamily: SERIF,
          fontSize: '14px',
          lineHeight: 1.7,
          color: INK,
          maxWidth: '640px',
          marginBottom: '20px',
        }}
      >
        Every current Member of Parliament, alphabetised by surname. Each line
        links to the full MP profile.
      </p>
      {letters.map((letter) => {
        const items = groups.get(letter)!;
        return (
          <details key={letter} style={{ marginBottom: '6px' }}>
            <summary style={summaryStyle}>
              {letter} ({items.length.toLocaleString()})
            </summary>
            <ul
              style={{
                listStyle: 'none',
                padding: '8px 0 14px',
                margin: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0 24px',
              }}
            >
              {items.map((m) => (
                <li key={m.member_id}>
                  <Link href={`/mps/${m.member_id}`} style={itemStyle}>
                    {m.name}
                    {(m.constituency || m.party) && (
                      <span style={subStyle}>
                        {[m.constituency, m.party].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </section>
  );
}
