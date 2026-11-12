import AboutThisData from '@/app/components/AboutThisData';
import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import NoJsPager, { NoJsFold, NoJsPagerLinks, njpItem, pagesByHeight } from '../../../components/NoJsPager';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { longDateArchive } from '@/lib/pmqs-archive';
import { preFixedDay, preFixedSummary, type PreFixedExchange, type PreFixedRow } from '@/lib/pm-questions-1945-1961';
import PreFixedNotes, { ExperimentNote, UNCONFIRMED_NOTE } from '../PreFixedNotes';

import BackLink from '@/app/components/BackLink';
// One day's questions to the Prime Minister before the fixed time (owner, 6 Nov 2026): a day, never a session. Rendered on first request; the record does not change.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const link = { color: ACCENT, textDecoration: 'underline' };
const body = { fontSize: '16px', lineHeight: 1.7, margin: '0 0 8px', whiteSpace: 'pre-line' as const };
const OPENS = 2000;   // a longer contribution shows its opening, then a fold, on phones

const heading = (date: string, n: number) => `${longDateArchive(date)}: ${n} ${n === 1 ? 'question' : 'questions'} to the Prime Minister`;
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

// The opening of a long contribution, ending at a line break where there is one, else a full stop. No words change.
function opening(text: string): [string, string | null] {
  if (text.length <= OPENS) return [text, null];
  const head = text.slice(0, OPENS);
  const at = head.lastIndexOf('\n') > OPENS / 2 ? head.lastIndexOf('\n') : head.lastIndexOf('. ') + 1;
  const cut = at > 0 ? at : OPENS;
  return [text.slice(0, cut).trimEnd(), text.slice(cut).trimStart()];
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const day = validDate(date) ? await preFixedDay(date) : null;
  // An address with no record: a real 404, noindex and 'Page not found' (T1-DONOR404, owner approved 12 Nov 2026).
  if (!day) notFound();
  return {
    title: { absolute: heading(date, day.questions) },
    description: `Every question to the Prime Minister answered aloud on ${longDateArchive(date)}, and what was said after each, as printed in Historic Hansard.`,
    alternates: { canonical: `/pmqs/1945-to-1961/${date}` },
  };
}

// The opengovt profile is linked once per day (T1-5x, owner 10 Nov 2026): `profile` is false after the first.
function Speaker({ row, profile = true }: { row: PreFixedRow; profile?: boolean }) {
  if (!row.speaker_as_printed && !row.question_number) return null;
  return (
    <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>
      {row.question_number && <>{row.question_number} </>}
      {row.speaker_as_printed && (row.person_url
        ? <a data-og-row-source="" href={row.person_url} rel="noopener" className="og-tap" style={link}>{row.speaker_as_printed}</a>
        : row.speaker_as_printed)}
      {profile && row.member_id != null && <> <Link href={`/mps/${row.member_id}`} prefetch={false} className="og-tap" style={{ ...link, fontWeight: 'normal' }}>opengovt profile</Link></>}
    </p>
  );
}

function ExchangeHead({ e }: { e: PreFixedExchange }) {
  return (
    <div style={{ borderTop: '1px solid rgba(20,16,13,0.25)', paddingTop: '14px', marginBottom: '10px' }}>
      {e.experiment && <p style={{ fontSize: '15px', fontWeight: 'bold', color: ACCENT, margin: '0 0 4px' }}>The 3.15 p.m. experiment</p>}
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 4px', overflowWrap: 'anywhere' }}>{e.section}</h2>
      {e.privateNotice && <p style={{ fontSize: '15px', margin: '0 0 4px' }}>By private notice</p>}
      {e.url && <p style={{ fontSize: '15px', margin: '0 0 4px' }}><a data-og-row-source="" href={e.url} rel="noopener" className="og-tap" style={link}>{e.reference ?? 'Read this in Historic Hansard'}</a></p>}
    </div>
  );
}

export default async function PreFixedDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const day = validDate(date) ? await preFixedDay(date) : null;
  if (!day) notFound();
  const { answeredBySomeoneElse } = await preFixedSummary();
  const title = heading(date, day.questions);
  // Each contribution is one row of the list, the exchange's heading sitting on its first, so a long day is cut into screens by height.
  const items = day.exchanges.flatMap((e) => e.rows.map((row, i) => ({ e, row, first: i === 0 })));
  // Where each member's opengovt profile is linked: their first row of the day only (T1-5x).
  const profileFirst = new Map<number, number>();
  items.forEach(({ row }, i) => { if (row.member_id != null && !profileFirst.has(row.member_id)) profileFirst.set(row.member_id, i); });
  const screens = pagesByHeight(items.map(({ row, first }) => Math.min(row.text.length, OPENS) * 0.75 + 110 + (first ? 190 : 0)), 4000, 25);
  return (
    <OpenGovShell pageStamp="PMQs">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: "Prime Minister's Questions", path: '/pmqs' }, { name: '1945 to 1961', path: '/pmqs/1945-to-1961' }, { name: longDateArchive(date), path: `/pmqs/1945-to-1961/${date}` }])} />
      <BackLink fallbackHref="/pmqs#before-fixed-pmqs" />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', color: INK }}>{title}</h1>
      <div style={{ color: INK }}>
        <div>
          {/* On phones the first screen at most, never more than before (MP2f-9). */}
          {/* UX5 (T1-6, 11 Nov 2026): on phones the first three questions, then "Show all" (five before). */}
          <NoJsPager id="pq-day" count={items.length} sizes={screens} first={Math.min(3, screens[0] ?? 3)} />
          {items.map(({ e, row, first }, i) => {
            const profile = row.member_id != null && profileFirst.get(row.member_id) === i;
            const [start, rest] = opening(row.text);
            const answer = row.kind !== 'question' && !!row.speaker_as_printed;
            return (
              <Fragment key={`${e.id}-${row.row_order}`}>
                <div className={njpItem('pq-day')} data-main-action={i === 0 ? '' : undefined} style={{ marginBottom: '14px' }}>
                  {first && <ExchangeHead e={e} />}
                  <div style={answer ? { paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` } : undefined}>
                    <Speaker row={row} profile={profile} />
                    <p style={body}>{start}</p>
                    {rest && <NoJsFold id={`pq-row-${i}`} always label="Continue reading"><p style={body}>{rest}</p></NoJsFold>}
                  </div>
                </div>
              </Fragment>
            );
          })}
          <NoJsPagerLinks id="pq-day" count={items.length} sizes={screens} first={Math.min(3, screens[0] ?? 3)} />
        </div>
        {/* T1-5x S7 (owner, 10 Nov 2026): the notes, and the note on an unconfirmed date, in one closed About this data. */}
        <AboutThisData>
          {day.unconfirmed && <p>{UNCONFIRMED_NOTE}</p>}
          {day.exchanges.some((e) => e.experiment) && <ExperimentNote />}
          <PreFixedNotes answeredBySomeoneElse={answeredBySomeoneElse} />
        </AboutThisData>
      </div>
    </OpenGovShell>
  );
}
