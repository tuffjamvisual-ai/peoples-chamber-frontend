// The A - Z Directory's list (owner, 27 Oct 2026), shared (T1-SECT, owner 12 Nov 2026: the Parliament section page "similar
// to the A - Z Directory but with 2 columns"): a jump bar of the groups in letter boxes, 'Filter this list', and each
// group as a heading with a rule under it and its entries as bold underlined links with a one line description. The
// whole list is in the page's HTML, so it works without JavaScript and search engines read it; DirectoryFilter only
// narrows what is already there, in the browser.
//
// Phones (under 768px): each entry's name is a 44px row, and each group is folded closed until its heading or its box in
// the jump bar is tapped (owner, 4 Nov 2026), with every entry still in the page; without JavaScript all of them show.
// A group can start open (the Parliament page's first group, which holds its main pages). The search sits above the
// jump bar (UX2m, 10 Nov 2026).
// /directory: one letter per group. /sections/parliament: the group names (words, so the boxes are 44px tall on phones),
// and from 768px each group's entries in 2 columns, filled down the left column then the right.
import type { ReactNode } from 'react';
import Link from 'next/link';
import { NoJsFold } from '@/app/components/NoJsPager';
import PhoneMore from '@/app/components/PhoneMore';
import DirectoryFilter from '@/app/directory/DirectoryFilter';
import { phoneUpTo, PHONE, wideFrom } from '@/lib/breakpoints';

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';

export type DirectoryEntry = { name: string; href: string; desc?: string | null; see?: string | null };
// key: the group's value for data-letter (what the jump bar and the filter use); id: its address on the page; fold: the
// id of its no JavaScript fold on phones; label: shown in its heading and its box.
export type DirectoryGroup = { key: string; id: string; fold: string; label: string; entries: DirectoryEntry[]; open?: boolean };

const phoneCss = (list: string) => `.dir-h-btn { display: none; }
@media ${phoneUpTo(767.98)} {
  .dir-letters { align-items: center; }
  .dir-entry { padding: 0 0 9px !important; }
  .dir-entry p { margin: 0 !important; }
  .dir-h-wide { display: none; }
  .dir-h-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 0; font: inherit; color: inherit; background: none; border: 0; text-align: left; cursor: pointer; }
  .dir-mark::before { content: '+'; } .dir-h-btn[aria-expanded="true"] .dir-mark::before { content: '\\2212'; }
  .dir-section { margin-bottom: 8px !important; }
  .dir-section h2 { padding: 0 !important; }
  #${list}:not(.pm-all) .dir-section:not(.dir-open) > :not(h2) { display: none !important; }
}`;
const noscriptCss = (list: string) => `html #${list}:not(.pm-all) .dir-section:not(.dir-open) > ul { display: block !important; }`;
// Group names in the jump bar (T1-SECT): a word in each box, 44px tall on phones.
const wordsCss = `.dir-words a { padding: 5px 12px !important; }
@media ${PHONE} { .dir-words a { display: inline-flex !important; align-items: center; min-height: 44px; box-sizing: border-box; } }`;
// Two columns from 768px (T1-SECT), down the left column then the right, so the reading order stays by group.
const columnsCss = (list: string) => `@media ${wideFrom(768)} { #${list} .dir-section > ul { column-count: 2; column-gap: 32px; } #${list} .dir-entry { break-inside: avoid; } }`;

export function DirectoryHeader({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <header style={{ marginBottom: '18px' }}>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ fontSize: '16px', lineHeight: 1.7, maxWidth: '46em', margin: 0 }}>{children}</p>
    </header>
  );
}

export default function DirectoryList({ listId, groups, jumpLabel, words = false, columns = false, placeholder, noMatch }: {
  listId: string; groups: DirectoryGroup[]; jumpLabel: string; words?: boolean; columns?: boolean; placeholder?: string; noMatch?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: phoneCss(listId) + (words ? '\n' + wordsCss : '') + (columns ? '\n' + columnsCss(listId) : '') }} />
      <noscript><style dangerouslySetInnerHTML={{ __html: noscriptCss(listId) }} /></noscript>
      <style>{`@media ${PHONE} { .dir-top { display: flex; flex-direction: column; } .dir-top > .dir-find { order: -1; } }`}</style>
      <div className="dir-top">
      <nav aria-label={jumpLabel} className={words ? 'dir-letters dir-words' : 'dir-letters'} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '0 0 16px', fontFamily: MONO, fontSize: '16px' }}>
        {groups.map((g) => <a key={g.key} href={`#${g.id}`} data-letter-link={g.key} className="no-hover-scale" style={{ display: 'inline-block', minWidth: '30px', padding: '5px 0', textAlign: 'center', color: ACCENT, border: `1px solid ${HAIRLINE}`, textDecoration: 'none', fontWeight: 'bold' }}>{g.label}</a>)}
      </nav>

      <div className="dir-find"><DirectoryFilter listId={listId} placeholder={placeholder} noMatch={noMatch} /></div>
      </div>

      <div id={listId}>
        {groups.map((g) => (
          <section key={g.key} id={g.id} data-letter={g.key} className={g.open ? 'dir-section dir-open' : 'dir-section'} style={{ marginBottom: '22px', scrollMarginTop: '16px' }}>
            <h2 style={{ fontFamily: MONO, fontSize: '22px', color: ACCENT, borderBottom: `2px solid ${ACCENT}`, padding: '0 0 4px', margin: '0 0 6px' }}>
              <span className="dir-h-wide">{g.label}</span>
              <button type="button" className="dir-h-btn" data-letter-toggle={g.key} aria-expanded={g.open ? 'true' : 'false'} aria-label={`${g.label}, ${g.entries.length} ${g.entries.length === 1 ? 'entry' : 'entries'}`}>
                <span>{g.label}</span>
                <span className="dir-mark" aria-hidden="true" />
              </button>
            </h2>
            <NoJsFold id={g.fold} open={g.open} label={`${g.entries.length} ${g.entries.length === 1 ? 'page' : 'pages'}`}>
            <ul data-own-more style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {g.entries.map((e) => (
                <li key={`${e.name}|${e.href}`} className="dir-entry" data-entry={`${e.name} ${e.desc ?? ''}`.toLowerCase()} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '9px 0' }}>
                  {e.see ? (
                    <>
                      <span style={{ fontSize: '17px', fontWeight: 'bold', color: INK, overflowWrap: 'anywhere' }}>{e.name}</span>
                      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '3px 0 0', color: INK, maxWidth: '52em' }}>Listed as {e.see}.</p>
                    </>
                  ) : (
                    <>
                      <Link href={e.href} style={{ fontSize: '17px', fontWeight: 'bold', color: INK, textDecoration: 'underline', textUnderlineOffset: '3px', overflowWrap: 'anywhere' }}>{e.name}</Link>
                      {e.desc && <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '3px 0 0', color: INK, maxWidth: '52em' }}>{e.desc}</p>}
                    </>
                  )}
                </li>
              ))}
            </ul>
            </NoJsFold>
            <PhoneMore selector={`#${listId}:not(.pm-all) section[data-letter="${g.key}"] > ul`} total={g.entries.length} />
          </section>
        ))}
      </div>
    </>
  );
}
