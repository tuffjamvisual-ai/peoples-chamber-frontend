import type { Metadata } from 'next';
import ConstituenciesListing from './ConstituenciesListing';

// A16 (owner rule 15 Nov 2026; F04 batch 3): static, rebuilt only when its tables' tags are refreshed or on a deploy. A search
// (/constituencies?q=) is rewritten to /constituencies/search (next.config.ts) and keeps its address.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'UK constituencies: MPs and election results',
  description: 'All 650 UK parliamentary constituencies by nation and region: the MP, the 2024 result, byelections, petitions and councils.',
  alternates: { canonical: '/constituencies' },
};

export default function ConstituenciesPage() {
  return <ConstituenciesListing />;
}
