// Shown for any page that does not exist (Next.js still returns a 404 status). It keeps the
// site frame, a search box and the main sections, so a reader who follows a broken or old
// link has a way on (audit S1: the old 404 page was bare, with no frame, search or way back).

import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from './components/OpenGovShell';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'Special Elite, monospace';

const SECTIONS: { href: string; label: string }[] = [
  { href: '/mps', label: 'MPs' },
  { href: '/bills', label: 'Bills' },
  { href: '/divisions', label: 'Commons votes' },
  { href: '/departments', label: 'Departments' },
  { href: '/councils', label: 'Councils' },
  { href: '/transparency', label: 'Accountability' },
  { href: '/editorials', label: 'Investigations' },
];

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <OpenGovShell pageStamp="Not found">
      <article style={{ fontFamily: MONO, color: INK, padding: 'clamp(8px, 2vw, 24px) 0' }}>
        <h1 style={{ fontFamily: MONO, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 'bold', margin: '0 0 12px' }}>
          Page not found
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: '0 0 20px' }}>
          There is no page at this address. It may have moved, or the link may be mistyped. Search the site, or start from one of the sections below.
        </p>
        <form action="/search" method="get" role="search" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 24px', maxWidth: '36em' }}>
          <label htmlFor="nf-q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Search the site</label>
          <input id="nf-q" name="q" type="search" placeholder="An MP, a bill, a council, a donor…"
            style={{ flex: '1 1 14em', minWidth: 0, fontFamily: MONO, fontSize: '16px', padding: '8px 10px', border: `1px solid ${INK}`, background: 'transparent', color: INK }} />
          <button type="submit" style={{ fontFamily: MONO, fontSize: '16px', padding: '8px 14px', border: `1px solid ${INK}`, background: INK, color: '#f4efe6', cursor: 'pointer' }}>
            Search
          </button>
        </form>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} style={{ color: ACCENT, fontSize: '16px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{s.label}</Link>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: '15px', marginTop: '28px' }}>
          <Link href="/" style={{ color: INK }}>← Home</Link>
        </p>
      </article>
    </OpenGovShell>
  );
}
