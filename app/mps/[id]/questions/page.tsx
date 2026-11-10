import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import OpenGovShell from '../../../components/OpenGovShell';
import { displayMpName } from '@/lib/mp-name';
import { questionsPage, questionDepartments } from '@/lib/mp-written-questions';
import QuestionsList from './QuestionsList';

import BackLink from '@/app/components/BackLink';
// Every Commons written question an MP has asked (owner, 3 Nov 2026), newest first, from parliament_written_questions
// (lib/mp-written-questions.ts). Page 1 and the department list are rendered on first request and cached for a day; no
// searchParams, so the page stays cached like /mps/[id]/reports. Other pages and the department filter come from
// /api/mps/[id]/questions. Not in the sitemap.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';

const getMpName = cache(async (memberId: number): Promise<string | null> => {
  const { data, error } = await supabase.from('mps').select('display_name, name').eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`/mps/[id]/questions mps: ${error.message}`);
  if (!data) return null;
  return displayMpName((data.display_name || data.name || '').trim()) || null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const memberId = Number(id);
  const name = Number.isInteger(memberId) ? await getMpName(memberId) : null;
  if (!name) return { title: 'Written questions', robots: { index: false, follow: true } };
  return {
    title: titleWithin(`Written questions by ${name}`),
    description: `Every written question ${name} has asked in the House of Commons, newest first, with links to the official Parliament record.`,
    alternates: { canonical: `/mps/${memberId}/questions` },
  };
}

export default async function MpQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  const name = await getMpName(memberId);
  if (!name) notFound();
  const [first, departments] = await Promise.all([questionsPage(supabase, memberId, 1, null), questionDepartments(supabase, memberId)]);
  if (first.total === 0) notFound();

  return (
    <OpenGovShell pageStamp="Questions">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'MPs', path: '/mps' }, { name, path: `/mps/${memberId}` }, { name: 'Written questions', path: `/mps/${memberId}/questions` }])} />
      <BackLink fallbackHref={`/mps/${memberId}`} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 6px' }}>Written questions by {name}</h1>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 18px', maxWidth: '720px', lineHeight: 1.6 }}>
        Questions {name} has tabled in the House of Commons for a written answer from a government department, from
        Parliament&rsquo;s written questions service. Each title links to the official record, with the answer.
      </p>
      <QuestionsList memberId={memberId} initial={first.rows} total={first.total} departments={departments} />
    </OpenGovShell>
  );
}
