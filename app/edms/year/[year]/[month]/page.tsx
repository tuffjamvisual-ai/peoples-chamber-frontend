import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../../components/OpenGovShell';
import BackLink from '../../../../components/BackLink';
import PrevNext from '../../../../components/PrevNext';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import EdmYearLinks from '../../../EdmYearLinks';
import MoreChain from '../../../../components/MoreChain';
import { SubFold } from '../../../../components/PhoneFolds';
import { edmState } from '@/lib/edm-pages';
import { edmMonthHref, edmYearHref, edmYearMonths, edmYears, edmsInMonth } from '@/lib/edm-archive';
import { petitionDate } from '@/lib/petition-pages';
import { compareYearMonth, monthName, monthOf, neighbours, type YearMonth } from '@/lib/year-pages';

// /edms/year/<yyyy>/<mm> (owner approved 23 Nov 2026, Cowork ENTRY 536 item 1): every early day motion tabled in one month
// on one indexable page, newest first, each a plain link, in /edms's row format, with links to the months either side and
// up to the year. A bad month, or a month with no motions, is a 404. Canonical to itself. Static: rebuilt only when the
// EDM tag is refreshed (the morning sync) or on a deploy, from the one cached list of motions (no extra database reads).
export const revalidate = false;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';
const n0 = (n: number) => n.toLocaleString('en-GB');

type Params = { year: string; month: string };

async function monthFor(params: Promise<Params>) {
  const { year: rawYear, month: rawMonth } = await params;
  if (!/^\d{4}$/.test(rawYear)) return null;
  const year = Number(rawYear);
  const month = monthOf(rawMonth);
  if (month == null) return null;
  const { rows, sessionStart } = await edmsInMonth(year, month);
  return rows.length ? { year, month, rows, sessionStart, label: `${monthName(month)} ${year}` } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const m = await monthFor(params);
  if (!m) notFound();
  return {
    title: `Early day motions tabled in ${m.label}`,
    description: `Every early day motion tabled in the House of Commons in ${m.label}, newest first, with its signatures; open any motion to read it and see who signed.`,
    alternates: { canonical: edmMonthHref(m.year, m.month) },
  };
}

// The months either side that have motions, crossing into the years either side.
async function monthsAround(year: number, month: number) {
  const [years, here] = await Promise.all([edmYears(), edmYearMonths(year)]);
  const inYear = neighbours(here.map((m) => ({ year, month: m.month })), { year, month }, compareYearMonth);
  const yearsAround = neighbours(years, year, (a, b) => a - b);
  let previous: YearMonth | null = inYear.previous, next: YearMonth | null = inYear.next;
  if (!previous && yearsAround.previous != null) {
    const ms = await edmYearMonths(yearsAround.previous);
    if (ms.length) previous = { year: yearsAround.previous, month: ms[ms.length - 1].month };
  }
  if (!next && yearsAround.next != null) {
    const ms = await edmYearMonths(yearsAround.next);
    if (ms.length) next = { year: yearsAround.next, month: ms[0].month };
  }
  return { previous, next, years };
}

export default async function EdmMonthPage({ params }: { params: Promise<Params> }) {
  const m = await monthFor(params);
  if (!m) notFound();
  const { year, month, rows, sessionStart, label } = m;
  const around = await monthsAround(year, month);
  const link = (x: YearMonth | null) => (x ? { href: edmMonthHref(x.year, x.month), text: `${monthName(x.month)} ${x.year}` } : null);
  const nav = <PrevNext label="Months either side" previous={link(around.previous)} up={{ href: edmYearHref(year), text: `All of ${year}` }} next={link(around.next)} />;
  return (
    <OpenGovShell pageStamp="Early day motions">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Early day motions', path: '/edms' }, { name: String(year), path: edmYearHref(year) }, { name: label, path: edmMonthHref(year, month) }])} />
      <BackLink fallbackHref={edmYearHref(year)} label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>Early day motions tabled in {label}</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 12px', maxWidth: '720px', lineHeight: 1.6 }}>
        Every early day motion tabled in the House of Commons in {label}, newest first. Open any motion to read it and see who signed.{' '}
        <Link href={edmYearHref(year)} style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Every month of {year}</Link>
      </p>
      {nav}
      <p style={{ fontFamily: MONO, fontSize: '15px', color: INK, margin: '0 0 8px' }}>{n0(rows.length)} {rows.length === 1 ? 'motion' : 'motions'} in {label}</p>
      {/* Phones and tablets (owner, Cowork ENTRY 536, 23 Nov 2026): the list in a fold naming its count; opened, the first 25,
          then 'Show 25 more' adds 25 at a time with the count shown. Every motion stays in the page as a link (hidden, not
          removed), with or without JavaScript. From 1,024px the whole list shows as before. */}
      <SubFold label={`${n0(rows.length)} ${rows.length === 1 ? 'motion' : 'motions'} in ${label}`}>
      <MoreChain phoneOnly counted step={25} items={rows.map((r) => (
          <li key={r.id} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <Link href={`/edms/${r.id}`} prefetch={false} className="no-hover-scale" style={{ display: 'block', minHeight: '44px', padding: '12px 0', color: INK, textDecoration: 'none' }}>
              <span style={{ display: 'block', fontSize: '17px', fontWeight: 'bold', lineHeight: 1.35, textDecoration: 'underline', overflowWrap: 'anywhere' }}>{r.title}</span>
              <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, marginTop: '4px' }}>
                EDM {r.uin_with_suffix} · {petitionDate(r.date_tabled)} · {n0(r.signature_count)} {r.signature_count === 1 ? 'signature' : 'signatures'} · {edmState(r, sessionStart)}
                {r.is_prayer && <> · Prayer</>}
              </span>
            </Link>
          </li>
        ))} />
      </SubFold>
      {nav}
      <EdmYearLinks years={around.years} current={year} />
    </OpenGovShell>
  );
}
