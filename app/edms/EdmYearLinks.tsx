// "Browse by year": plain links to every year of early day motions (owner approved 23 Nov 2026, Cowork ENTRY 536 item 1),
// shown on /edms and on every year and month page, so every motion is a plain link three clicks from /edms (year, month,
// motion), not only through Show more.
import Link from 'next/link';
import { edmYearHref } from '@/lib/edm-archive';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default function EdmYearLinks({ years, current }: { years: number[]; current?: number }) {
  if (!years.length) return null;
  return (
    <nav aria-label="Browse early day motions by year" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '16px 0', lineHeight: 1.9 }}>
      Browse by year:{' '}
      {[...years].reverse().map((y, i) => (
        <span key={y}>
          {i > 0 && ' · '}
          {y === current
            ? <strong aria-current="page">{y}</strong>
            : <Link href={edmYearHref(y)} prefetch={false} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{y}</Link>}
        </span>
      ))}
    </nav>
  );
}
