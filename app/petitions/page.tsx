import type { Metadata } from 'next';
import PetitionsListing from './PetitionsListing';

// Petitions (F04 batch 3, A16): static, rebuilt only when the petitions tags are refreshed or on a deploy. Filters, including the
// MP page's constituency link, are /petitions/filter/...; a search (/petitions?q=) is rewritten to /petitions/search.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Petitions that reached 10,000 signatures',
  description: 'Every UK Parliament petition since the July 2024 general election with 10,000 signatures or more: the government response, any debate, and signatures by constituency.',
  alternates: { canonical: '/petitions' },
};

export default function PetitionsPage() {
  return <PetitionsListing s={{}} />;
}
