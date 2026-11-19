import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../../components/OpenGovShell';
import BackLink from '../../../../components/BackLink';
import PrevNext from '../../../../components/PrevNext';
import { DivisionRowList, yearOf } from '../../YearListing';
import { divisionYears, monthDivisions, yearHref, yearMonths } from '@/lib/division-links';
import { compareYearMonth, divisionMonthHref, monthName, monthOf, neighbours, type YearMonth } from '@/lib/year-pages';
import { ARCHIVE_LAST_YEAR, ARCHIVE_NOTE } from '@/lib/historic-archive';

// /divisions/year/<yyyy>/<mm> (Cowork ENTRY 367 item 3, owner approved): every Commons division in one month on one
// indexable page, newest first, in the year page's row format, with links to the months either side that have divisions
// and up to the year. Page 2 onward of a year is noindex, follow, so these pages make every division reachable from an
// indexable page (year, then month). The static 'page' folder beside this one (/divisions/year/<yyyy>/page/<n>) wins over
// this dynamic segment; the month is two digits, 01 to 12. A bad month, or a month with no divisions, is a 404. Each page
// names itself canonical. Works for the archive years (2004 to 2016) too.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

type Params = { year: string; month: string };

async function monthFor(params: Promise<Params>) {
  const { year: rawYear, month: rawMonth } = await params;
  const year = yearOf(rawYear);
  const month = monthOf(rawMonth);
  if (year == null || month == null) return null;
  const rows = await monthDivisions(year, month);
  if (!rows.length) return null;
  return { year, month, rows, label: `${monthName(month)} ${year}` };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const m = await monthFor(params);
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!m) notFound();
  return {
    title: `Commons votes in ${m.label}`,
    description: `Every recorded vote in the House of Commons in ${m.label}, newest first, with the Aye and No totals; open any vote to see how every MP voted.`,
    alternates: { canonical: divisionMonthHref(m.year, m.month) },
  };
}

// The months either side that have divisions, crossing into the years either side when this is the year's first or last.
async function monthsAround(year: number, month: number) {
  const [years, here] = await Promise.all([divisionYears(), yearMonths(year)]);
  const inYear = neighbours(here.map((m) => ({ year, month: m.month })), { year, month }, compareYearMonth);
  const yearsAround = neighbours(years, year, (a, b) => a - b);
  let previous: YearMonth | null = inYear.previous, next: YearMonth | null = inYear.next;
  if (!previous && yearsAround.previous != null) {
    const ms = await yearMonths(yearsAround.previous);
    if (ms.length) previous = { year: yearsAround.previous, month: ms[ms.length - 1].month };
  }
  if (!next && yearsAround.next != null) {
    const ms = await yearMonths(yearsAround.next);
    if (ms.length) next = { year: yearsAround.next, month: ms[0].month };
  }
  return { previous, next };
}

export default async function DivisionMonthPage({ params }: { params: Promise<Params> }) {
  const m = await monthFor(params);
  if (!m) notFound();
  const { year, month, rows, label } = m;
  const around = await monthsAround(year, month);
  const link = (ym: YearMonth | null) => (ym ? { href: divisionMonthHref(ym.year, ym.month), text: `${monthName(ym.month)} ${ym.year}` } : null);
  const nav = <PrevNext label="Months either side" previous={link(around.previous)} up={{ href: yearHref(year), text: `All of ${year}` }} next={link(around.next)} />;

  return (
    <OpenGovShell pageStamp="Divisions">
      <BackLink
        fallbackHref={yearHref(year)}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '3%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Commons votes in {label}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Every recorded vote in the House of Commons in {label}, newest first. Open any vote to see how every MP voted.{' '}
          <Link href={yearHref(year)} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Every vote in {year}</Link>
        </p>
        {year <= ARCHIVE_LAST_YEAR && <p style={{ fontSize: '15px', lineHeight: 1.6, maxWidth: '720px', color: INK, marginTop: '10px' }}>{ARCHIVE_NOTE}</p>}
      </header>

      {nav}
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
        {rows.length.toLocaleString()} {rows.length === 1 ? 'vote' : 'votes'} in {label}
      </p>

      <DivisionRowList id="dm-rows" rows={rows} />

      {nav}
    </OpenGovShell>
  );
}
