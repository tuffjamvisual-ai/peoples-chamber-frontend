import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import Pagination from '../../../components/Pagination';
import { divisionHref, divisionYears, yearCount, yearDivisions, yearHref } from '@/lib/division-links';
import DivisionYearLinks from '../../DivisionYearLinks';

// /divisions/year/<yyyy> (owner, 31 Oct 2026): every Commons division in one year, newest first, 100 a page, as plain
// links, so each division page is two clicks from /divisions (Search Console: most division pages were found only in
// the sitemap). /divisions/[slug] takes one path segment, so this two-segment route does not clash with it. A year
// with no divisions, or not a four digit year, is a 404. Each page names itself canonical.
export const revalidate = 600;

const INK = '#14100d';
const ACCENT = '#7a1612';
const HAIRLINE = 'rgba(20,16,13,0.25)';
const MONO = 'var(--font-special-elite), monospace';
const PER_PAGE = 100;

type Params = { year: string };
type SP = { page?: string | string[] };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pageOf = (sp: SP) => { const n = parseInt(one(sp.page) ?? '', 10); return Number.isFinite(n) && n >= 1 ? n : 1; };
const yearOf = (raw: string) => (/^\d{4}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }): Promise<Metadata> {
  const year = yearOf((await params).year);
  if (year == null) return { title: 'Commons votes' };
  // A page past the end shows the last page, so it names the last page as canonical.
  let page = pageOf(await searchParams);
  if (page > 1) page = Math.min(page, Math.max(1, Math.ceil((await yearCount(year)) / PER_PAGE)));
  return {
    title: `Commons votes in ${year}`,
    description: `Every recorded vote in the House of Commons in ${year}, newest first, with the Aye and No totals; open any vote to see how every MP voted.`,
    alternates: { canonical: yearHref(year, page) },
  };
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export default async function DivisionYearPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SP> }) {
  const year = yearOf((await params).year);
  if (year == null) notFound();
  let page = pageOf(await searchParams);
  let { rows, total } = await yearDivisions(year, page, PER_PAGE);
  if (total === 0) notFound();
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // A page past the end shows the last page.
  if (page > totalPages) { page = totalPages; ({ rows, total } = await yearDivisions(year, page, PER_PAGE)); }
  const years = await divisionYears();
  const first = (page - 1) * PER_PAGE + 1;

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
      </header>

      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, marginBottom: '14px' }}>
        Showing {first.toLocaleString()} to {(first + rows.length - 1).toLocaleString()} of {total.toLocaleString()} votes in {year}
      </p>

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

      <Pagination currentPage={page} totalPages={totalPages} baseUrl={`/divisions/year/${year}`} />

      <DivisionYearLinks years={years} current={year} />
    </OpenGovShell>
  );
}
