import type { Metadata } from 'next';
import Link from 'next/link';
import PageSources from '@/app/components/PageSources';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { longDate, pmqsExchanges, pmqsSet } from '@/lib/pmqs';
import { answeredBy, archiveSessionOn } from '@/lib/pmqs-archive';
import MoreChain, { openingCount, PHONE_ROOM, textHeightAt375 } from '../../components/MoreChain';
// The list folds on phones only, so its opening is for the 2,500px phone length (UX5, T1-6, 11 Nov 2026).
const phoneOpening = (heights: number[]) => openingCount(heights, PHONE_ROOM);
import ArchiveSessionView from './ArchiveSessionView';

import BackLink from '@/app/components/BackLink';
// One session of Prime Minister's Questions (owner, 5 Nov 2026): rendered on first request and refreshed every six hours,
// because Hansard can correct a session for about two weeks.
export const revalidate = 21600;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';
const ACCENT = '#7a1612';
const link = { color: ACCENT, textDecoration: 'underline' };
const body = { fontSize: '16px', lineHeight: 1.7, margin: '0 0 8px', whiteSpace: 'pre-line' as const };

async function sessionFor(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return (await pmqsSet()).sessions.find((s) => s.date === date) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const session = await sessionFor(date);
  if (!session) {
    const old = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await archiveSessionOn(date) : null;
    if (!old) return { title: "Prime Minister's Questions", robots: { index: false, follow: true } };
    return {
      title: `Prime Minister's Questions, ${longDate(date)}`,
      description: `Every question and answer at Prime Minister's Questions on ${longDate(date)}${answeredBy(date) ? `, answered by ${answeredBy(date)}` : ''}, with a link to the official record.`,
      alternates: { canonical: `/pmqs/${date}` },
    };
  }
  return {
    title: `Prime Minister's Questions, ${longDate(date)}`,
    description: `Every question and answer at Prime Minister's Questions on ${longDate(date)}, answered by ${session.answeredBy.name}, with links to the official Hansard record.`,
    alternates: { canonical: `/pmqs/${date}` },
  };
}

export default async function PmqsSessionPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const session = await sessionFor(date);
  if (!session) {
    const old = /^\d{4}-\d{2}-\d{2}$/.test(date) ? await archiveSessionOn(date) : null;
    if (!old) notFound();
    return <ArchiveSessionView session={old} />;
  }
  const exchanges = await pmqsExchanges(session);
  const speakerStandsIn = exchanges.some((e) => e.speaker.length > 0);
  // Each MP linked once per session (T1-5x, owner 10 Nov 2026): the first time they appear; plain text after.
  const linkedOnce = new Set<number>([session.answeredBy.id, ...(session.opposition ? [session.opposition.id] : [])]);
  const firstMention = (id: number) => (linkedOnce.has(id) ? false : (linkedOnce.add(id), true));
  return (
    <OpenGovShell pageStamp="PMQs">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: "Prime Minister's Questions", path: '/pmqs' }, { name: longDate(date), path: `/pmqs/${date}` }])} />
      <BackLink fallbackHref="/pmqs" />
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 12px', color: INK }}>
        Prime Minister&rsquo;s Questions, {longDate(date)}
      </h1>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px', color: INK }}>
        Answered by <Link href={`/mps/${session.answeredBy.id}`} style={link}>{session.answeredBy.name}</Link>{session.deputisingFor ? `, deputising for ${session.deputisingFor}` : ''}.
      </p>
      {session.opposition && (
        <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 4px', color: INK }}>
          {session.deputisingFor ? 'For the Opposition' : 'Leader of the Opposition'}: <Link href={`/mps/${session.opposition.id}`} style={link}>{session.opposition.name}</Link>.
        </p>
      )}
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px', color: INK }}>
        {exchanges.length}{speakerStandsIn
          ? ' questions. Where the Speaker stepped in and no answer was given, the Speaker\u2019s words are shown. The Speaker\u2019s other interventions, shouted asides and points of order are left out'
          : ' questions. The Speaker\u2019s interventions, shouted asides and points of order are left out'}{session.hansardUrl ? '; the full record in Hansard is in Sources at the end of the page' : ''}.
      </p>
      <MoreChain mainAction ordered phoneOnly style={{ color: INK }} first={phoneOpening(exchanges.map((e) => 120 + textHeightAt375(e.question) + e.answers.reduce((px, a) => px + textHeightAt375(a), 0) + (e.speaker.length ? 150 : 0)))} items={exchanges.map((e) => (
          <li key={e.id} id={`q-${e.id}`} style={{ padding: '14px 0', borderTop: '1px solid rgba(20,16,13,0.25)' }}>
            <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>{firstMention(e.asker.id) ? <Link href={`/mps/${e.asker.id}`} style={link}>{e.asker.name}</Link> : e.asker.name}</p>
            <p style={body}>{e.question}</p>
            {e.answers.length > 0 && (
              <div style={{ margin: '10px 0 8px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` }}>
                <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>{session.answeredBy.name}</p>
                {e.answers.map((a, i) => <p key={i} style={body}>{a}</p>)}
              </div>
            )}
            {e.speaker.length > 0 && (
              <div style={{ margin: '10px 0 8px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` }}>
                <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>The Speaker</p>
                {e.speaker.map((w, i) => (
                  <div key={i}>
                    <p style={body}>{w.text}</p>
                    {w.url && <p style={{ fontSize: '15px', margin: '0 0 8px' }}><a data-og-row-source="" href={w.url} rel="noopener" style={link}>The Speaker&rsquo;s words in Hansard</a></p>}
                  </div>
                ))}
              </div>
            )}
            {e.hansardUrl && <p style={{ fontSize: '15px', margin: 0 }}><a data-og-row-source="" href={e.hansardUrl} rel="noopener" style={link}>Official Hansard record</a></p>}
          </li>
        ))} />
      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside. The session's full Hansard record is in this one
          Sources fold; each exchange's own Hansard record stays on its row. */}
      <PageSources sources={[session.hansardUrl && { label: 'The full session in Hansard', href: session.hansardUrl }]} />
    </OpenGovShell>
  );
}
