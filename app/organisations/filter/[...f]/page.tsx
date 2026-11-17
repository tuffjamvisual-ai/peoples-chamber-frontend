import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import OrganisationsListing, { FILTERS } from '../../OrganisationsListing';
import { listChoices, listPath } from '@/lib/list-path';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';

// /organisations by phone filter and page (F04 batch 3, pattern P+): each variant static, built on its first visit and rebuilt
// only when organisation_index's tag is refreshed or on a deploy. An unknown filter, key order or a page past the end is 404.
export const revalidate = false;
export function generateStaticParams() { return []; }

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: { absolute: 'Organisations: donations, contracts, grants and lobbying' },
  description: PAGE_DESCRIPTIONS['/organisations'],
  alternates: { canonical: '/organisations' },
};

export default async function OrganisationsFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  const { f } = await params;
  const c = listChoices('/organisations', f);
  if (!c || (c.has && !FILTERS.some((x) => x.key === c.has))) notFound();
  const canon = listPath('/organisations', c);
  if (canon !== `/organisations/filter/${f.join('/')}`) permanentRedirect(canon);
  return <OrganisationsListing has={c.has} page={Number(c.page ?? 1)} />;
}
