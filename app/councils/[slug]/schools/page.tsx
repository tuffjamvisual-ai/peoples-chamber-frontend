// /councils/[slug]/schools: every state-funded school in a council's area with its latest Ofsted inspection, moved off
// the council page's Schools tab, which now shows the summary and links here (owner's approval, 21 Oct 2026).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import CouncilSchoolInspectionsSection from '../../../components/CouncilSchoolInspectionsSection';
import { getSubpageCouncil } from '@/lib/council-subpage';

export const revalidate = 21600;
export function generateStaticParams() { return []; }

const INK = '#14100d';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await getSubpageCouncil(slug);
  if (!d) return { title: 'Schools' };
  return {
    title: `Schools in ${d.c.name}: every Ofsted inspection`,
    description: `Every state funded school in ${d.c.name} with its latest Ofsted inspection, report card grades and any school in a category of concern.`,
    alternates: { canonical: `/councils/${slug}/schools` },
  };
}

export default async function CouncilSchoolsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getSubpageCouncil(slug);
  // Ofsted figures are for education authorities in England; a district's schools are on its county's page.
  if (!d || !d.c.gss_code?.startsWith('E') || d.c.type === 'district') notFound();
  return (
    <OpenGovShell pageStamp="Councils">
      <BackLink fallbackHref={`/councils/${slug}#schools`} label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 8px' }}>Schools in {d.c.short_name || d.c.name}</h1>
      <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 20px' }}>
        <a href={`/councils/${slug}#schools`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{d.c.name}</a>: every state funded school and its latest Ofsted inspection.
      </p>
      <CouncilSchoolInspectionsSection gssCode={d.c.gss_code} isDistrict={false} countyName={d.parent?.name ?? null} countySlug={d.parent?.slug ?? null} />
    </OpenGovShell>
  );
}
