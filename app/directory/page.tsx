// /directory: everything on Open Govt, A to Z (owner, 27 Oct 2026). The whole list is in the page's HTML, so it works
// without JavaScript and search engines read it; DirectoryFilter only narrows what is already there, in the browser.
// The entries come from lib/directory.ts; scripts/checks/directory-coverage.ts lists any reader facing page missing.
import type { Metadata } from 'next';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import { DIRECTORY, LETTERS, directoryLetter } from '@/lib/directory';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import DirectoryList, { DirectoryHeader, type DirectoryGroup } from '../components/DirectoryList';

export const metadata: Metadata = {
  title: { absolute: 'Directory: everything on opengovt, A to Z' },
  description: PAGE_DESCRIPTIONS['/directory'],
  alternates: { canonical: '/directory' },
};

const INK = '#14100d';

// The list itself (letters, 'Filter this list', the entries, the phone folds) is app/components/DirectoryList.tsx, shared
// with the Parliament section page since T1-SECT (12 Nov 2026).
export default function DirectoryPage() {
  const groups = new Map<string, typeof DIRECTORY>();
  for (const e of DIRECTORY) {
    const l = directoryLetter(e.name);
    groups.set(l, [...(groups.get(l) ?? []), e]);
  }
  const letters = [...LETTERS, ...(groups.has('#') ? ['#'] : [])];
  // Letters with no entries are not shown (T1-5x, owner 10 Nov 2026).
  const list: DirectoryGroup[] = letters.filter((l) => groups.has(l)).map((l) => {
    const slug = l === '#' ? 'other' : l;
    return { key: l, id: `letter-${slug}`, fold: `df-${slug}`, label: l, entries: groups.get(l)! };
  });

  return (
    <OpenGovShell>
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <DirectoryHeader title="Directory">
        Everything on opengovt, A to Z: every section and list on the site, {DIRECTORY.length.toLocaleString('en-GB')} entries. Some pages are also listed under another name, which points to the one that links.
      </DirectoryHeader>
      <DirectoryList listId="directory-list" groups={list} jumpLabel="Jump to a letter" />
    </OpenGovShell>
  );
}
