import { titleWithin } from '@/lib/seo-title';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import OpenGovShell from '../../../components/OpenGovShell';
import { getPeer } from '@/lib/lords';
import { peerHasPage } from '@/lib/peers';
import { questionsPage, questionDepartments } from '@/lib/mp-written-questions';
import QuestionsList from '../../../mps/[id]/questions/QuestionsList';

// Every written question a peer has asked in the House of Lords (owner, 3 Nov 2026), newest first: the MP questions
// list with the House set to Lords. Page 1 and the departments are cached for a day; other pages and the filter come
// from /api/lords/[id]/questions. Not in the sitemap.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';
const peer = cache((memberId: number) => getPeer(supabase, memberId));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const memberId = Number(id);
  const p = Number.isInteger(memberId) && memberId > 0 ? await peer(memberId) : null;
  if (!p) return { title: 'Written questions', robots: { index: false, follow: true } };
  return {
    title: titleWithin(`Written questions by ${p.name_display}`),
    description: `Every written question ${p.name_display} has asked in the House of Lords, newest first, with links to the official Parliament record.`,
    alternates: { canonical: `/lords/${memberId}/questions` },
  };
}

export default async function PeerQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  const p = await peer(memberId);
  if (!p || !peerHasPage(p)) notFound();
  const [first, departments] = await Promise.all([questionsPage(supabase, memberId, 1, null, 'Lords'), questionDepartments(supabase, memberId, 'Lords')]);
  if (first.total === 0) notFound();

  return (
    <OpenGovShell pageStamp="Questions">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'House of Lords', path: '/lords' }, { name: p.name_display, path: `/lords/${memberId}` }, { name: 'Written questions', path: `/lords/${memberId}/questions` }])} />
      <Link href={`/lords/${memberId}`} className="no-hover-scale" style={{ display: 'inline-block', marginBottom: '14px', color: INK, textDecoration: 'none', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        ← {p.name_display}
      </Link>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 6px' }}>Written questions by {p.name_display}</h1>
      <p style={{ fontSize: '15px', color: INK, margin: '0 0 18px', maxWidth: '720px', lineHeight: 1.6 }}>
        Questions {p.name_display} has tabled in the House of Lords for a written answer from the government, from
        Parliament&rsquo;s written questions service. Each title links to the official record, with the answer.
      </p>
      <QuestionsList memberId={memberId} initial={first.rows} total={first.total} departments={departments} apiBase="/api/lords" />
    </OpenGovShell>
  );
}
