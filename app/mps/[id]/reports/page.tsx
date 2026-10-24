import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { mpReportItems } from '@/lib/mp-reports';
import JsonLd, { buildBreadcrumbs } from '@/lib/JsonLd';
import OpenGovShell from '../../../components/OpenGovShell';
import { MpReportList } from '../MagazineProfileSections';
import { displayMpName } from '@/lib/mp-name';

// Every report that names an MP (owner's approval, 24 Oct 2026), the full list behind the profile's "Reports mentioning
// this MP", newest first, from the editorial registry at build time (lib/mp-reports.ts). Rendered on first request and
// cached like the profile; no searchParams. Not in the sitemap, and noindex, follow.
export const revalidate = 21600;

export function generateStaticParams() {
  return [];
}

const INK = '#14100d';

const getMpName = cache(async (memberId: number): Promise<string | null> => {
  const { data, error } = await supabase.from('mps').select('display_name, name').eq('member_id', memberId).maybeSingle();
  if (error) throw new Error(`/mps/[id]/reports mps: ${error.message}`);
  if (!data) return null;
  return displayMpName((data.display_name || data.name || '').trim()) || null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const memberId = Number(id);
  const name = Number.isInteger(memberId) ? await getMpName(memberId) : null;
  if (!name) return { title: 'Reports', robots: { index: false, follow: true } };
  return {
    title: `Reports mentioning ${name}`,
    description: `Every Open Govt report that names ${name}, newest first.`,
    alternates: { canonical: `/mps/${memberId}/reports` },
    robots: { index: false, follow: true },
  };
}

export default async function MpReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();
  const name = await getMpName(memberId);
  if (!name) notFound();
  const items = mpReportItems(memberId);
  if (items.length === 0) notFound();

  return (
    <OpenGovShell pageStamp="Reports">
      <JsonLd data={buildBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'MPs', path: '/mps' }, { name, path: `/mps/${memberId}` }, { name: 'Reports', path: `/mps/${memberId}/reports` }])} />
      <Link href={`/mps/${memberId}`} className="no-hover-scale" style={{ display: 'inline-block', marginBottom: '14px', color: INK, textDecoration: 'none', fontSize: '15px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        ← {name}
      </Link>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', color: INK, margin: '0 0 6px' }}>Reports mentioning {name}</h1>
      <p style={{ fontSize: '15px', opacity: 0.75, margin: '0 0 18px' }}>
        {items.length} report{items.length === 1 ? '' : 's'}, newest first.
      </p>
      <MpReportList items={items} />
    </OpenGovShell>
  );
}
