// Share image for each organisation page (report 71): the organisation's name and what the page holds, on the folder
// colour with the red stamp (lib/og-card.tsx, Cowork ENTRY 397). 1200 x 630
// PNG, drawn on first request and cached for a day like the page.

import { ogCard } from '@/lib/og-card';
import { getOrganisation, orgSummaryLine } from '@/lib/organisations';

export const alt = 'Organisation records from opengovt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;
export function generateStaticParams() { return []; }

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganisation(slug);
  const name = org ? org.name : 'Organisations';
  const line = org ? orgSummaryLine(org).replace(`${org.name}: `, '') : 'Donations, contracts, grants and lobbying';
  return ogCard({ title: name, line });
}
