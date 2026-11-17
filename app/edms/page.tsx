import type { Metadata } from 'next';
import EdmsListing from './EdmsListing';

// Early day motions (F04 batch 3, A16): static, rebuilt only when the EDM tag is refreshed or on a deploy. Filters and Show more
// are /edms/filter/...; a search (/edms?q=) is rewritten to /edms/search and keeps its address.
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Early day motions in the Commons',
  description: 'Every early day motion tabled in the House of Commons since the July 2024 general election, with its text, sponsors, signatures and amendments.',
  alternates: { canonical: '/edms' },
};

export default function EdmsPage() {
  return <EdmsListing s={{}} />;
}
