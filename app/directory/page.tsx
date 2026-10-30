// /directory: everything on Open Govt, A to Z (owner, 27 Oct 2026). The whole list is in the page's HTML, so it works
// without JavaScript and search engines read it; DirectoryFilter only narrows what is already there, in the browser.
// The entries come from lib/directory.ts; scripts/checks/directory-coverage.ts lists any reader facing page missing.
import type { Metadata } from 'next';
import Link from 'next/link';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { DIRECTORY, LETTERS, directoryLetter } from '@/lib/directory';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import DirectoryFilter from './DirectoryFilter';
import Unavailable from '../components/Unavailable';

export const metadata: Metadata = {
  title: { absolute: 'Directory: everything on opengovt, A to Z' },
  description: PAGE_DESCRIPTIONS['/directory'],
  alternates: { canonical: '/directory' },
};

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export default function DirectoryPage() {
  const groups = new Map<string, typeof DIRECTORY>();
  for (const e of DIRECTORY) {
    const l = directoryLetter(e.name);
    groups.set(l, [...(groups.get(l) ?? []), e]);
  }
  const letters = [...LETTERS, ...(groups.has('#') ? ['#'] : [])];

  return (
    <OpenGovShell pageStamp="Directory">
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <header style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1.1 }}>Directory</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: 0 }}>
          Everything on opengovt, A to Z: every section and list on the site, {DIRECTORY.length.toLocaleString('en-GB')} entries. Some pages are listed under more than one name.
        </p>
      </header>

      <nav aria-label="Jump to a letter" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '0 0 16px', fontFamily: MONO, fontSize: '16px' }}>
        {letters.map((l) => groups.has(l)
          ? <a key={l} href={`#letter-${l === '#' ? 'other' : l}`} data-letter-link={l} className="no-hover-scale" style={{ display: 'inline-block', minWidth: '30px', padding: '5px 0', textAlign: 'center', color: ACCENT, border: `1px solid ${HAIRLINE}`, textDecoration: 'none', fontWeight: 'bold' }}>{l}</a>
          : <Unavailable key={l} note="no entries" style={{ display: 'inline-block', minWidth: '30px', padding: '5px 0', textAlign: 'center', border: '1px dashed transparent' }}>{l}</Unavailable>)}
      </nav>

      <DirectoryFilter />

      <div id="directory-list">
        {letters.filter((l) => groups.has(l)).map((l) => (
          <section key={l} id={`letter-${l === '#' ? 'other' : l}`} data-letter={l} style={{ marginBottom: '22px', scrollMarginTop: '16px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '22px', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, padding: '0 0 4px', margin: '0 0 6px' }}>{l}</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {groups.get(l)!.map((e) => (
                <li key={`${e.name}|${e.href}`} data-entry={`${e.name} ${e.desc}`.toLowerCase()} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '9px 0' }}>
                  <Link href={e.href} style={{ fontSize: '17px', fontWeight: 'bold', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>{e.name}</Link>
                  {e.desc && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '3px 0 0', color: INK, maxWidth: '52em' }}>{e.desc}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </OpenGovShell>
  );
}
