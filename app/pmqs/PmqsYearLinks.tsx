// "By year" on /pmqs (Cowork ENTRY 367 item 3, owner approved): plain links to every year page, /pmqs/year/<yyyy>, newest
// first, so every session is one click from an indexable page (the list pages past the first and the filters are
// noindex, follow). The years 1945 to 1960 have days of questions to the Prime Minister, not sessions. Folded on phones
// and tablets (NoJsFold): open, the 80 and more years made /pmqs 2,759px tall at 375px, over the 2,500px limit.
import Link from 'next/link';
import { NoJsFold } from '../components/NoJsPager';
import { pmqsYears } from '@/lib/pmqs-years';
import { pmqsYearHref } from '@/lib/year-pages';

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

export default async function PmqsYearLinks() {
  const { years } = await pmqsYears();
  if (!years.length) return null;
  return (
    <div style={{ margin: '0 0 32px' }}>
    <NoJsFold id="pmqs-years-f" always tablets label={`By year, ${years[0]} to ${years[years.length - 1]}`}>
    <nav aria-label="Prime Minister's Questions by year" style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '8px 0 0', lineHeight: 1.9 }}>
      By year:{' '}
      {[...years].reverse().map((y, i) => (
        <span key={y}>
          {i > 0 && ' · '}
          <Link href={pmqsYearHref(y)} prefetch={false} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{y}</Link>
        </span>
      ))}
    </nav>
    </NoJsFold>
    </div>
  );
}
