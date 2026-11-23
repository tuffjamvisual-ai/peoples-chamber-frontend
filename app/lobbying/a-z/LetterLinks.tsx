// The A to Z letters for the lobbying list (Cowork ENTRY 536 item 2): each letter with organisations is a link.
import Link from 'next/link';
import { LETTERS, lobbyingLetterHref } from '@/lib/lobbying-az';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default function LetterLinks({ counts, current }: { counts: Map<string, number>; current?: string }) {
  return (
    <nav aria-label="Lobbying organisations by letter" style={{ fontFamily: MONO, fontSize: '17px', color: INK, margin: '16px 0', display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
      {LETTERS.filter((l) => counts.get(l)).map((l) => (
        l === current
          ? <strong key={l} aria-current="page" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px' }}>{l.toUpperCase()}</strong>
          : <Link key={l} href={lobbyingLetterHref(l)} prefetch={false} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px', color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{l.toUpperCase()}</Link>
      ))}
    </nav>
  );
}
