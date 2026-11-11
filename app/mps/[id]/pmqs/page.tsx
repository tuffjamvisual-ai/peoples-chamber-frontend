import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { displayMpName } from '@/lib/mp-name';
import { longDate, pmqsSet } from '@/lib/pmqs';
import { archiveRole, longDateArchive, memberArchive, type MemberContribution } from '@/lib/pmqs-archive';
import { lookupMember, memberName } from '@/lib/former-mps';
import { idsFor } from '@/lib/historic-archive';
import { failSoft } from '@/lib/fail-soft';
import NoJsPager, { NoJsPagerLinks, njpItem, pagesByHeight } from '../../../components/NoJsPager';

import BackLink from '@/app/components/BackLink';
// Every question an MP has asked at Prime Minister's Questions since July 2024 (owner, 5 Nov 2026), newest first, then
// their questions and answers in the archive, 1961 to 2024, by year. A former MP's page too (owner, 6 Nov 2026): the name comes from Parliament's record when they
// are not in the mps table. On a day someone answered the session their words are answers, listed apart by session rather than as questions they asked.
// Not in the sitemap, like /mps/[id]/questions.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';
const ACCENT = '#7a1612';

const getMpName = cache(async (memberId: number): Promise<string | null> => {
  const { data, error } = await supabase.from('mps').select('display_name, name').eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`/mps/[id]/pmqs mps: ${error.message}`);
  if (data) return displayMpName((data.display_name || data.name || '').trim()) || null;
  const member = await lookupMember(memberId);
  return member.kind === 'former_mp' ? member.mp.name : memberName(memberId);
});
// No profile of their own, so the way back is Parliament's page for them.
const hasProfile = cache(async (memberId: number): Promise<boolean> => {
  const { data, error } = await supabase.from('mps').select('member_id').eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`/mps/[id]/pmqs mps: ${error.message}`);
  return !!data || (await lookupMember(memberId)).kind !== 'unknown';
});

type AnswerDay = { date: string; answers: number };
const byYear = <T extends { date: string }>(rows: T[]) => {
  const years: { year: string; rows: T[] }[] = [];
  for (const r of rows) {
    const year = r.date.slice(0, 4);
    const last = years[years.length - 1];
    if (last?.year === year) last.rows.push(r);
    else years.push({ year, rows: [r] });
  }
  return years;
};
// About how tall a row stands on a phone, so a screen of long rows stays short.
const rowHeight = (text: string) => (Math.ceil(text.length / 38) + 1) * 24 + 21;

function AnswerSection({ id, title, days }: { id: string; title: string; days: AnswerDay[] }) {
  if (days.length === 0) return null;
  const total = days.reduce((n, d) => n + d.answers, 0);
  return (
    <section data-main-action id={id} aria-labelledby={`${id}-head`} style={{ color: INK, marginTop: '32px' }}>
      <h2 id={`${id}-head`} style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 8px' }}>{title} ({total.toLocaleString('en-GB')})</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>In {days.length.toLocaleString('en-GB')} {days.length === 1 ? 'session' : 'sessions'}, by year. Open a session to read the answers.</p>
      {byYear(days).map((y) => (
        <details key={y.year} className="pa-fold">
          <summary>{y.year}: {y.rows.length.toLocaleString('en-GB')} {y.rows.length === 1 ? 'session' : 'sessions'}</summary>
          <NoJsPager id={`${id}-${y.year}`} always count={y.rows.length} rows="> li" size={25}>
            <ul className="pa-list" data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {y.rows.map((d) => <li key={d.date}><a href={`/pmqs/${d.date}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>{longDateArchive(d.date)}</a>: {d.answers.toLocaleString('en-GB')} {d.answers === 1 ? 'answer' : 'answers'}</li>)}
            </ul>
          </NoJsPager>
        </details>
      ))}
    </section>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const memberId = Number(id);
  const name = Number.isInteger(memberId) ? await getMpName(memberId) : null;
  if (!name) return { title: "Questions at Prime Minister's Questions", robots: { index: false, follow: true } };
  return {
    title: titleWithin(`${name}: questions at PMQs`),
    description: `${name} at Prime Minister's Questions: every question since July 2024, and the archive from 1961 to 2024.`,
    alternates: { canonical: `/mps/${memberId}/pmqs` },
  };
}

export default async function MpPmqsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  // T1-DF (b): a failed read of the 1961 to 2024 archive leaves that section out (logged, rendered again in 10 minutes)
  // rather than taking the whole page down (/mps/5068/pmqs, 10 Nov 2026).
  const [name, set, archiveRead, profile] = await Promise.all([getMpName(memberId), pmqsSet(), failSoft(`/mps/${memberId}/pmqs archive`, memberArchive(memberId), [] as MemberContribution[]), hasProfile(memberId)]);
  const archive = archiveRead.value;
  const ids = idsFor(memberId);
  const questions = ids.flatMap((i) => set.byMember[i] ?? []);
  const answersOn = (role: 'prime_minister' | 'standing_in'): AnswerDay[] => {
    const days = new Map<string, number>();
    for (const r of archive) if (archiveRole(ids, r.date) === role) days.set(r.date, (days.get(r.date) ?? 0) + 1);
    for (const x of set.sessions) if (ids.includes(x.answeredBy.id) && !!x.deputisingFor === (role === 'standing_in')) days.set(x.date, x.questions);
    return [...days.entries()].map(([date, answers]) => ({ date, answers })).sort((p, q) => q.date.localeCompare(p.date));
  };
  const asPm = answersOn('prime_minister'), standingIn = answersOn('standing_in');
  const answered = asPm.length > 0 || standingIn.length > 0;
  const askedInArchive = archive.filter((r) => archiveRole(ids, r.date) === 'asked');
  // With the archive unread and nothing else to show, the page may still exist: the error page (not cached), not a 404.
  if (name && archiveRead.failed && questions.length === 0 && !answered) throw new Error(`/mps/${memberId}/pmqs: the archive could not be read and there is nothing else to show`);
  if (!name || (questions.length === 0 && archive.length === 0 && !answered)) notFound();
  const archiveYears = byYear<MemberContribution>(askedInArchive);
  return (
    <OpenGovShell>
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'MPs', path: '/mps' }, ...(profile ? [{ name, path: `/mps/${memberId}` }] : []), { name: 'Questions at PMQs', path: `/mps/${memberId}/pmqs` }])} />
      <BackLink fallbackHref={profile ? `/mps/${memberId}` : '/pmqs'} />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', margin: '0 0 8px', color: INK }}>{answered ? `${name} at PMQs` : `Questions at PMQs by ${name}`}</h1>
      <AnswerSection id="answers-pm" title="Answers as Prime Minister" days={asPm} />
      <AnswerSection id="answers-standing-in" title="Answers standing in for the Prime Minister" days={standingIn} />
      <div id="asked">
      {answered && (questions.length > 0 || askedInArchive.length > 0) && <h2 style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '32px 0 8px', color: INK }}>Questions asked at PMQs ({(questions.length + askedInArchive.length).toLocaleString('en-GB')})</h2>}
      {questions.length > 0 && (<>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px', color: INK }}>
        {questions.length} {questions.length === 1 ? 'question' : 'questions'} at <Link href="/pmqs" style={{ color: ACCENT, textDecoration: 'underline' }}>Prime Minister&rsquo;s Questions</Link> since July 2024, newest first, from Hansard.
      </p>
      <NoJsPager id="pmqs-asked" always count={questions.length} rows="> li" sizes={pagesByHeight(questions.map((q) => rowHeight(q.text)), 4000, 25)}>
        <ul data-own-more="" data-main-action style={{ listStyle: 'none', margin: 0, padding: 0, color: INK }}>
          {questions.map((q) => (
          <li key={q.extId} style={{ padding: '10px 0', borderTop: '1px solid rgba(20,16,13,0.25)', fontSize: '15px', lineHeight: 1.6 }}>
            <Link href={`/pmqs/${q.date}#q-${q.extId}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>{longDate(q.date)}</Link>
            <div>{q.text}{q.text.length >= 160 ? '…' : ''}</div>
          </li>
          ))}
        </ul>
      </NoJsPager>
      </>)}
      {askedInArchive.length > 0 && (
        <section data-main-action aria-labelledby="mp-pmqs-archive" style={{ color: INK, marginTop: questions.length > 0 ? '32px' : 0 }}>
          <h2 id="mp-pmqs-archive" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 'bold', margin: '0 0 8px' }}>In the archive, 1961 to 2024</h2>
          <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }}>
            {askedInArchive.length.toLocaleString('en-GB')} {answered ? (askedInArchive.length === 1 ? 'question' : 'questions') : (askedInArchive.length === 1 ? 'question or answer' : 'questions and answers')} at {questions.length > 0 ? 'Prime Minister\u2019s Questions' : <Link href="/pmqs" style={{ color: ACCENT, textDecoration: 'underline' }}>Prime Minister&rsquo;s Questions</Link>} before July 2024, by year.
          </p>
          {/* UX5 (T1-6, 11 Nov 2026): on phones the first five years, then "Show all"; from 640px up, as before. */}
          <NoJsPager id="pa-years" count={archiveYears.length} size={archiveYears.length} first={5} />
          {archiveYears.map((y) => (
            <details key={y.year} className={`pa-fold ${njpItem('pa-years')}`}>
              <summary>{y.year}: {y.rows.length.toLocaleString('en-GB')}</summary>
              <NoJsPager id={`pa-${y.year}`} always count={y.rows.length} rows="> li" sizes={pagesByHeight(y.rows.map((r) => rowHeight(r.text)), 4000, 25)}>
                <ul className="pa-list" data-own-more="" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {y.rows.map((r) => (
                    <li key={`${r.date}-${r.order}`}>
                      <a href={`/pmqs/${r.date}#r-${r.order}`} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>{longDateArchive(r.date)}</a>
                      <div style={{ whiteSpace: 'pre-line' }}>{r.text}</div>
                    </li>
                  ))}
                </ul>
              </NoJsPager>
            </details>
          ))}
          <NoJsPagerLinks id="pa-years" count={archiveYears.length} size={archiveYears.length} first={5} />
        </section>
      )}
      </div>
    </OpenGovShell>
  );
}
