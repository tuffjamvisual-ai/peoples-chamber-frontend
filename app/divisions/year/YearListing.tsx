import NoJsPager from '@/app/components/NoJsPager';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import Pagination from '../../components/Pagination';
import { divisionHref, divisionYears, yearCount, yearDivisions, yearHref, yearMonths, type YearDivision } from '@/lib/division-links';
import { divisionMonthHref, monthName, neighbours } from '@/lib/year-pages';
import PrevNext from '../../components/PrevNext';
import DivisionYearLinks from '../DivisionYearLinks';
import { ARCHIVE_LAST_YEAR, ARCHIVE_NOTE } from '@/lib/historic-archive';

// One page of a year's divisions (F04 batch 2, T2's f04-32-routes.md 4): /divisions/year/<yyyy> is page 1 and
// /divisions/year/<yyyy>/page/<n> the rest, each static (built on first visit, rebuilt by the division tags). A year with
// no divisions, or not four digits, is a 404; a page past the end moves to the last page (it used to show the last page's
// rows under its own address). Each page names itself canonical.
const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const PER_PAGE = 100;

export const yearOf = (raw: string) => (/^\d{4}$/.test(raw) ? Number(raw) : null);

export async function yearMetadata(rawYear: string, page: number): Promise<Metadata> {
  const year = yearOf(rawYear);
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (year == null) notFound();
  const count = await yearCount(year);
  if (count === 0) notFound();
  const last = Math.max(1, Math.ceil(count / PER_PAGE));
  const shown = Math.min(page, last);
  return {
    // Page 2 onwards says which page, so no two pages share a title (owner, 7 Nov 2026).
    title: shown > 1 ? `Commons votes in ${year}, page ${shown}` : `Commons votes in ${year}`,
    description: `Every recorded vote in the House of Commons in ${year}, newest first, with the Aye and No totals; open any vote to see how every MP voted.`,
    alternates: { canonical: yearHref(year, shown) },
  };
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

// The rows of a year or month page (shared with /divisions/year/<yyyy>/<mm>, Cowork ENTRY 367 item 3): date, number,
// title as a link, and the Aye and No totals; folded on phones by NoJsPager.
export function DivisionRowList({ id, rows }: { id: string; rows: YearDivision[] }) {
  return (
    <NoJsPager id={id} count={rows.length} rows="> li" size={25}>
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((d) => (
        <li key={`${d.date}-${d.number}`} style={{ borderBottom: `1px solid ${HAIRLINE}`, padding: '10px 0' }}>
          <span style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK }}>{fmtDate(d.date)} · Division {d.number}</span>
          <Link href={divisionHref(d.date, d.number)} style={{ fontSize: '17px', fontWeight: 'bold', lineHeight: 1.35, color: ACCENT, textDecoration: 'none' }}>{d.title}</Link>
          {d.ayes != null && d.noes != null && (
            <span style={{ display: 'block', fontFamily: MONO, fontSize: '15px', color: INK, marginTop: '2px' }}>Ayes {d.ayes.toLocaleString()}, Noes {d.noes.toLocaleString()}</span>
          )}
        </li>
      ))}
    </ol>
    </NoJsPager>
  );
}

export default async function YearListing({ rawYear, page }: { rawYear: string; page: number }) {
  const year = yearOf(rawYear);
  if (year == null) notFound();
  const { rows, total } = await yearDivisions(year, page, PER_PAGE);
  if (total === 0) notFound();
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Past the last page: a temporary redirect (307), so it does not stick once that page exists (T2 review, ENTRY 219).
  if (page > totalPages) redirect(yearHref(year, totalPages));
  const [years, months] = await Promise.all([divisionYears(), yearMonths(year)]);
  const first = (page - 1) * PER_PAGE + 1;
  // Cowork ENTRY 367 item 3: the year's months, each one page with all its divisions (indexable), and the years either side.
  const around = neighbours(years, year, (a, b) => a - b);

  return (
    <OpenGovShell pageStamp="Divisions">
      <BackLink
        fallbackHref="/divisions"
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />
      <header style={{ marginBottom: '3%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', marginBottom: '12px', transform: 'rotate(-0.3deg)', textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
          Commons votes in {year}
        </h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '720px', color: INK }}>
          Every recorded vote in the House of Commons in {year}, newest first. Open any vote to see how every MP voted.{' '}
          <Link href="/divisions" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All divisions</Link>
        </p>
        {year <= ARCHIVE_LAST_YEAR && <p style={{ fontSize: '15px', lineHeight: 1.6, maxWidth: '720px', color: INK, marginTop: '10px' }}>{ARCHIVE_NOTE}</p>}
      </header>

      <nav aria-label={`Divisions in ${year} by month`} style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 6px', lineHeight: 1.9 }}>
        By month:{' '}
        {months.map((m, i) => (
          <span key={m.month}>
            {i > 0 && ' · '}
            <Link href={divisionMonthHref(year, m.month)} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{monthName(m.month)}</Link> ({m.count.toLocaleString()})
          </span>
        ))}
      </nav>
      <PrevNext label="Years either side"
        previous={around.previous == null ? null : { href: yearHref(around.previous), text: String(around.previous) }}
        next={around.next == null ? null : { href: yearHref(around.next), text: String(around.next) }} />

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
        Showing {first.toLocaleString()} to {(first + rows.length - 1).toLocaleString()} of {total.toLocaleString()} votes in {year}
      </p>

      <DivisionRowList id="dy-rows" rows={rows} />

      <Pagination currentPage={page} totalPages={totalPages} baseUrl={`/divisions/year/${year}`} hrefFor={(p) => yearHref(year, p)} />

      <DivisionYearLinks years={years} current={year} />
    </OpenGovShell>
  );
}
