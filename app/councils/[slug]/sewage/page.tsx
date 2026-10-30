// /councils/[slug]/sewage: every storm overflow in a council's area with its spills, moved off the council page's
// Sewage tab, which now shows the summary and the 15 longest-spilling overflows and links here (owner's approval,
// 21 Oct 2026).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OpenGovShell from '../../../components/OpenGovShell';
import BackLink from '../../../components/BackLink';
import CouncilSewageSection from '../../../components/CouncilSewageSection';
import { getSubpageCouncil } from '@/lib/council-subpage';
import { isCoveredCode } from '@/lib/sewage';

export const revalidate = 604800;  // a week (owner, 30 Oct 2026, cache Stage 2a part 4): the council syncs refresh the council routes on a real new release
export function generateStaticParams() { return []; }

const INK = '#14100d';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await getSubpageCouncil(slug);
  if (!d) return { title: 'Sewage spills' };
  return {
    title: `Sewage spills in ${d.c.name}: every storm overflow`,
    description: `Every storm overflow in ${d.c.name}: how many times and for how many hours it spilled sewage, which water company runs it and whether its monitor was working.`,
    alternates: { canonical: `/councils/${slug}/sewage` },
  };
}

export default async function CouncilSewagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getSubpageCouncil(slug);
  if (!d || !isCoveredCode(d.c.gss_code)) notFound();
  return (
    <OpenGovShell pageStamp="Councils">
      <BackLink fallbackHref={`/councils/${slug}#sewage`} label="← Back" className="no-hover-scale" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: INK, textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }} />
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', margin: '0 0 8px' }}>Sewage spills in {d.c.short_name || d.c.name}</h1>
      <p style={{ fontSize: '16px', lineHeight: 1.7, margin: '0 0 20px' }}>
        <a href={`/councils/${slug}#sewage`} style={{ color: INK, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{d.c.name}</a>: every storm overflow in the area and how much it spilled.
      </p>
      <CouncilSewageSection gssCode={d.c.gss_code} isCounty={d.c.type === 'county'} districtCodes={d.children.map((x) => x.gss_code).filter((g): g is string => !!g)} />
    </OpenGovShell>
  );
}
