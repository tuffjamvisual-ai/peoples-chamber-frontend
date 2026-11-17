import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import OrganisationsListing, { FILTERS } from '../OrganisationsListing';
import { listPath } from '@/lib/list-path';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';

// Search results for /organisations?q= (next.config.ts rewrites that address here; A16 exception: search results, name, other
// names or Companies House number over the cached list, no database read per search). An exact Companies House number still
// goes to that organisation. Not indexed; the canonical is /organisations. An empty search goes to the list without it.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: { absolute: 'Organisations: donations, contracts, grants and lobbying' },
  description: PAGE_DESCRIPTIONS['/organisations'],
  alternates: { canonical: '/organisations' },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function OrganisationsSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const page = Math.max(1, parseInt(one(sp.page) || '1', 10) || 1);
  const has = FILTERS.some((x) => x.key === one(sp.has)) ? one(sp.has) : undefined;
  if (!q) permanentRedirect(listPath('/organisations', { has: has ?? null, page: String(page) }));
  return <OrganisationsListing q={q} has={has} page={page} />;
}
