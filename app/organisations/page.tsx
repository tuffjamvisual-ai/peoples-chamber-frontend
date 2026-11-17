// /organisations: every organisation page (report 71), searchable by name, other spellings or Companies House number.
// F04 batch 3 (A16): static, rebuilt only when organisation_index's tag is refreshed or on a deploy. The phone filters and
// pages are /organisations/filter/...; a search (/organisations?q=) is rewritten to /organisations/search and keeps its address.

import type { Metadata } from 'next';
import { PAGE_DESCRIPTIONS } from '@/lib/page-descriptions';
import OrganisationsListing from './OrganisationsListing';

export const revalidate = false;

export const metadata: Metadata = {
  title: { absolute: 'Organisations: donations, contracts, grants and lobbying' },
  description: PAGE_DESCRIPTIONS['/organisations'],
  alternates: { canonical: '/organisations' },
};

export default function OrganisationsPage() {
  return <OrganisationsListing />;
}
