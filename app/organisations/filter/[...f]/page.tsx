import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import OrganisationsListing, { FILTERS } from '../../OrganisationsListing';
import { listChoices, listPath } from '@/lib/list-path';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';

// /organisations by phone filter and page (F04 batch 3, pattern P+): each variant static, built on its first visit and rebuilt
// only when organisation_index's tag is refreshed or on a deploy. An unknown filter, key order or a page past the end is 404.
export const revalidate = false;
export function generateStaticParams() { return []; }

// Page 2 onward of the whole list, with no filter, is indexable and canonical to itself (owner approved 23 Nov 2026,
// Cowork ENTRY 536 item 3), so every organisation is a plain link from an indexable page; any filtered variant stays
// noindex, follow and points to /organisations as before.
export async function generateMetadata({ params }: { params: Promise<{ f: string[] }> }): Promise<Metadata> {
  const { f } = await params;
  const c = listChoices('/organisations', f);
  const page = Number(c?.page ?? 1);
  const plainPage = !!c && !c.has && Number.isInteger(page) && page > 1;
  return {
    robots: plainPage ? { index: true, follow: true } : { index: false, follow: true },
    title: { absolute: plainPage ? `Organisations: donations, contracts, grants and lobbying (page ${page})` : 'Organisations: donations, contracts, grants and lobbying' },
    description: PAGE_DESCRIPTIONS['/organisations'],
    alternates: { canonical: plainPage && c ? listPath('/organisations', c) : '/organisations' },
  };
}

export default async function OrganisationsFiltered({ params }: { params: Promise<{ f: string[] }> }) {
  const { f } = await params;
  const c = listChoices('/organisations', f);
  if (!c || (c.has && !FILTERS.some((x) => x.key === c.has))) notFound();
  const canon = listPath('/organisations', c);
  if (canon !== `/organisations/filter/${f.join('/')}`) permanentRedirect(canon);
  return <OrganisationsListing has={c.has} page={Number(c.page ?? 1)} />;
}
