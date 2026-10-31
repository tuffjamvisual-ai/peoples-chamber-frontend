// "Browse by year": plain links to every year archive of Commons divisions (owner, 31 Oct 2026), shown near the top of
// /divisions and at the foot of every year page, so every division is two clicks from /divisions.
import Link from 'next/link';
import { yearHref } from '@/lib/division-links';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default function DivisionYearLinks({ years, current }: { years: number[]; current?: number }) {
  if (!years.length) return null;
  return (
    <nav aria-label="Browse divisions by year" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '20px 0', lineHeight: 1.9 }}>
      Browse by year:{' '}
      {[...years].reverse().map((y, i) => (
        <span key={y}>
          {i > 0 && ' · '}
          {y === current
            ? <strong aria-current="page">{y}</strong>
            : <Link href={yearHref(y)} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{y}</Link>}
        </span>
      ))}
    </nav>
  );
}
