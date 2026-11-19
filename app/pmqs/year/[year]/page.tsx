import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import NoJsPager from '../../../components/NoJsPager';
import PrevNext from '../../../components/PrevNext';
import { pmqsYears } from '@/lib/pmqs-years';
import { longDateArchive } from '@/lib/pmqs-archive';
import { neighbours, pmqsYearHref } from '@/lib/year-pages';

// /pmqs/year/<yyyy> (Cowork ENTRY 367 item 3, owner approved): every session of Prime Minister's Questions in one year,
// current and archive sessions alike, each linked to /pmqs/<date>, on one indexable page (the /pmqs list pages past the
// first, and its filters, are noindex, follow). For 1945 to 1961 the days of questions to the Prime Minister, linked to
// /pmqs/1945-to-1961/<date>. PMQs met at most twice a week, so a year is about 70 sessions at most: one page per year,
// no month pages; on phones the list folds after 3 (NoJsPager). Links to the years either side that have sessions or
// days, and back to /pmqs. A year with none, or not four digits, is a 404. Each page names itself canonical.
export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy
export function generateStaticParams() { return []; }

const INK = '#14100d';
const ACCENT = '#7a1612';
const MONO = 'var(--font-special-elite), monospace';

type Params = { year: string };
const count = (n: number, one: string) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : `${one}s`}`;

async function yearFor(params: Promise<Params>) {
  const raw = (await params).year;
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  const all = await pmqsYears();
  const sessions = all.sessions.filter((s) => s.date.startsWith(raw));
  const days = all.preFixed.filter((d) => d.date.startsWith(raw));
  if (!sessions.length && !days.length) return null;
  return { year, sessions, days, years: all.years };
}

// Before fixed sessions began (July 1961) there were questions to the Prime Minister, not PMQs sessions.
const titleOf = (year: number, sessions: number) => (sessions ? `Prime Minister's Questions in ${year}` : `Questions to the Prime Minister in ${year}`);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const y = await yearFor(params);
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!y) notFound();
  return {
    title: titleOf(y.year, y.sessions.length),
    description: y.sessions.length
      ? `Every session of Prime Minister's Questions in ${y.year}, with who answered; open a session for every question and answer.`
      : `Every day in ${y.year} with questions to the Prime Minister in the Commons, before PMQs had a fixed time; open a day for every question and answer.`,
    alternates: { canonical: pmqsYearHref(y.year) },
  };
}

export default async function PmqsYearPage({ params }: { params: Promise<Params> }) {
  const y = await yearFor(params);
  if (!y) notFound();
  const { year, sessions, days, years } = y;
  const around = neighbours(years, year, (a, b) => a - b);
  const nav = (
    <PrevNext label="Years either side"
      previous={around.previous == null ? null : { href: pmqsYearHref(around.previous), text: String(around.previous) }}
      up={{ href: '/pmqs', text: "All of Prime Minister's Questions" }}
      next={around.next == null ? null : { href: pmqsYearHref(around.next), text: String(around.next) }} />
  );

  return (
    <OpenGovShell pageStamp="PMQs">
      <BackLink fallbackHref="/pmqs" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none' }} />
      <h1 style={{ fontFamily: MONO, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', color: INK }}>
        {sessions.length ? <>Prime Minister&rsquo;s Questions in {year}</> : <>Questions to the Prime Minister in {year}</>}
      </h1>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px', color: INK }}>
        {sessions.length
          ? <>{count(sessions.length, 'session')} in {year}, newest first. Open a session for every question and answer.</>
          : <>{count(days.length, 'day')} with questions to the Prime Minister in {year}, newest first. Before July 1961 there was no set time for these questions, so these are days of questions, not PMQs sessions.</>}
      </p>
      {nav}

      {sessions.length > 0 && (
        <section aria-label={`Sessions in ${year}`} style={{ color: INK, marginBottom: '24px' }}>
          <NoJsPager id="pmqs-year" count={sessions.length} rows="> li" size={25} first={3} noun={{ one: 'session', many: 'sessions' }}>
            <ul className="pa-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {sessions.map((s) => (
                <li key={s.date}>
                  <Link href={`/pmqs/${s.date}`} prefetch={false}>{longDateArchive(s.date)}</Link>
                  {s.answeredBy && <div>Answered by {s.answeredBy}</div>}
                </li>
              ))}
            </ul>
          </NoJsPager>
        </section>
      )}

      {days.length > 0 && (
        <section aria-labelledby="pmqs-year-prefixed" style={{ color: INK, marginBottom: '24px' }}>
          {sessions.length > 0 && (
            <>
              <h2 id="pmqs-year-prefixed" style={{ fontSize: '18px', fontWeight: 'bold', margin: '28px 0 10px' }}>Questions to the Prime Minister before fixed sessions</h2>
              <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' }}>{count(days.length, 'day')} in {year} before PMQs had a fixed time in July 1961. These are days of questions, not sessions.</p>
            </>
          )}
          <NoJsPager id="pmqs-year-days" count={days.length} rows="> li" size={25} first={3} noun={{ one: 'day', many: 'days' }}>
            <ul className="pa-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {days.map((d) => (
                <li key={d.date}>
                  <Link href={`/pmqs/1945-to-1961/${d.date}`} prefetch={false}>{longDateArchive(d.date)}</Link>
                  <div>{count(d.questions, 'question')}</div>
                </li>
              ))}
            </ul>
          </NoJsPager>
          <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '8px 0 0' }}>
            <Link href="/pmqs/1945-to-1961" prefetch={false} style={{ color: ACCENT, textDecoration: 'underline' }}>Notes on the questions from 1945 to 1961</Link>
          </p>
        </section>
      )}

      {nav}
    </OpenGovShell>
  );
}
