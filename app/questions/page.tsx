import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import OpenGovShell from '../components/OpenGovShell';
import BackLink from '../components/BackLink';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { QUESTION_DEPARTMENTS, departmentBySlug } from '@/lib/question-departments';
import { QUESTION_PAGE_SIZE, questionDepartmentStats, questionPeople, searchQuestions, type QuestionStatus } from '@/lib/question-pages';
import QuestionItems from './QuestionItems';
import NoJsPager from '@/app/components/NoJsPager';

// Written questions this Parliament (owner, backlog item 15c, 6 Nov 2026): search by words, MP or peer, department and date, newest first,
// 25 at a time. A plain form and links, so it all works with JavaScript off. Filter links are nofollow, so crawlers do not read every
// combination; Show more stays followable.
export const dynamic = 'force-dynamic';

type Search = { words?: string; who?: string; member?: string; department?: string; from?: string; to?: string; status?: string; before?: string; at?: string; uin?: string };
const INK = '#14100d';
const ACCENT = '#7a1612';
const n0 = (n: number) => n.toLocaleString('en-GB');
const STATUSES: { key: QuestionStatus; label: string }[] = [
  { key: 'answered', label: 'Answered' }, { key: 'unanswered', label: 'Unanswered' }, { key: 'holding', label: 'Holding answer' }, { key: 'corrected', label: 'Corrected' }, { key: 'withdrawn', label: 'Withdrawn' },
];
const filtered = (s: Search) => Object.values(s).some(Boolean);
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('en-GB');
const isDate = (v?: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? '') ? v : undefined);
const field: CSSProperties = { width: '100%', minHeight: '44px', padding: '8px 10px', fontSize: '16px', color: INK, background: '#fbf4e6', border: `1px solid ${INK}`, borderRadius: 0, boxSizing: 'border-box' };
const labelStyle: CSSProperties = { display: 'block', fontSize: '15px', fontWeight: 'bold', color: INK, marginBottom: '2px' };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const s = await searchParams;
  return {
    title: 'Written questions in Parliament',
    description: 'Search every written question since the July 2024 general election by words, MP or peer, department and date, with the answers as published.',
    alternates: { canonical: '/questions' },
    ...(filtered(s) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const s = await searchParams;
  const words = (s.words ?? '').trim().slice(0, 200);
  const who = (s.who ?? '').trim().slice(0, 80);
  const dept = departmentBySlug(s.department);
  const from = isDate(s.from);
  const to = isDate(s.to);
  const status = STATUSES.find((x) => x.key === s.status)?.key ?? null;
  const uin = /^[A-Za-z0-9]{1,12}$/.test(s.uin ?? '') ? s.uin : undefined;
  const before = s.before ?? null;
  const at = Math.max(0, Number(s.at) || 0);
  const [people, stats] = await Promise.all([questionPeople(), questionDepartmentStats()]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const memberParam = /^\d{1,7}$/.test(s.member ?? '') ? Number(s.member) : null;
  const named = who ? people.filter((p) => fold(p.name).includes(fold(who))).slice(0, 50) : [];
  const memberIds = memberParam ? [memberParam] : who ? named.map((p) => p.id) : undefined;

  const noPerson = !!who && named.length === 0;
  const anyFilter = !!(words || memberIds || dept || from || to || status || uin);
  const { rows, more, total } = noPerson ? { rows: [], more: null, total: 0 } : await searchQuestions({ words: words || undefined, memberIds, bodyId: dept?.id, from, to, status, uin }, before, anyFilter && !before);
  const count = anyFilter ? (s.at ? null : total) : stats.reduce((n, r) => n + r.asked, 0);

  const href = (over: Partial<Record<keyof Search, string | null>>) => {
    const p = new URLSearchParams();
    const pick = { words: words || null, who: who || null, member: memberParam ? String(memberParam) : null, department: dept?.slug ?? null, from: from ?? null, to: to ?? null, status, uin: uin ?? null, ...over };
    for (const [k, v] of Object.entries(pick)) if (v) p.set(k, v);
    const text = p.toString();
    return text ? `/questions?${text}` : '/questions';
  };
  const moreHref = more ? href({ before: more, at: String(at + QUESTION_PAGE_SIZE) }) : null;
  const person = memberParam ? byId.get(memberParam) : null;

  return (
    <OpenGovShell pageStamp="Questions">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Written questions', path: '/questions' }])} />
      <BackLink fallbackHref="/" label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginBottom: '6px', color: INK, textDecoration: 'none', fontSize: '15px' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 8px' }}>{person ? `Written questions: ${person.name}` : 'Written questions'}</h1>
      <p style={{ fontSize: '16px', color: INK, margin: '0 0 16px', maxWidth: '720px', lineHeight: 1.6 }}>
        Questions MPs and peers table for a written answer from a government department, since the July 2024 general election.
      </p>

      <form action="/questions" method="get" role="search" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', margin: '0 0 12px', maxWidth: '720px' }}>
        <div style={{ gridColumn: '1 / -1' }}><label htmlFor="q-words" style={labelStyle}>Words</label><input id="q-words" type="search" name="words" defaultValue={words} style={field} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label htmlFor="q-who" style={labelStyle}>MP or peer</label><input id="q-who" type="search" name="who" defaultValue={who} style={field} /></div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="q-department" style={labelStyle}>Department</label>
          <select id="q-department" name="department" defaultValue={dept?.slug ?? ''} style={field}>
            <option value="">All departments</option>
            {[...QUESTION_DEPARTMENTS].sort((a, b) => a.name.localeCompare(b.name)).map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}
          </select>
        </div>
        <div><label htmlFor="q-from" style={labelStyle}>Tabled from</label><input id="q-from" type="date" name="from" defaultValue={from} style={field} /></div>
        <div><label htmlFor="q-to" style={labelStyle}>Tabled to</label><input id="q-to" type="date" name="to" defaultValue={to} style={field} /></div>
        {status && <input type="hidden" name="status" value={status} />}
        {memberParam && <input type="hidden" name="member" value={memberParam} />}
        <div style={{ gridColumn: '1 / -1' }}><button type="submit" style={{ minHeight: '44px', padding: '8px 20px', fontSize: '15px', fontWeight: 'bold', color: '#fbf4e6', background: INK, border: `1px solid ${INK}`, borderRadius: 0, cursor: 'pointer' }}>Search</button></div>
      </form>

      <ul aria-label="Filters" style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 0 12px', padding: 0 }}>
        {STATUSES.map((c) => {
          const on = status === c.key;
          return (
            <li key={c.key}>
              <a href={href({ status: on ? null : c.key })} rel="nofollow" aria-current={on ? 'true' : undefined} className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '6px 12px', fontSize: '15px', boxSizing: 'border-box', textDecoration: 'none', border: `1px solid ${INK}`, color: on ? '#fbf4e6' : INK, background: on ? ACCENT : 'transparent' }}>{c.label}</a>
            </li>
          );
        })}
      </ul>

      <p role="status" style={{ fontSize: '15px', color: INK, margin: '0 0 8px' }}>
        {count != null ? `${n0(count)} ${count === 1 ? 'question' : 'questions'}, newest first` : `Showing from question ${n0(at + 1)}, newest first`}
        {filtered(s) && <> · <a href="/questions" rel="nofollow" style={{ display: 'inline-block', padding: '12px 0', color: INK, textDecoration: 'underline' }}>Clear filters</a></>}
      </p>
      {who && named.length > 1 && <p style={{ fontSize: '15px', color: INK, margin: '0 0 8px' }}>Matches {named.length === 50 ? 'the first 50 people' : `${named.length} people`} with that name.</p>}

      {rows.length === 0
        ? <p style={{ fontSize: '16px', color: INK, margin: '16px 0' }}>{noPerson ? 'No MP or peer has that name.' : 'No questions match.'}</p>
        : <QuestionItems rows={rows} people={byId} moreHref={moreHref} moreLabel="Show more" />}
      {before && <p style={{ margin: '12px 0 0', fontSize: '15px' }}><a href={href({})} style={{ display: 'inline-block', padding: '12px 0', color: INK, textDecoration: 'underline' }}>Back to the newest</a></p>}

      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: INK, margin: '28px 0 8px' }}>By department</h2>
      <details className="pa-fold">
        <summary>All {QUESTION_DEPARTMENTS.length} departments</summary>
        {/* 25 a screen on phones with JavaScript off (owner, 7 Nov 2026, PF1). */}
        <NoJsPager id="question-departments" count={QUESTION_DEPARTMENTS.length} rows="> li">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {[...QUESTION_DEPARTMENTS].sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
            <li key={d.id}><Link href={`/questions/department/${d.slug}`} prefetch={false} style={{ display: 'flex', alignItems: 'center', minHeight: '44px', fontSize: '16px', color: INK, textDecoration: 'underline' }}>{d.name}</Link></li>
          ))}
        </ul>
        </NoJsPager>
      </details>
    </OpenGovShell>
  );
}
