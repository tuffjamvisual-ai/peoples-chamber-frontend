import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import DebatesListing, { SECTIONS } from '../../DebatesListing';
import { listChoices, listPath, slug } from '@/lib/list-path';

// /debates by section and page (F04 batch 3, pattern P+): each variant static, built on its first visit and rebuilt only when
// the debates tag is refreshed or on a deploy. Unknown or out of order keys and unknown sections are 404.
export const revalidate = false;
export function generateStaticParams() { return []; }

export const metadata: Metadata = { title: 'Commons Debates', alternates: { canonical: '/debates' } };

export default async function DebatesFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  const { f } = await params;
  const c = listChoices('/debates', f);
  const section = c?.section ? SECTIONS.find((s) => slug(s) === c.section) ?? null : null;
  if (!c || (c.section && !section)) notFound();
  const canon = listPath('/debates', c);
  if (canon !== `/debates/filter/${f.join('/')}`) permanentRedirect(canon);
  return <DebatesListing section={section} q="" pageNum={Number(c.page ?? 1)} />;
}
