import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import EdmYearLinks from '../../EdmYearLinks';
import { edmMonthHref, edmYearHref, edmYearMonths, edmYears } from '@/lib/edm-archive';
import { monthName } from '@/lib/year-pages';

// /edms/year/<yyyy> (owner approved 23 Nov 2026, Cowork ENTRY 536 item 1): the months of one year that have early day
// motions, each a link to its month page, where every motion is a plain link. Indexable, canonical to itself. A year with
// no motions, or not a four digit year, is a 404. Static: rebuilt only when the EDM tag is refreshed (the morning sync) or
// on a deploy, from the one cached list of motions (no extra database reads).
export const revalidate = false;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

type Params = { year: string };

async function yearFor(params: Promise<Params>) {
  const raw = (await params).year;
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  const months = await edmYearMonths(year);
  return months.length ? { year, months } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const y = await yearFor(params);
  if (!y) notFound();
  return {
    title: `Early day motions tabled in ${y.year}`,
    description: `Every early day motion tabled in the House of Commons in ${y.year}, month by month; open a month to see each motion.`,
    alternates: { canonical: edmYearHref(y.year) },
  };
}

export default async function EdmYearPage({ params }: { params: Promise<Params> }) {
  const y = await yearFor(params);
  if (!y) notFound();
  const { year, months } = y;
  const years = await edmYears();
  const total = months.reduce((s, m) => s + m.count, 0);
  return (
    <OpenGovShell pageStamp="Early day motions">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Early day motions', path: '/edms' }, { name: String(year), path: edmYearHref(year) }])} />
      <BackLink fallbackHref="/edms" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>Early day motions tabled in {year}</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 12px', maxWidth: '720px', lineHeight: 1.6 }}>
        {total.toLocaleString('en-GB')} {total === 1 ? 'motion' : 'motions'} tabled in the House of Commons in {year}. Open a month to see every motion.{' '}
        <Link href="/edms" style={{ color: ACCENT, textDecoration: 'underline', textUnderlineOffset: '3px' }}>All early day motions</Link>
      </p>
      <ul aria-label={`Months of ${year}`} style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, maxWidth: '720px' }}>
        {[...months].reverse().map((m) => (
          <li key={m.month} style={{ borderBottom: '1px solid rgba(20,16,13,0.25)' }}>
            <Link href={edmMonthHref(year, m.month)} prefetch={false} className="no-hover-scale" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px', padding: '8px 0', color: INK, textDecoration: 'none', fontSize: '17px' }}>
              <span style={{ textDecoration: 'underline' }}>{monthName(m.month)} {year}</span>
              <span style={{ fontFamily: MONO, fontSize: '15px' }}>{m.count.toLocaleString('en-GB')} {m.count === 1 ? 'motion' : 'motions'}</span>
            </Link>
          </li>
        ))}
      </ul>
      <EdmYearLinks years={years} current={year} />
    </OpenGovShell>
  );
}
