// "Browse by month": every month page of Commons divisions, linked straight from /divisions (owner approved 23 Nov 2026,
// Cowork ENTRY 536 item 4), so every division is three plain clicks from the homepage's menu (/divisions, month,
// division) instead of four through the year page. One line per year, newest first, naming only months with divisions.
// The month lists are the year pages' own cached reads (lib/division-links.ts yearMonths), so no new kind of read.
import Link from 'next/link';
import { yearMonths } from '@/lib/division-links';
import { divisionMonthHref, monthName } from '@/lib/year-pages';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default async function DivisionMonthLinks({ years }: { years: number[] }) {
  const rows = await Promise.all([...years].reverse().map(async (y) => ({ year: y, months: (await yearMonths(y)).map((m) => m.month) })));
  const shown = rows.filter((r) => r.months.length);
  if (!shown.length) return null;
  return (
    <nav aria-label="Browse divisions by month" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '20px 0', lineHeight: 1.9 }}>
      {shown.map((r) => (
        <p key={r.year} style={{ margin: '0 0 6px' }}>
          <strong>{r.year}:</strong>{' '}
          {r.months.map((m, i) => (
            <span key={m}>
              {i > 0 && ' · '}
              <Link href={divisionMonthHref(r.year, m)} prefetch={false} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{(monthName(m) ?? '').slice(0, 3)}</Link>
            </span>
          ))}
        </p>
      ))}
    </nav>
  );
}
