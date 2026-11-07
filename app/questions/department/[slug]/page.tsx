import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { namedTitle } from '@/lib/seo-title';
import { departmentById, departmentBySlug } from '@/lib/question-departments';
import { QUESTION_PAGE_SIZE, questionDepartmentStats, questionPeople, searchQuestions } from '@/lib/question-pages';
import QuestionItems from '../../QuestionItems';
import TookOnNote from '../../../components/TookOnNote';

// One answering department (owner, 6 Nov 2026), one page per Parliament id, with links between reorganised departments. Newest first,
// 25 at a time. Counts leave out withdrawn questions. Days to answer run from the date tabled to the date answered.
export const dynamic = 'force-dynamic';

type Search = { before?: string; at?: string };
const INK = '#14100d';
const link = { display: 'inline-flex', alignItems: 'center', minHeight: '44px', color: INK, textDecoration: 'underline', fontSize: '16px' } as const;
const n0 = (n: number) => n.toLocaleString('en-GB');

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }): Promise<Metadata> {
  const d = departmentBySlug((await params).slug);
  if (!d) return { title: 'Written questions', robots: { index: false, follow: true } };
  const { before } = await searchParams;
  return {
    // Never the name alone, which the department's own page has (owner, 7 Nov 2026: titles stay unique).
    title: namedTitle(d.name, (n) => [`Written questions: ${n}`, `${n}: questions`]),
    description: `Written questions answered by ${d.name} this Parliament, newest first, with counts and average days to answer.`.slice(0, 160),
    alternates: { canonical: `/questions/department/${d.slug}` },
    ...(before ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DepartmentQuestions({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const d = departmentBySlug((await params).slug);
  if (!d) notFound();
  const s = await searchParams;
  const before = s.before ?? null;
  const at = Math.max(0, Number(s.at) || 0);
  const [stats, people, { rows, more }] = await Promise.all([questionDepartmentStats(), questionPeople(), searchQuestions({ bodyId: d.id }, before, false)]);
  const st = stats.find((r) => r.answering_body_id === d.id);
  const facts: [string, string][] = [
    ['Asked', n0(st?.asked ?? 0)],
    ['Answered', n0(st?.answered ?? 0)],
    ['Average days to answer', st?.average_days != null ? st.average_days.toFixed(1) : 'None yet'],
  ];
  const related = (ids: number[] | undefined) => (ids ?? []).map(departmentById).filter((x): x is NonNullable<typeof x> => !!x);
  const now = related(d.nowPartOf);
  const was = related(d.previously);
  const moved = related(d.functionsMovedTo);

  return (
    <OpenGovShell pageStamp="Questions">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Written questions', path: '/questions' }, { name: d.name, path: `/questions/department/${d.slug}` }])} />
      <Link href="/questions" prefetch={false} className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: '15px' }}>← All written questions</Link>
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 'bold', lineHeight: 1.2, color: INK, margin: '0 0 12px', overflowWrap: 'anywhere' }}>{d.name}: written questions</h1>
      <dl style={{ margin: '0 0 12px', fontSize: '16px', color: INK }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid rgba(20,16,13,0.25)' }}><dt style={{ fontWeight: 'bold' }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
        ))}
      </dl>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 10px' }}>This Parliament. Withdrawn questions are not counted.</p>
      <TookOnNote department={d} />
      {now.length > 0 && <div style={{ fontSize: '16px', color: INK }}><strong>Now part of</strong><ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{now.map((x) => <li key={x.id}><Link href={`/questions/department/${x.slug}`} prefetch={false} style={link}>{x.name}</Link></li>)}</ul></div>}
      {moved.length > 0 && <div style={{ fontSize: '16px', color: INK }}><strong>Functions moved to</strong><ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{moved.map((x) => <li key={x.id}><Link href={`/questions/department/${x.slug}`} prefetch={false} style={link}>{x.name}</Link></li>)}</ul></div>}
      {d.source && <p style={{ margin: '0 0 8px' }}><a href={d.source.url} target="_blank" rel="noopener noreferrer" style={{ ...link, fontSize: '15px' }}>{d.source.label}</a></p>}
      {was.length > 0 && <div style={{ fontSize: '16px', color: INK }}><strong>Previously</strong><ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{was.map((x) => <li key={x.id}><Link href={`/questions/department/${x.slug}`} prefetch={false} style={link}>{x.name}</Link></li>)}</ul></div>}
      {d.page && <p style={{ margin: '4px 0 12px' }}><Link href={`/departments/${d.page}`} prefetch={false} style={link}>The department&rsquo;s page</Link></p>}
      {rows.length === 0 ? <p style={{ fontSize: '16px', color: INK }}>No questions.</p> : (
        <QuestionItems rows={rows} people={new Map(people.map((p) => [p.id, p]))} showDepartment={false} moreLabel="Show more"
          moreHref={more ? `/questions/department/${d.slug}?before=${more}&at=${at + QUESTION_PAGE_SIZE}` : null} />
      )}
      {before && <p style={{ margin: '12px 0 0', fontSize: '15px' }}><a href={`/questions/department/${d.slug}`} style={{ display: 'inline-block', padding: '12px 0', color: INK, textDecoration: 'underline' }}>Back to the newest</a></p>}
    </OpenGovShell>
  );
}
