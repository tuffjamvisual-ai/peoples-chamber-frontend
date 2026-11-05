import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { longDate, pmqsExchanges, pmqsSet } from '@/lib/pmqs';

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
  if (!session) return { title: "Prime Minister's Questions", robots: { index: false, follow: true } };
  return {
    title: `Prime Minister's Questions, ${longDate(date)}`,
    description: `Every question and answer at Prime Minister's Questions on ${longDate(date)}, answered by ${session.answeredBy.name}, with links to the official Hansard record.`,
    alternates: { canonical: `/pmqs/${date}` },
  };
}

export default async function PmqsSessionPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const session = await sessionFor(date);
  if (!session) notFound();
  const exchanges = await pmqsExchanges(session);
  return (
    <OpenGovShell pageStamp="PMQs">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: "Prime Minister's Questions", path: '/pmqs' }, { name: longDate(date), path: `/pmqs/${date}` }])} />
      <Link href="/pmqs" className="no-hover-scale" style={{ display: 'inline-block', marginBottom: '14px', color: INK, textDecoration: 'none' }}>← All sessions</Link>
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
        {exchanges.length} questions. The Speaker&rsquo;s interventions, shouted asides and points of order are left out{session.hansardUrl ? <>: <a href={session.hansardUrl} rel="noopener" style={link}>read the full record in Hansard</a></> : ''}.
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, color: INK }}>
        {exchanges.map((e) => (
          <li key={e.id} id={`q-${e.id}`} style={{ padding: '14px 0', borderTop: '1px solid rgba(20,16,13,0.25)' }}>
            <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}><Link href={`/mps/${e.asker.id}`} style={link}>{e.asker.name}</Link></p>
            <p style={body}>{e.question}</p>
            {e.answers.length > 0 && (
              <div style={{ margin: '10px 0 8px', paddingLeft: '12px', borderLeft: `3px solid ${ACCENT}` }}>
                <p style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>{session.answeredBy.name}</p>
                {e.answers.map((a, i) => <p key={i} style={body}>{a}</p>)}
              </div>
            )}
            {e.hansardUrl && <p style={{ fontSize: '15px', margin: 0 }}><a href={e.hansardUrl} rel="noopener" style={link}>Official Hansard record</a></p>}
          </li>
        ))}
      </ol>
    </OpenGovShell>
  );
}
