import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import Link from 'next/link';
import PageSources from '@/app/components/PageSources';
import { notFound, redirect } from 'next/navigation';
import OpenGovShell from '../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { answerHtml, splitAnswer } from '@/lib/answer-html';
import { namedTitle } from '@/lib/seo-title';
import { metaDescription } from '@/lib/meta-description';
import { departmentById } from '@/lib/question-departments';
import { getQuestion, questionPeople } from '@/lib/question-pages';
import { petitionDate } from '@/lib/petition-pages';

import BackLink from '@/app/components/BackLink';
// One written question (owner, backlog item 15c, 6 Nov 2026): the question and answer as published, who asked and who answered, dates and
// days taken, attachments, and for a corrected answer its date with the original in a fold. Addressed by Parliament's id, because 45,904
// question numbers repeat; /questions/<number> goes to the list of questions with that number. Kept for a day, refreshed by the sync.
export const revalidate = 86400;
export function generateStaticParams() { return []; }

const INK = '#14100d';
const LINE = '1px solid rgba(20,16,13,0.25)';
const h2: CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: INK, margin: '28px 0 8px' };
const para: CSSProperties = { fontSize: '16px', lineHeight: 1.65, color: INK, margin: '0 0 12px', whiteSpace: 'pre-line', overflowWrap: 'anywhere' };
const link: CSSProperties = { color: INK, textDecoration: 'underline', overflowWrap: 'anywhere' };
const blockLink: CSSProperties = { ...link, display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontSize: '16px' };
const load = cache(async (raw: string) => (/^\d{6,10}$/.test(raw) ? getQuestion(Number(raw)) : null));
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const fileSize = (b?: number) => (b ? (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : '');

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const q = await load((await params).id);
  if (!q) return { title: 'Written question', robots: { index: false, follow: true } };
  const heading = q.heading || `Written question ${q.uin}`;
  return {
    // Natural breaks only, never mid phrase (owner, 6 Nov 2026).
    title: namedTitle(heading, (n) => [`Written question: ${n}`, n]),
    description: metaDescription(`${q.question_text ?? heading}`),
    alternates: { canonical: `/questions/${q.id}` },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await load(id);
  // Numbers are shorter than Parliament's ids and repeat, so a number goes to the list of questions with it.
  if (!q && /^(HL)?\d{1,5}$/i.test(id)) redirect(`/questions?uin=${encodeURIComponent(id)}`);
  if (!q) notFound();
  const people = new Map((await questionPeople()).map((p) => [p.id, p]));
  const asker = people.get(q.asking_member_id ?? 0);
  const minister = people.get(q.answering_member_id ?? 0);
  const dept = departmentById(q.answering_body_id);
  const heading = q.heading || `Written question ${q.uin}`;
  const rows: [string, React.ReactNode][] = [
    ['Number', `${q.uin}, House of ${q.house}`],
    ['Asked by', asker ? (asker.href ? <Link href={asker.href} prefetch={false} style={blockLink}>{asker.name}</Link> : asker.name) : 'Not recorded'],
    ['Tabled', petitionDate(q.date_tabled)],
    ...(dept ? [['Department', <Link key="d" href={`/questions/department/${dept.slug}`} prefetch={false} style={blockLink}>{dept.name}</Link>] as [string, React.ReactNode]] : q.answering_body ? [['Department', q.answering_body] as [string, React.ReactNode]] : []),
    ...(q.date_holding_answer ? [['Holding answer', petitionDate(q.date_holding_answer)] as [string, React.ReactNode]] : []),
    ...(minister ? [['Answered by', minister.href ? <Link key="m" href={minister.href} prefetch={false} style={blockLink}>{minister.name}</Link> : minister.name] as [string, React.ReactNode]] : []),
    ...(q.date_answered ? [['Answered', petitionDate(q.date_answered)] as [string, React.ReactNode], ['Days taken', String(days(q.date_tabled, q.date_answered))] as [string, React.ReactNode]] : []),
    ...(q.is_withdrawn ? [['State', 'Withdrawn'] as [string, React.ReactNode]] : !q.date_answered ? [['State', 'Awaiting answer'] as [string, React.ReactNode]] : []),
  ];

  return (
    <OpenGovShell pageStamp="Question">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Written questions', path: '/questions' }, { name: heading, path: `/questions/${q.id}` }])} />
      <BackLink fallbackHref="/questions" />
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 'bold', lineHeight: 1.2, color: INK, margin: '0 0 14px', overflowWrap: 'anywhere' }}>{heading}</h1>
      {/* The main action (UX3a, A6): the record's facts. */}
      <dl data-main-action style={{ margin: '0 0 18px', fontSize: '16px', color: INK }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 8px', minHeight: '32px', padding: '4px 0', borderBottom: LINE }}>
            <dt style={{ fontWeight: 'bold', minWidth: '120px' }}>{k}</dt>
            <dd style={{ margin: 0, minWidth: 0 }}>{v}</dd>
          </div>
        ))}
      </dl>

      <h2 style={h2}>Question</h2>
      <p style={para}>{q.question_text}</p>

      {q.answer_html && (
        <>
          <h2 style={h2}>{q.date_answer_corrected ? 'Corrected answer' : 'Answer'}</h2>
          {q.date_answer_corrected && <p style={{ ...para, fontWeight: 'bold' }}>Corrected on {petitionDate(q.date_answer_corrected)}.</p>}
          {(() => {
            // UX5 (T1-6, 11 Nov 2026): on phones the answer's first 1,500 characters, then "Continue reading" (the 2,500px
            // phone length; 6,500 was for the old 10,000px rule). From 640px up the whole answer shows, as before.
            const { first, rest } = splitAnswer(answerHtml(q.answer_html), 1500);
            return (
              <>
                {first && <div className="wq-html" data-og-citations="" dangerouslySetInnerHTML={{ __html: first }} />}
                {rest && (
                  <>
                    <details className="rf-d"><summary>Continue reading</summary></details>
                    <div className="rf-b"><div className="wq-html" data-og-citations="" dangerouslySetInnerHTML={{ __html: rest }} /></div>
                  </>
                )}
              </>
            );
          })()}
          {q.original_answer_html && (
            <details className="pa-fold" style={{ marginTop: '12px' }}>
              <summary>Original answer</summary>
              <div className="wq-html" data-og-citations="" dangerouslySetInnerHTML={{ __html: answerHtml(q.original_answer_html) }} />
            </details>
          )}
        </>
      )}

      {q.attachments && q.attachments.length > 0 && (
        <>
          <h2 style={h2}>Attachments</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {q.attachments.filter((a) => a.url).map((a) => (
              <li key={a.url}><a data-og-row-source="" href={a.url} target="_blank" rel="noopener noreferrer" style={blockLink}>{a.title || 'Attachment'}{a.fileType || a.fileSizeBytes ? ` (${[a.fileType, fileSize(a.fileSizeBytes)].filter(Boolean).join(', ')})` : ''}</a></li>
            ))}
          </ul>
        </>
      )}

      {/* EL1 (owner, 10 and 11 Nov 2026): only sources link outside; the official record is in the page's one Sources fold. Each attachment stays with the answer. */}
      <PageSources sources={[q.url && { label: 'The question and answer on UK Parliament\u2019s Written questions website', href: q.url }]} />
    </OpenGovShell>
  );
}
