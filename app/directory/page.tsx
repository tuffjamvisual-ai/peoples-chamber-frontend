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
import PhoneMore from '../components/PhoneMore';
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

// Phones (under 640px): each entry's name is a 44px row, so the padding around it comes in; letters with no entries line
// up with the 44px letters. Each letter is folded closed until its heading or its letter in the A to Z bar is tapped
// (owner, 4 Nov 2026; DirectoryFilter.tsx), with every entry still in the page; without JavaScript all of them show.
const DIRECTORY_PHONE_CSS = `.dir-h-btn { display: none; }
@media (max-width: 639.98px) {
  .dir-letters { align-items: center; }
  .dir-entry { padding: 0 0 9px !important; }
  .dir-entry p { margin: 0 !important; }
  .dir-h-wide { display: none; }
  .dir-h-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 0; font: inherit; color: inherit; background: none; border: 0; text-align: left; cursor: pointer; }
  .dir-h-btn[aria-expanded="true"] .dir-mark { transform: rotate(180deg); }
  .dir-section { margin-bottom: 8px !important; }
  .dir-section h2 { padding: 0 !important; }
  #directory-list:not(.pm-all) .dir-section:not(.dir-open) > :not(h2) { display: none !important; }
}`;
const DIRECTORY_NOSCRIPT_CSS = 'html #directory-list:not(.pm-all) .dir-section:not(.dir-open) > ul { display: block !important; }';

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

      <style dangerouslySetInnerHTML={{ __html: DIRECTORY_PHONE_CSS }} />
      <noscript><style dangerouslySetInnerHTML={{ __html: DIRECTORY_NOSCRIPT_CSS }} /></noscript>
      <nav aria-label="Jump to a letter" className="dir-letters" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '0 0 16px', fontFamily: MONO, fontSize: '16px' }}>
        {letters.map((l) => groups.has(l)
          ? <a key={l} href={`#letter-${l === '#' ? 'other' : l}`} data-letter-link={l} className="no-hover-scale" style={{ display: 'inline-block', minWidth: '30px', padding: '5px 0', textAlign: 'center', color: ACCENT, border: `1px solid ${HAIRLINE}`, textDecoration: 'none', fontWeight: 'bold' }}>{l}</a>
          : <Unavailable key={l} note="no entries" style={{ display: 'inline-block', minWidth: '30px', padding: '5px 0', textAlign: 'center', border: '1px dashed transparent' }}>{l}</Unavailable>)}
      </nav>

      <DirectoryFilter />

      <div id="directory-list">
        {letters.filter((l) => groups.has(l)).map((l) => (
          <section key={l} id={`letter-${l === '#' ? 'other' : l}`} data-letter={l} className="dir-section" style={{ marginBottom: '22px', scrollMarginTop: '16px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '22px', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, padding: '0 0 4px', margin: '0 0 6px' }}>
              <span className="dir-h-wide">{l}</span>
              <button type="button" className="dir-h-btn" data-letter-toggle={l} aria-expanded="false" aria-label={`${l}, ${groups.get(l)!.length} ${groups.get(l)!.length === 1 ? 'entry' : 'entries'}`}>
                <span>{l}</span>
                <span className="dir-mark" aria-hidden="true">▾</span>
              </button>
            </h2>
            <ul data-own-more style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {groups.get(l)!.map((e) => (
                <li key={`${e.name}|${e.href}`} className="dir-entry" data-entry={`${e.name} ${e.desc}`.toLowerCase()} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '9px 0' }}>
                  <Link href={e.href} style={{ fontSize: '17px', fontWeight: 'bold', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>{e.name}</Link>
                  {e.desc && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '3px 0 0', color: INK, maxWidth: '52em' }}>{e.desc}</p>}
                </li>
              ))}
            </ul>
            <PhoneMore selector={`#directory-list:not(.pm-all) section[data-letter="${l}"] > ul`} total={groups.get(l)!.length} />
          </section>
        ))}
      </div>
    </OpenGovShell>
  );
}
