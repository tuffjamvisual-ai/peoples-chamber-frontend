import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import OpenGovShell from '../../../components/OpenGovShell';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import { displayMpName } from '@/lib/mp-name';
import { longDate, pmqsSet } from '@/lib/pmqs';

// Every question an MP has asked at Prime Minister's Questions since July 2024 (owner, 5 Nov 2026), newest first.
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
  return data ? displayMpName((data.display_name || data.name || '').trim()) || null : null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const memberId = Number(id);
  const name = Number.isInteger(memberId) ? await getMpName(memberId) : null;
  if (!name) return { title: "Questions at Prime Minister's Questions", robots: { index: false, follow: true } };
  return {
    title: `${name}: questions at PMQs`,
    description: `Every question ${name} has asked at Prime Minister's Questions since July 2024, newest first.`,
    alternates: { canonical: `/mps/${memberId}/pmqs` },
  };
}

export default async function MpPmqsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  const [name, set] = await Promise.all([getMpName(memberId), pmqsSet()]);
  const questions = set.byMember[memberId] ?? [];
  if (!name || questions.length === 0) notFound();
  return (
    <OpenGovShell pageStamp="PMQs">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'MPs', path: '/mps' }, { name, path: `/mps/${memberId}` }, { name: 'Questions at PMQs', path: `/mps/${memberId}/pmqs` }])} />
      <Link href={`/mps/${memberId}`} className="no-hover-scale" style={{ display: 'inline-block', marginBottom: '14px', color: INK, textDecoration: 'none' }}>← {name}</Link>
      <h1 style={{ fontFamily: 'var(--font-special-elite), monospace', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', margin: '0 0 8px', color: INK }}>Questions at PMQs by {name}</h1>
      <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px', color: INK }}>
        {questions.length} {questions.length === 1 ? 'question' : 'questions'} at <Link href="/pmqs" style={{ color: ACCENT, textDecoration: 'underline' }}>Prime Minister&rsquo;s Questions</Link> since July 2024, newest first, from Hansard.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, color: INK }}>
        {questions.map((q) => (
          <li key={q.extId} style={{ padding: '10px 0', borderTop: '1px solid rgba(20,16,13,0.25)', fontSize: '15px', lineHeight: 1.6 }}>
            <Link href={`/pmqs/${q.date}#q-${q.extId}`} style={{ color: ACCENT, textDecoration: 'underline', fontWeight: 'bold' }}>{longDate(q.date)}</Link>
            <div>{q.text}{q.text.length >= 160 ? '…' : ''}</div>
          </li>
        ))}
      </ul>
    </OpenGovShell>
  );
}
